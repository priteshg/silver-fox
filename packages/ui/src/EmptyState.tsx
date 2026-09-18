import type { CSSProperties } from "react";
import { Button } from "./Button";
import { useTheme } from "./ThemeContext";
import type { EmptyStateProps } from "./types";

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: `${theme.spacing.xl}px ${theme.spacing.lg}px`,
    gap: theme.spacing.xs,
  };
  const titleStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.h3.fontSize,
    fontWeight: theme.typography.typeScale.h3.fontWeight,
    color: theme.color.textPrimary,
    margin: 0,
  };
  const descriptionStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.body.fontSize,
    color: theme.color.textSecondary,
    margin: 0,
  };

  return (
    <div style={containerStyle} role="status">
      <p style={titleStyle}>{title}</p>
      {description ? <p style={descriptionStyle}>{description}</p> : null}
      {actionLabel && onAction ? (
        <div style={{ marginTop: theme.spacing.md }}>
          <Button label={actionLabel} onPress={onAction} />
        </div>
      ) : null}
    </div>
  );
}
