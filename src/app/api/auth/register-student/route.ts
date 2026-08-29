// src/app/api/auth/register-student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/auditLogger";

function normalizeName(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u00A0\s]+/g, " ")
    .trim();
}

// GET: Kiểm tra trạng thái học sinh (đã có tài khoản hay chưa, có trong danh sách lớp không)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop")?.trim().toUpperCase() || "";
    const hoTen = searchParams.get("hoTen")?.trim() || "";

    if (!lop) {
      return NextResponse.json({ error: "Thiếu mã lớp" }, { status: 400 });
    }

    // Lấy danh sách học sinh của lớp
    const students = await prisma.student.findMany({
      where: { lop: { equals: lop, mode: "insensitive" } },
      select: { id: true, hoTen: true, to: true, lop: true },
      orderBy: { hoTen: "asc" },
    });

    // Lấy danh sách user hiện tại của lớp
    const users = await prisma.user.findMany({
      where: { assignedLop: { equals: lop, mode: "insensitive" } },
      select: { id: true, username: true, hoTen: true, roleLabel: true },
    });

    const registeredMap = new Map<string, string>();
    for (const u of users) {
      registeredMap.set(normalizeName(u.hoTen), u.username);
    }

    if (!hoTen) {
      // Trả về danh sách tóm tắt (học sinh nào đã đăng ký / chưa đăng ký)
      const studentStatuses = students.map((s) => ({
        id: s.id,
        hoTen: s.hoTen,
        to: s.to,
        lop: s.lop,
        isRegistered: registeredMap.has(normalizeName(s.hoTen)),
        username: registeredMap.get(normalizeName(s.hoTen)) || null,
      }));
      return NextResponse.json({ data: studentStatuses });
    }

    // Kiểm tra riêng 1 học sinh cụ thể
    const cleanNormName = normalizeName(hoTen);
    const matchedStudent = students.find((s) => normalizeName(s.hoTen) === cleanNormName);

    if (!matchedStudent) {
      return NextResponse.json({
        existsInClass: false,
        isRegistered: false,
        message: `Họ tên "${hoTen}" chưa có trong danh sách Lớp ${lop}.`,
      });
    }

    const registeredUsername = registeredMap.get(normalizeName(matchedStudent.hoTen));
    const isRegistered = !!registeredUsername;

    return NextResponse.json({
      existsInClass: true,
      matchedStudentName: matchedStudent.hoTen,
      isRegistered,
      username: registeredUsername || null,
      message: isRegistered
        ? `Học sinh "${matchedStudent.hoTen}" đã được đăng ký tài khoản trước đó (${registeredUsername}).`
        : `Họ tên hợp lệ và sẵn sàng đăng ký tài khoản.`,
    });
  } catch (error) {
    console.error("GET register-student status error:", error);
    return NextResponse.json({ error: "Lỗi kiểm tra trạng thái học sinh" }, { status: 500 });
  }
}

// POST: Đăng ký tài khoản học sinh (Khóa chặn 100% clone accounts)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hoTen, lop, username, password, confirmPassword } = body;

    // 1. Validate required fields
    if (!hoTen || typeof hoTen !== "string" || !hoTen.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập họ và tên của học sinh." },
        { status: 400 }
      );
    }
    if (!lop || typeof lop !== "string" || !lop.trim()) {
      return NextResponse.json(
        { error: "Vui lòng chọn hoặc nhập mã lớp." },
        { status: 400 }
      );
    }
    if (!username || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập mong muốn." },
        { status: 400 }
      );
    }
    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập mật khẩu." },
        { status: 400 }
      );
    }
    if (password.length < 4) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 4 ký tự." },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Mật khẩu và xác nhận mật khẩu không khớp nhau." },
        { status: 400 }
      );
    }

    const cleanHoTen = hoTen.normalize("NFC").replace(/[\u00A0\s]+/g, " ").trim();
    const cleanLop = lop.trim().toUpperCase();
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, "");

    // Validate username format (alphanumeric + underscore, 3-30 chars)
    if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            "Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (3 - 30 ký tự, viết liền không dấu).",
        },
        { status: 400 }
      );
    }

    // 2. Check if username already exists in User table
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existingUserByUsername) {
      return NextResponse.json(
        {
          error: `Tên đăng nhập "${cleanUsername}" đã có người sử dụng. Vui lòng chọn tên đăng nhập khác.`,
        },
        { status: 400 }
      );
    }

    // 3. Verify student exists in Student roster for this class
    const studentsInClass = await prisma.student.findMany({
      where: { lop: { equals: cleanLop, mode: "insensitive" } },
      select: { id: true, hoTen: true, lop: true, to: true },
    });

    if (studentsInClass.length === 0) {
      return NextResponse.json(
        {
          error: `Lớp "${cleanLop}" hiện chưa có dữ liệu học sinh trong hệ thống. Vui lòng kiểm tra lại mã lớp.`,
        },
        { status: 400 }
      );
    }

    const normInputName = normalizeName(cleanHoTen);
    const matchedStudent = studentsInClass.find(
      (s) => normalizeName(s.hoTen) === normInputName
    );

    if (!matchedStudent) {
      return NextResponse.json(
        {
          error: `Không tìm thấy học sinh "${cleanHoTen}" trong danh sách Lớp ${cleanLop}. Vui lòng nhập chính xác họ và tên như trên danh sách lớp.`,
        },
        { status: 400 }
      );
    }

    // 4. KIỂM TRA NGHIÊM NGẶT: Mỗi học sinh chỉ được đăng ký DUY NHẤT 1 tài khoản
    // Kiểm tra toàn bộ User trong lớp này lẫn hệ thống
    const existingUsersInClass = await prisma.user.findMany({
      where: {
        OR: [
          { assignedLop: { equals: cleanLop, mode: "insensitive" } },
          { assignedLop: { equals: matchedStudent.lop, mode: "insensitive" } },
          { assignedLop: cleanLop },
          { assignedLop: matchedStudent.lop },
        ],
      },
      select: { id: true, username: true, hoTen: true, roleLabel: true, assignedLop: true },
    });

    const normMatchedStudentName = normalizeName(matchedStudent.hoTen);
    const existingUserForStudent = existingUsersInClass.find(
      (u) => normalizeName(u.hoTen) === normMatchedStudentName || normalizeName(u.hoTen) === normInputName
    );

    if (existingUserForStudent) {
      // Ghi log cảnh báo hành vi cố tạo acc clone
      logActivity({
        userName: cleanHoTen,
        userRole: "Học viên (Khách)",
        userLop: cleanLop,
        action: "REGISTER",
        target: "User",
        details: `Cảnh báo: Học sinh "${matchedStudent.hoTen}" (Lớp ${cleanLop}) đã có tài khoản "${existingUserForStudent.username}" nhưng đang cố đăng ký thêm tài khoản clone "${cleanUsername}". Thao tác đã bị hệ thống chặn thành công.`,
        req,
        status: "WARNING",
      });

      return NextResponse.json(
        {
          error: `Mỗi học sinh chỉ được đăng ký tài khoản 1 lần duy nhất để tránh tài khoản ảo (clone)! Học sinh "${matchedStudent.hoTen}" (Lớp ${cleanLop}) đã có tài khoản trên hệ thống (Tên đăng nhập: "${existingUserForStudent.username}"). Nếu quên mật khẩu, bạn vui lòng liên hệ Admin hoặc GVCN để được hỗ trợ cấp lại mật khẩu.`,
        },
        { status: 400 }
      );
    }

    // 5. Tạo tài khoản học viên mới
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        plainPassword: password, // Lưu để Admin có thể xem và hỗ trợ khi học sinh quên mật khẩu
        hoTen: matchedStudent.hoTen,
        roleLabel: "Học viên",
        assignedLop: matchedStudent.lop,
        isSuperAdmin: false,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        hoTen: true,
        assignedLop: true,
        roleLabel: true,
      },
    });

    // 6. Ghi log hoạt động đăng ký tài khoản học viên thành công
    logActivity({
      userId: newUser.id,
      userName: newUser.hoTen,
      userRole: "Học viên",
      userLop: newUser.assignedLop,
      action: "REGISTER",
      target: "User",
      targetId: newUser.id,
      details: `Học sinh "${newUser.hoTen}" tự đăng ký tài khoản thành công (Username: ${newUser.username}, Lớp ${newUser.assignedLop})`,
      newValue: { username: newUser.username, hoTen: newUser.hoTen, lop: newUser.assignedLop },
      req,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: `Đăng ký tài khoản học viên thành công cho "${newUser.hoTen}" (Lớp ${newUser.assignedLop})!`,
      user: {
        username: newUser.username,
        hoTen: newUser.hoTen,
        lop: newUser.assignedLop,
      },
    });
  } catch (error) {
    console.error("Register student API error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
