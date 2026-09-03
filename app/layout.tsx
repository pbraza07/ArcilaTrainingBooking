import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book Training | Arcila Training",
  description: "Reserve private training, small-group sessions, parties, and team practices with Arcila Training.",
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
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
