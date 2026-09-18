import type { CSSProperties } from "react";
import { useTheme } from "./ThemeContext";
import type { StatNumberProps } from "./types";

export function StatNumber({ value, label }: StatNumberProps) {
  const theme = useTheme();
  const valueStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.statLarge.fontSize,
    lineHeight: `${theme.typography.typeScale.statLarge.lineHeight}px`,
    fontWeight: theme.typography.typeScale.statLarge.fontWeight,
    fontFamily: theme.typography.fontFamily.web,
    color: theme.color.textPrimary,
    fontVariantNumeric: "tabular-nums",
    margin: 0,
  };
  const labelStyle: CSSProperties = {
    fontSize: theme.typography.typeScale.caption.fontSize,
    fontWeight: theme.typography.typeScale.caption.fontWeight,
    letterSpacing: theme.typography.typeScale.caption.letterSpacing,
    fontFamily: theme.typography.fontFamily.web,
    color: theme.color.textSecondary,
    textTransform: "uppercase",
    margin: 0,
  };

  return (
    <div>
      <p style={valueStyle}>{value}</p>
      <p style={labelStyle}>{label}</p>
    </div>
  );
}
