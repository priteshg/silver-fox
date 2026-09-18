import type { CSSProperties } from "react";
import { useTheme } from "./ThemeContext";
import type { CardProps } from "./types";

export function Card({ children, elevated = false }: CardProps) {
  const theme = useTheme();
  const shadow = elevated ? theme.elevation.raised : theme.elevation.none;
  const style: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    border: `1px solid ${theme.color.border}`,
    boxShadow: elevated
      ? `0 ${shadow.shadowOffsetY}px ${shadow.shadowRadius}px rgba(0, 0, 0, ${shadow.shadowOpacity})`
      : "none",
  };

  return <div style={style}>{children}</div>;
}
