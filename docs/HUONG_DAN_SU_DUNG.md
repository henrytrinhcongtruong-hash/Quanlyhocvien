# 📖 Hướng Dẫn Sử Dụng & Triển Khai Web App Quản Lý Lớp 11AT3

## 1. Hướng Dẫn Khởi Chạy Nhanh (Local Quickstart)

1. Mở Terminal / PowerShell tại thư mục:
   ```bash
   cd "c:\Henry Web + App\scripts\class-11at3-web"
   ```
2. Cài đặt dependencies (nếu chưa có):
   ```bash
   npm install
   ```
3. Khởi tạo Database SQLite & Nạp dữ liệu mẫu (46 học sinh, 4 tổ):
   ```bash
   npm run setup
   ```
4. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt truy cập:
   - **Trang chủ học sinh (Public)**: `http://localhost:3000`
   - **Trang quản trị (Admin)**: `http://localhost:3000/admin` (Đăng nhập: `admin` / `admin123`)

---

## 2. Các Phân Hệ Chính

### 📱 Phân Hệ Công Khai (Dành cho Học Sinh & Phụ Huynh)
1. **Danh sách lớp (`/`)**: Xem 46 học sinh phân theo từng tổ, tìm kiếm họ tên nhanh chóng.
2. **Quỹ lớp (`/quy-lop`)**: Xem tổng thu, tổng chi, số dư minh bạch và tra cứu cá nhân xem mình đã hoàn thành đóng quỹ chưa.
3. **Lịch trực nhật (`/lich-truc`)**: Lịch trực phòng học Thứ 2 - Thứ 6 theo từng tuần.
4. **Sự kiện & Hoạt động (`/su-kien`)**: Theo dõi các phong trào, hội thi, hạn chót và thành viên phụ trách.
5. **Điểm danh cá nhân (`/diem-danh-cua-toi`)**: Học sinh tự tra cứu lịch sử chuyên cần.

### 🛡️ Phân Hệ Quản Trị (Dành cho GVCN, Ban Cán Sự & Tổ Trưởng)
1. **Tổng quan (`/admin`)**: Dashboard các chỉ số chính (sĩ số, số dư quỹ, lượt vi phạm nề nếp).
2. **Học sinh (`/admin/hoc-sinh`)**: Thêm, sửa, xóa, phân tổ, import/export Excel.
3. **Điểm danh (`/admin/diem-danh`)**: Chọn ngày, bật/tắt nhanh trạng thái Vắng có phép, Vắng không phép, Đi trễ.
4. **Quỹ lớp (`/admin/quy`)**: Bật/tắt trạng thái đóng tiền, quản lý danh sách chi tiêu nhiều hạng mục.
5. **Lịch trực (`/admin/lich-truc`)**: Xếp lịch tuần, hỗ trợ tính năng tự động phân công theo tổ.
6. **Sự kiện (`/admin/su-kien`)**: Tạo sự kiện, giao việc Lead / Support, theo dõi hạn chót.
7. **Báo cáo (`/admin/bao-cao`)**: Biểu đồ phân bổ chi tiêu, thống kê chuyên cần, xuất báo cáo tổng hợp.
8. **Người dùng (`/admin/nguoi-dung`)**: Quản lý tài khoản, cấp quyền theo ma trận module và phạm vi tổ.
