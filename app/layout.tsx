import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bound",
  description: "Referrals ranked by whether care actually happened.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
