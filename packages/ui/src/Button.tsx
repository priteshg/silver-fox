import type { CSSProperties } from "react";
import { useTheme } from "./ThemeContext";
import type { ButtonProps } from "./types";

export function Button({ label, onPress, variant = "primary", disabled, accessibilityLabel }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const style: CSSProperties = {
    minHeight: theme.touchTarget.comfortable,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    borderRadius: theme.radius.md,
    border: isPrimary ? "none" : `1px solid ${theme.color.border}`,
    backgroundColor: isPrimary ? theme.color.accent : "transparent",
    color: isPrimary ? theme.color.background : theme.color.textPrimary,
    fontSize: theme.typography.typeScale.body.fontSize,
    fontWeight: theme.typography.typeScale.body.fontWeight,
    fontFamily: theme.typography.fontFamily.web,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: `opacity ${theme.motion.duration.fast}ms ease, transform ${theme.motion.duration.fast}ms ease`,
  };

  return (
    <button
      type="button"
      style={style}
      onClick={onPress}
      disabled={disabled}
      aria-label={accessibilityLabel ?? label}
    >
      {label}
    </button>
  );
}
