import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Builder — ATS scorer + Gemini rewriter",
  description: "Paste a job description, score your resume, and rebuild it to 90%+ ATS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
