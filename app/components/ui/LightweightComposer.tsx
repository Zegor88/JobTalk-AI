import { useState, useRef, useEffect } from "react";
import styles from "./LightweightComposer.module.css";

interface Props {
  draft: string;
  isClosing?: boolean;
  onSend: (text: string) => void;
  onDiscard: () => void;
  onExited?: () => void;
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function LightweightComposer({
  draft,
  isClosing = false,
  onSend,
  onDiscard,
  onExited,
}: Props) {
  const [text, setText] = useState(draft);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exitNotifiedRef = useRef(false);

  useEffect(() => {
    setText(draft);
    requestAnimationFrame(() => resizeTextarea(textareaRef.current));
  }, [draft]);

  useEffect(() => {
    resizeTextarea(textareaRef.current);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isClosing) {
      exitNotifiedRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      notifyExited();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [isClosing]);

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    resizeTextarea(el);
    setText(el.value);
  }

  function notifyExited() {
    if (!isClosing || exitNotifiedRef.current) return;
    exitNotifiedRef.current = true;
    onExited?.();
  }

  function handleAnimationEnd() {
    notifyExited();
  }

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.closing : ""}`}
      role="dialog"
      aria-label="Compose reply"
      onAnimationEnd={handleAnimationEnd}
      onAnimationEndCapture={handleAnimationEnd}
    >
      <div className={styles.header}>
        <span className={styles.headerLabel}>Reply</span>
        <button
          className={styles.discardButton}
          onClick={onDiscard}
          aria-label="Discard draft"
        >
          Discard
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        rows={3}
        autoFocus
        onInput={handleInput}
        onChange={(e) => setText(e.target.value)}
        aria-label="Draft reply"
      />
      <button
        className={styles.sendButton}
        onClick={() => onSend(text)}
        aria-label="Send reply"
      >
        Send
      </button>
    </div>
  );
}
