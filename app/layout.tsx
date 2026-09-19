import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixory — a little book of your life",
  description:
    "Make your memories into a beautiful, personal photobook. A private, browser-based scrapbook editor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
