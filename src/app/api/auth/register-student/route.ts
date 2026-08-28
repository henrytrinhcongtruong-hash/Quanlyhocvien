// src/app/api/auth/register-student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    const cleanHoTen = hoTen.trim().replace(/\s+/g, " ");
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
          error: `Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên đăng nhập khác.`,
        },
        { status: 400 }
      );
    }

    // 3. Verify student exists in Student roster for this class
    const studentsInClass = await prisma.student.findMany({
      where: { lop: cleanLop },
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

    // Normalize strings for robust matching (ignore case and multiple spaces)
    const normalize = (str: string) =>
      str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const matchedStudent = studentsInClass.find(
      (s) => normalize(s.hoTen) === normalize(cleanHoTen)
    );

    if (!matchedStudent) {
      return NextResponse.json(
        {
          error: `Không tìm thấy học sinh "${cleanHoTen}" trong danh sách Lớp ${cleanLop}. Vui lòng nhập đúng họ và tên như trên danh sách lớp.`,
        },
        { status: 400 }
      );
    }

    // 4. Check if student already has a user account in this class
    const existingUserForStudent = await prisma.user.findFirst({
      where: {
        assignedLop: cleanLop,
        hoTen: {
          equals: matchedStudent.hoTen,
          mode: "insensitive",
        },
      },
    });

    if (existingUserForStudent) {
      return NextResponse.json(
        {
          error: `Học sinh "${matchedStudent.hoTen}" (Lớp ${cleanLop}) đã được đăng ký tài khoản trước đó (Tên đăng nhập: "${existingUserForStudent.username}"). Nếu quên mật khẩu, vui lòng liên hệ Ban Cán Sự hoặc Admin để được hỗ trợ cấp lại.`,
        },
        { status: 400 }
      );
    }

    // 5. Create new Student User account
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        plainPassword: password, // Stored to allow Admin to assist student if forgotten
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
