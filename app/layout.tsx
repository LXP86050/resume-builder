import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume Builder — score and rebuild your resume to 90%+ ATS",
  description: "Paste a job description, score your resume, and rebuild a tailored DOCX to 90%+ ATS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
