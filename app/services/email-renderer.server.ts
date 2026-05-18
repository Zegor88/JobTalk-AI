// app/services/email-renderer.server.ts
// Server-side email body normalization.
//
// Two outputs:
//   - bodyHtml: sanitized HTML suitable for dangerouslySetInnerHTML in a scoped container.
//   - body:    clean plain-text preview/fallback (no CSS leakage, linkified, separator runs collapsed).
//
// Why both: HTML keeps the sender's intended layout (Gmail/Apple Mail behavior); plain-text
// powers list snippets, AI prompts, and degraded rendering paths.

import sanitizeHtml from "sanitize-html";

const SAFE_URL_SCHEMES = ["http", "https", "mailto", "tel"];

// Allowlist tuned for typical marketing + transactional email:
//   - block layout (p, div, span, br, hr)
//   - rich text (b, strong, i, em, u, s, code, pre, blockquote, mark, sub, sup)
//   - structure (h1..h6, ul, ol, li)
//   - links + images
//   - tables (marketing emails rely on them; mobile gets a horizontal-scroll wrapper)
// Stripped entirely: script, iframe, style, link, meta, object, embed, form, input, head — including their content.
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "i", "img", "li", "mark", "ol", "p", "pre", "s", "small", "span", "strong",
    "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul",
  ],
  allowedAttributes: {
    a: ["href", "name", "title", "aria-label"],
    img: ["src", "alt", "title", "width", "height"],
    "*": ["align"],
  },
  allowedSchemes: SAFE_URL_SCHEMES,
  allowedSchemesByTag: { img: [...SAFE_URL_SCHEMES, "data", "cid"] },
  // Drop class & style attributes entirely — they fight our dark mode and CSS containment.
  // Marketing emails ship inline styles (font-family, fixed widths, dark backgrounds) that
  // collide with the app's theme. We re-style content from our own scoped CSS instead.
  disallowedTagsMode: "discard",
  // Anchors open in a new tab with safe rel.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
  // Discard tag bodies for these so we never leak <style>/<script> contents as plain text.
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "head"],
};

export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, sanitizeOptions);
}

// Heuristic: text bodies from broken multipart messages (e.g. Vercel notifications)
// often contain large blocks of CSS that survived the plain-text conversion.
// Strip standalone CSS-rule blocks ("selector { ... }") and selector-only lines.
function stripLeakedCss(text: string): string {
  if (!text) return "";

  // Remove @media / @supports / @keyframes blocks (with nested braces).
  let out = text.replace(/@(?:media|supports|keyframes|font-face|import)[^{]*\{[\s\S]*?\}\s*\}/gi, "");
  out = out.replace(/@(?:media|supports|keyframes|font-face|import)[^{]*\{[\s\S]*?\}/gi, "");

  // Remove simple "selector { declarations }" blocks. The selector check requires at least one
  // CSS-ish character (. # : > + ~ * letter) and the body must look like declarations (`prop: val;`).
  out = out.replace(
    /(^|\n)[\s]*[.#:a-zA-Z][^\n{}]{0,200}\{\s*(?:[-a-zA-Z][\w-]*\s*:\s*[^;{}]+;?\s*){1,40}\s*\}/g,
    "$1"
  );

  // Remove orphan `:root { … }` and stray declaration lines like `color: #171717;`
  out = out.replace(/(^|\n)\s*[-a-zA-Z][\w-]*\s*:\s*[^;\n]{1,200};\s*(?=\n|$)/g, "$1");

  return out;
}

// Linkify bare URLs and email addresses inside an already-escaped text node.
function linkify(escaped: string): string {
  const urlRe = /\b((?:https?:\/\/|www\.)[^\s<>()]+[^\s<>().,;:!?])/gi;
  const emailRe = /\b([\w.+-]+@[\w-]+\.[\w.-]+)\b/g;
  return escaped
    .replace(urlRe, (m) => {
      const href = m.startsWith("http") ? m : `https://${m}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>`;
    })
    .replace(emailRe, (m) => `<a href="mailto:${m}">${m}</a>`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

/**
 * Convert plain-text email content into a clean, readable string.
 * - Strips CSS rules that leaked into the text/plain part.
 * - Collapses ASCII separator runs ("*****", "-----", "=====", "_____") to a single ruler.
 * - Collapses 3+ blank lines to 2.
 * - Trims trailing whitespace.
 */
export function cleanPlainText(raw: string): string {
  if (!raw) return "";
  let text = stripLeakedCss(raw);
  text = text.replace(/[ \t]+\n/g, "\n");
  // Treat 5+ repeated non-alphanumeric symbols as a separator → "───".
  text = text.replace(/^[\s]*([*=_\-—–]\s?){5,}[\s]*$/gm, "───");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Build an HTML representation of a plain-text email body — wraps paragraphs, linkifies URLs,
 * and turns separator lines into <hr>.
 */
export function plainTextToHtml(raw: string): string {
  const cleaned = cleanPlainText(raw);
  if (!cleaned) return "";

  // Split on blank lines and on standalone separator markers — separators
  // always become <hr>, regardless of surrounding line breaks.
  const blocks = cleaned
    .split(/\n{2,}|\n?───\n?/g)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  // Re-split the cleaned text so we know which positions held separators.
  const hasSeparator = /───/.test(cleaned);

  if (!hasSeparator) {
    return blocks
      .map((para) => {
        const lines = para.split("\n").map((l) => linkify(escapeHtml(l)));
        return `<p>${lines.join("<br />")}</p>`;
      })
      .join("\n");
  }

  // Reconstruct with separators re-inserted between blocks where present.
  const pattern = /(\n{2,}|\n?───\n?)/g;
  const parts = cleaned.split(pattern);
  return parts
    .map((part) => {
      if (/───/.test(part)) return "<hr />";
      if (/^\s*$/.test(part)) return "";
      const lines = part.trim().split("\n").map((l) => linkify(escapeHtml(l)));
      return `<p>${lines.join("<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

export interface RenderedBody {
  body: string;       // Clean plain-text (for snippets, AI input, fallback rendering).
  bodyHtml: string;   // Sanitized HTML ready for dangerouslySetInnerHTML in a scoped container.
}

/**
 * Normalize an email body from its raw plain and/or HTML representation.
 * Always returns both fields populated when at least one source is non-empty.
 */
export function renderEmailBody({
  plain,
  html,
}: {
  plain?: string;
  html?: string;
}): RenderedBody {
  const safeHtml = html ? sanitizeEmailHtml(html) : "";

  if (safeHtml) {
    // Derive plain text from sanitized HTML so the two stay in sync.
    const stripped = safeHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "");
    const plainFromHtml = cleanPlainText(decodeBasicEntities(stripped));
    return { body: plainFromHtml || cleanPlainText(plain ?? ""), bodyHtml: safeHtml };
  }

  const cleaned = cleanPlainText(plain ?? "");
  return { body: cleaned, bodyHtml: plainTextToHtml(plain ?? "") };
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
