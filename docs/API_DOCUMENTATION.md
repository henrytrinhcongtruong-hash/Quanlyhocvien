# 📘 Tài Liệu Kỹ Thuật & API Specification — Lớp 11AT3 Web App

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

- **Backend / Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database / ORM**: SQLite + Prisma Client v5.22
- **Authentication**: NextAuth.js v5 (Credentials Provider + JWT Strategy, bcrypt hash)
- **Permission System**: Dynamic Data-Driven Permission Engine (`lib/permissions.ts`), liên kết bảng `UserPermission`, hỗ trợ phạm vi toàn lớp (`toan_lop`) hoặc theo tổ (`theo_to`).

---

## 2. Danh Sách REST API Endpoints (Dùng chung cho Web & Mobile App Giai Đoạn 2)

Tất cả các endpoint trả về định dạng `application/json`.
Khi request từ Mobile App hoặc Client bên ngoài, cần đính kèm session cookie hoặc bearer token.

### 👤 2.1. Học Sinh (`/api/students`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students?to={1-4}&search={query}&page={n}` | Không (Public) | Danh sách học sinh phân trang / lọc theo tổ |
| `POST` | `/api/students` | `hoc_sinh: toan_quyen` | Thêm mới học sinh |
| `GET` | `/api/students/:id` | Không (Public) | Chi tiết 1 học sinh |
| `PUT` | `/api/students/:id` | `hoc_sinh: toan_quyen` | Cập nhật thông tin học sinh |
| `DELETE`| `/api/students/:id` | `hoc_sinh: toan_quyen` | Xóa học sinh |
| `GET` | `/api/students/export` | `hoc_sinh: chi_xem` | Xuất danh sách học sinh ra file `.xlsx` |
| `POST` | `/api/students/import` | `hoc_sinh: toan_quyen` | Import danh sách học sinh từ file Excel |

### 📅 2.2. Điểm Danh (`/api/attendance`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance?ngay={YYYY-MM-DD}&toId={1-4}` | `diem_danh: chi_xem` | Danh sách vắng/trễ theo ngày & scope tổ |
| `POST` | `/api/attendance` | `diem_danh: toan_quyen` | Ghi nhận/bật tắt vắng có phép, không phép, đi trễ |
| `DELETE`| `/api/attendance?id={id}` | `diem_danh: toan_quyen` | Xóa bản ghi điểm danh |
| `GET` | `/api/attendance/export` | `diem_danh: chi_xem` | Xuất lịch sử điểm danh ra file Excel |
| `POST` | `/api/attendance/import` | `diem_danh: toan_quyen` | Import điểm danh từ sheet "Math" |

### 💰 2.3. Quỹ Lớp & Chi Tiêu (`/api/fees`, `/api/expenses`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/fees/summary` | Không (Public) | Thống kê tổng thu, tổng chi, số dư, tỷ lệ đóng |
| `GET` | `/api/fees?studentId={id}` | Không (Public) | Tra cứu tình trạng đóng tiền cá nhân |
| `GET` | `/api/fees?kyThu={HK1/HK2}` | `quy: chi_xem` | Danh sách thu tiền toàn lớp |
| `POST` | `/api/fees` | `quy: toan_quyen` | Cập nhật trạng thái đóng tiền / chuyển khoản |
| `GET` | `/api/expenses` | `quy: chi_xem` | Danh sách tất cả khoản chi tiêu |
| `POST` | `/api/expenses` | `quy: toan_quyen` | Thêm khoản chi mới |
| `PUT` | `/api/expenses/:id` | `quy: toan_quyen` | Cập nhật khoản chi |
| `DELETE`| `/api/expenses/:id` | `quy: toan_quyen` | Xóa khoản chi |
| `GET` | `/api/fees/export` | `quy: chi_xem` | Xuất báo cáo thu chi 2 sheet (Receipts, Expenses) |
| `POST` | `/api/fees/import` | `quy: toan_quyen` | Import thu chi từ file Excel |

### 🧹 2.4. Lịch Trực Nhật (`/api/duty`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/duty?week={YYYY-Www/current}` | Không (Public) | Lấy lịch trực của tuần (Thứ 2 - Thứ 6) |
| `POST` | `/api/duty` | `lich_truc: toan_quyen` | Phân công trực nhật |
| `DELETE`| `/api/duty?id={id}` | `lich_truc: toan_quyen` | Xóa phân công |

### 🌟 2.5. Sự Kiện & Công Việc (`/api/events`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events?public=1` | Không (Public) | Xem danh sách sự kiện lớp |
| `GET` | `/api/events` | `su_kien: chi_xem` | Danh sách sự kiện quản trị (kèm scope) |
| `POST` | `/api/events` | `su_kien: toan_quyen` | Tạo sự kiện mới và phân công Lead/Support |

### 🛡️ 2.6. Quản Trị Người Dùng & Phân Quyền (`/api/users`)
| Method | Endpoint | Yêu cầu quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | `isSuperAdmin = true` | Danh sách tài khoản và quyền hạn |
| `POST` | `/api/users` | `isSuperAdmin = true` | Tạo tài khoản mới kèm ma trận quyền |
| `PUT` | `/api/users/:id` | `isSuperAdmin = true` | Đổi tên, mật khẩu, trạng thái hoạt động |
| `DELETE`| `/api/users/:id` | `isSuperAdmin = true` | Xóa tài khoản (chặn tự xóa chính mình) |
| `GET` | `/api/users/:id/perms` | `isSuperAdmin = true` | Lấy ma trận quyền của user |
| `PUT` | `/api/users/:id/perms` | `isSuperAdmin = true` | Cập nhật ma trận quyền chi tiết |

---

## 3. Danh Sách Tài Khoản Mặc Định

| Tên đăng nhập | Mật khẩu | Chức danh | Vai trò & Quyền hạn |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | Admin Tổng | SuperAdmin — Toàn quyền mọi module, quản lý tài khoản |
| **`gvcn`** | `gvcn123` | Giáo viên chủ nhiệm | Toàn quyền tất cả 6 module trong toàn bộ lớp |
| **`loptruong`** | `lt123` | Lớp trưởng | Toàn quyền Điểm danh, Lịch trực, Sự kiện. Chỉ xem Học sinh, Báo cáo. Không xem Quỹ. |
| **`totruong2`** | `tt2_123` | Tổ trưởng Tổ 2 | Toàn quyền Điểm danh & Sự kiện phạm vi **Tổ 2**. Chỉ xem Báo cáo Tổ 2. |
