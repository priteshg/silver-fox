import { theme } from "@silver-fox/config";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silver Fox",
  description: "Premium fitness and nutrition tracking.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: theme.color.background }}>{children}</body>
    </html>
  );
}
