import type { ReactNode } from "react";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  /** Falls back to `label` — set this when the visible label alone wouldn't make sense read aloud. */
  accessibilityLabel?: string;
}

export interface CardProps {
  children: ReactNode;
  elevated?: boolean;
}

export interface StatNumberProps {
  value: string | number;
  label: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface LoadingStateProps {
  label?: string;
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}
