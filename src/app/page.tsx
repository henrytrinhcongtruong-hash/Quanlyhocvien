// src/app/page.tsx — Trang chủ công khai (học sinh xem)
import { Suspense } from "react";
import { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PublicHomePage from "@/components/public/PublicHomePage";

export const metadata: Metadata = {
  title: "Cổng Thông Tin Lớp Học — THPT",
  description: "Xem danh sách lớp, tình trạng đóng quỹ, lịch trực nhật và sự kiện lớp học.",
};

export default function HomePage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 300 }} />}>
        <PublicHomePage />
      </Suspense>
    </PublicLayout>
  );
}
