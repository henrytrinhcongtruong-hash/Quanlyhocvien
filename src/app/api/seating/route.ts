import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SeatSlotData, generateEmptySlots } from "@/lib/seatingTypes";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lop = searchParams.get("lop") || "12T2";
    const month = searchParams.get("month") || "Tháng 09/2025";

    let chart = await prisma.seatingChart.findFirst({
      where: { lop, month },
      orderBy: { updatedAt: "desc" },
    });

    if (!chart) {
      const initialSlots = generateEmptySlots();
      chart = await prisma.seatingChart.create({
        data: {
          lop,
          title: `SƠ ĐỒ LỚP ${lop}`,
          gvcn: "KIM LIÊN",
          slogan: "12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!",
          month,
          slotsData: JSON.stringify(initialSlots),
        },
      });
    }

    // Get list of all students of this class with avatars
    const students = await prisma.student.findMany({
      where: { lop },
      select: { id: true, hoTen: true, tenGoi: true, gioiTinh: true, avatar: true, to: true },
      orderBy: { hoTen: "asc" },
    });

    let parsedSlots: SeatSlotData[] = [];
    try {
      parsedSlots = JSON.parse(chart.slotsData);
    } catch {
      parsedSlots = generateEmptySlots();
    }

    // Link avatar from Student table
    parsedSlots = parsedSlots.map((s) => {
      if (s.studentId) {
        const found = students.find((st) => st.id === s.studentId);
        if (found) {
          return {
            ...s,
            studentPhoto: s.studentPhoto || found.avatar || null,
            to: s.to || found.to,
            studentName: s.studentName || found.hoTen.toUpperCase(),
          };
        }
      }
      return s;
    });

    return NextResponse.json({
      success: true,
      chart: {
        ...chart,
        slots: parsedSlots,
      },
      students,
    });
  } catch (error) {
    console.error("GET seating chart error:", error);
    return NextResponse.json({ error: "Lỗi khi tải sơ đồ lớp học" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, lop, month, title, gvcn, slogan, slots } = body;

    const currentLop = lop?.trim() || "12T2";
    const currentMonth = month?.trim() || "Tháng 09/2025";
    const rawSlots: SeatSlotData[] = Array.isArray(slots) ? slots : JSON.parse(slots || "[]");

    // Clean slots to lightweight format: Do not store large base64 strings in JSON column if student has studentId
    const cleanSlots = rawSlots.map((s) => ({
      id: s.id,
      row: s.row,
      col: s.col,
      block: s.block,
      studentId: s.studentId || null,
      studentName: s.studentName ? s.studentName.toUpperCase() : null,
      studentPhoto: s.studentId ? null : (s.studentPhoto ? s.studentPhoto.substring(0, 100000) : null),
      gender: s.gender || null,
      to: s.to || null,
    }));

    const slotsString = JSON.stringify(cleanSlots);

    let updated;
    if (id) {
      updated = await prisma.seatingChart.update({
        where: { id: Number(id) },
        data: {
          title: title?.trim() || `SƠ ĐỒ LỚP ${currentLop}`,
          gvcn: gvcn?.trim() || "",
          slogan: slogan?.trim() || "",
          month: currentMonth,
          slotsData: slotsString,
        },
      });
    } else {
      const existing = await prisma.seatingChart.findFirst({
        where: { lop: currentLop, month: currentMonth },
      });

      if (existing) {
        updated = await prisma.seatingChart.update({
          where: { id: existing.id },
          data: {
            title: title?.trim() || existing.title,
            gvcn: gvcn !== undefined ? gvcn?.trim() : existing.gvcn,
            slogan: slogan !== undefined ? slogan?.trim() : existing.slogan,
            slotsData: slotsString,
          },
        });
      } else {
        updated = await prisma.seatingChart.create({
          data: {
            lop: currentLop,
            month: currentMonth,
            title: title?.trim() || `SƠ ĐỒ LỚP ${currentLop}`,
            gvcn: gvcn?.trim() || "KIM LIÊN",
            slogan: slogan?.trim() || "12T2 – CÙNG NHAU VƯỢT VŨ MÔN, CÙNG NHAU CHIẾN THẮNG!",
            slotsData: slotsString,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("POST seating chart error:", error);
    return NextResponse.json({ error: "Lỗi khi lưu sơ đồ lớp học" }, { status: 500 });
  }
}
