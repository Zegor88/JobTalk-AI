// app/components/ui/BottomNav.tsx
// RULES: Pure component — no local state, no useLiveQuery.
// Styled via index.css tokens only. No hardcoded colors.

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {/* Placeholder — Story 1.3 implements full tabs */}
      <button type="button" aria-label="Inbox" style={{ minHeight: "var(--touch-target)", minWidth: "var(--touch-target)" }}>
        ✉️
      </button>
    </nav>
  );
}
