// src/app/api/system/version/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const versionData = {
    latestVersionCode: 11,
    latestVersionName: "1.8.1",
    apkUrl: "https://quanlyhocvien-fs84.vercel.app/downloads/QuanLyHocVien_v1.8.1.apk",
    changelog: [
      "Bổ sung tính năng chọn ngày và lọc báo cáo theo giai đoạn (Từ ngày... Đến ngày...)",
      "Nâng cấp hệ thống tự động kiểm tra và cài đè cập nhật trong app",
      "Tối ưu hóa mã nguồn và bảo mật cao cấp với R8 Optimizer",
      "Sẵn sàng cho kiến trúc Native Offline-First"
    ].map((item) => `• ${item}`).join("\n"),
    forceUpdate: false,
    releaseDate: "2026-09-06",
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=0, must-revalidate",
    },
  });
}
