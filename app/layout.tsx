import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setlist Surgery — Keep the night alive",
  description: "Rescue your band's running order when plans change. Check crew, instruments, rehearsal and timing, then approve a playable set.",
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
