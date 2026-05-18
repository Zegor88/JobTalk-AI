// app/components/ui/ComposeModal.tsx
import { useEffect, useRef, useState } from "react";
import { Icon } from "~/components/ui/Icon";
import styles from "./ComposeModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ComposeModal({ isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      setIsClosing(false);
      dialog.showModal();
      setTimeout(() => toRef.current?.focus(), 50);
    }
  }, [isOpen]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      dialogRef.current?.close();
      onClose();
    }, 250);
  }

  // Native dialog fires 'cancel' on Escape — hook into it for animated close
  function handleCancel(e: React.SyntheticEvent) {
    e.preventDefault();
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.overlay} ${isClosing ? styles.closing : ""}`}
      aria-label="Compose new email"
      onCancel={handleCancel}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>New Message</h2>
        <button
          type="button"
          className={styles.discardBtn}
          onClick={handleClose}
          aria-label="Discard"
        >
          <Icon name="x-mark" size={20} />
        </button>
      </header>

      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="compose-to">To</label>
          <input
            id="compose-to"
            ref={toRef}
            type="email"
            className={styles.input}
            placeholder="recipient@example.com"
            autoComplete="email"
          />
        </div>
        <div className={styles.fieldRow}>
          <label className={styles.label} htmlFor="compose-subject">Subject</label>
          <input
            id="compose-subject"
            type="text"
            className={styles.input}
            placeholder="Subject"
          />
        </div>
        <textarea
          className={styles.body}
          placeholder="Write your message…"
          aria-label="Message body"
        />
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.sendBtn}
          onClick={handleClose}
          aria-label="Send email"
        >
          Send
        </button>
      </footer>
    </dialog>
  );
}
