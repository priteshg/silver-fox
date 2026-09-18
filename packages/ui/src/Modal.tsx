import { useEffect, type CSSProperties } from "react";
import { useTheme } from "./ThemeContext";
import type { ModalProps } from "./types";
import { useReducedMotion } from "./useReducedMotion";

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!visible) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const backdropStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    zIndex: 1000,
    transition: reducedMotion ? "none" : `opacity ${theme.motion.duration.base}ms ease`,
  };
  const sheetStyle: CSSProperties = {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.color.border}`,
    padding: theme.spacing.lg,
  };
  const titleStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.h3.fontSize,
    fontWeight: theme.typography.typeScale.h3.fontWeight,
    color: theme.color.textPrimary,
    marginTop: 0,
    marginBottom: theme.spacing.md,
  };

  return (
    <div style={backdropStyle} onClick={onClose} role="presentation">
      <div
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title ? <p style={titleStyle}>{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
