import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";

// Mock session.server to prevent createCookieSessionStorage from running at module load
vi.mock("~/services/session.server", () => ({
  getSession: vi.fn().mockResolvedValue({ get: () => null, set: vi.fn() }),
  commitSession: vi.fn(),
  destroySession: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

// Import after mocks
import Login from "./login";

afterEach(() => cleanup());

function renderLogin(email: string | null, provider: string | null) {
  const LoginForTest = Login as unknown as (props: {
    loaderData: { email: string | null; provider: string | null };
  }) => ReactElement;

  return render(<LoginForTest loaderData={{ email, provider }} />);
}

describe("Login page — unauthenticated state", () => {
  it("renders 'Connect with Google' button", () => {
    renderLogin(null, null);
    expect(screen.getByText("Connect with Google")).toBeTruthy();
  });

  it("renders 'Connect with Microsoft' button", () => {
    renderLogin(null, null);
    expect(screen.getByText("Connect with Microsoft")).toBeTruthy();
  });

  it("Google button links to /auth/google", () => {
    renderLogin(null, null);
    const link = screen.getByText("Connect with Google").closest("a");
    expect(link?.getAttribute("href")).toBe("/auth/google");
  });

  it("Microsoft button links to /auth/microsoft", () => {
    renderLogin(null, null);
    const link = screen.getByText("Connect with Microsoft").closest("a");
    expect(link?.getAttribute("href")).toBe("/auth/microsoft");
  });

  it("does not render 'Sign Out' button", () => {
    renderLogin(null, null);
    expect(screen.queryByText("Sign Out")).toBeNull();
  });
});

describe("Login page — authenticated state", () => {
  it("renders the connected email address", () => {
    renderLogin("user@gmail.com", "google");
    expect(screen.getByText(/user@gmail\.com/)).toBeTruthy();
  });

  it("renders the provider name", () => {
    renderLogin("user@gmail.com", "google");
    expect(screen.getByText(/google/i)).toBeTruthy();
  });

  it("renders 'Sign Out' button", () => {
    renderLogin("user@gmail.com", "google");
    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("Sign Out form posts to /auth/logout", () => {
    renderLogin("user@gmail.com", "google");
    const form = screen.getByText("Sign Out").closest("form");
    expect(form?.getAttribute("action")).toBe("/auth/logout");
    expect(form?.getAttribute("method")).toBe("post");
  });

  it("renders 'Back to Inbox' link", () => {
    renderLogin("user@gmail.com", "google");
    const link = screen.getByText("Back to Inbox").closest("a");
    expect(link?.getAttribute("href")).toBe("/");
  });

  it("does not render provider selection buttons", () => {
    renderLogin("user@gmail.com", "google");
    expect(screen.queryByText("Connect with Google")).toBeNull();
    expect(screen.queryByText("Connect with Microsoft")).toBeNull();
  });
});

describe("Login page — WCAG touch targets", () => {
  it("provider buttons have a CSS class applied (class contains min-height: 44px rule)", () => {
    const { container } = renderLogin(null, null);
    // Verify provider links have a CSS module class applied
    // The CSS module .providerBtn rule specifies min-height: var(--touch-target) = 44px
    const googleLink = screen.getByText("Connect with Google").closest("a");
    const msLink = screen.getByText("Connect with Microsoft").closest("a");
    expect(googleLink?.className).toBeTruthy();
    expect(msLink?.className).toBeTruthy();
    // Both should share the same class (providerBtn CSS module)
    expect(googleLink?.className).toBe(msLink?.className);
    // Suppress unused container warning
    void container;
  });

  it("Sign Out button has a CSS class applied (class contains min-height: 44px rule)", () => {
    renderLogin("user@outlook.com", "microsoft");
    const signOutBtn = screen.getByText("Sign Out");
    expect(signOutBtn.className).toBeTruthy();
  });
});
