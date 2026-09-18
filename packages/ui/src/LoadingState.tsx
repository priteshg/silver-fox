import type { CSSProperties } from "react";
import { useTheme } from "./ThemeContext";
import type { LoadingStateProps } from "./types";

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  const theme = useTheme();
  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
  };
  const labelStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.bodySmall.fontSize,
    color: theme.color.textSecondary,
    margin: 0,
  };

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      <p style={labelStyle}>{label}</p>
    </div>
  );
}
