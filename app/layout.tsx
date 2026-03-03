import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "상담 기록 관리",
  description: "학원 대면 상담 기록 정리 + 통계 + 분석",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <header className="top-nav">
          <div className="top-nav-inner">
            <Link href="/" className="brand">상담 시스템</Link>
            <nav className="top-nav-links">
              <Link href="/intake">입력</Link>
              <Link href="/analysis">분석</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
