# 🏫 Web Quản Lý Lớp 11AT3 (Năm học 2025–2026)

Ứng dụng web quản lý lớp học hiện đại, minh bạch và tinh gọn, được xây dựng theo tiêu chuẩn thiết kế thẩm mỹ cao (Apple / Notion / Linear).

## 🚀 Công Nghệ Sử Dụng
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Design tokens tùy biến + Lucide Icons + Font Be Vietnam Pro
- **Database & ORM**: SQLite + Prisma ORM v5.22
- **Authentication & Security**: NextAuth.js v5 (JWT + bcrypt hashing)
- **Charts & Export**: Recharts + SheetJS (xlsx)
- **Architecture**: Dynamic Database-Driven Permission Engine (`src/lib/permissions.ts`)

## 🔑 Tài Khoản Mẫu Đã Cài Đặt Sẵn
- `admin` / `admin123` (Admin Tổng - Toàn quyền mọi chức năng)
- `gvcn` / `gvcn123` (Giáo viên chủ nhiệm - Toàn quyền 6 module)
- `loptruong` / `lt123` (Lớp trưởng - Toàn quyền Điểm danh, Lịch trực, Sự kiện)
- `totruong2` / `tt2_123` (Tổ trưởng Tổ 2 - Quyền trong phạm vi Tổ 2)

## 📦 Scripts
- `npm run dev`: Chạy môi trường phát triển local (cổng 3000)
- `npm run build`: Build kiểm tra production
- `npm run db:push`: Đồng bộ hóa cấu trúc database Prisma
- `npm run setup`: Tạo mới database và nạp dữ liệu mẫu 46 học sinh
