// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lớp 11AT3 — Năm học 2025-2026",
    template: "%s | Lớp 11AT3",
  },
  description:
    "Trang thông tin lớp học 11AT3 — Xem danh sách lớp, tình trạng đóng quỹ, lịch trực nhật và sự kiện.",
  keywords: ["lớp học", "11AT3", "điểm danh", "quỹ lớp", "lịch trực nhật"],
  openGraph: {
    title: "Lớp 11AT3 — Năm học 2025-2026",
    description: "Trang thông tin và quản lý lớp 11AT3",
    type: "website",
    locale: "vi_VN",
  },
};

import SessionProviderWrapper from "@/components/layout/SessionProviderWrapper";
import { auth } from "@/lib/auth";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a6fd4",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="vi">
      <body>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
