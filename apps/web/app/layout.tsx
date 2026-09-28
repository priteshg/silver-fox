import { theme } from "@silver-fox/config";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrimeForm",
  description: "PrimeForm — training that adapts as you do.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: theme.color.background }}>{children}</body>
    </html>
  );
}
