// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Quanlyhocvien — Hệ Thống Quản Lý Học Viên",
    template: "%s | Quanlyhocvien",
  },
  description:
    "Hệ thống quản lý học viên, lớp học, điểm danh, thời khóa biểu, lịch thi và quỹ lớp chuyên nghiệp.",
  keywords: ["Quanlyhocvien", "quản lý học viên", "lớp học", "điểm danh", "thời khóa biểu", "quỹ lớp", "lịch thi"],
  openGraph: {
    title: "Quanlyhocvien — Hệ Thống Quản Lý Học Viên",
    description: "Hệ thống quản lý học viên, lớp học, điểm danh, thời khóa biểu, lịch thi và quỹ lớp chuyên nghiệp.",
    type: "website",
    locale: "vi_VN",
  },
};

import { Be_Vietnam_Pro } from "next/font/google";
import SessionProviderWrapper from "@/components/layout/SessionProviderWrapper";
import { auth } from "@/lib/auth";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0891b2",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="vi" className={beVietnamPro.className}>
      <body style={{ minHeight: "100dvh" }}>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
