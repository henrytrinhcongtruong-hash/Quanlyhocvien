// src/app/api/system/version/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const versionData = {
    latestVersionCode: 13,
    latestVersionName: "1.8.2",
    apkUrl: "https://quanlyhocvien-fs84.vercel.app/downloads/QuanLyHocVien_v1.8.2.apk",
    changelog: [
      "Ghi nhận đầy đủ lịch sử hoạt động cho toàn bộ cán sự (Tổ trưởng, Lớp phó, Thủ quỹ, GVCN)",
      "Cố định danh sách 30 học sinh/trang và tối ưu phân trang mượt mà",
      "Đồng bộ toàn diện dữ liệu thời gian thực và tối ưu hiệu năng R8",
    ].map((item) => `• ${item}`).join("\n"),
    forceUpdate: false,
    releaseDate: "2026-09-28",
  };

  return NextResponse.json(versionData, {
    headers: {
      "Cache-Control": "public, s-maxage=0, must-revalidate",
    },
  });
}
