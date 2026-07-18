import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grow My Plant 🌱",
  description:
    "Comment 🌱 on the Reel and your Instagram username grows as a leaf on a live community plant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
