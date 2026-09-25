import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus — Eisenhower board",
  description: "A private canvas for deciding what deserves your time.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
