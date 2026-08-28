import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SeatSlotData, generateEmptySlots, getSlotTo } from "@/lib/seatingTypes";

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

    // Merge student info into slots and ensure Tổ aligns with seat column
    parsedSlots = parsedSlots.map((s) => {
      const computedTo = getSlotTo(s.col);
      if (s.studentId) {
        const found = students.find((st) => st.id === s.studentId);
        if (found) {
          return {
            ...s,
            studentPhoto: s.studentPhoto || found.avatar || null,
            to: computedTo,
            studentName: s.studentName || found.hoTen.toUpperCase(),
          };
        }
      }
      return {
        ...s,
        to: computedTo,
      };
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await req.json();
    const { id, lop, month, title, gvcn, slogan, slots } = body;

    const currentLop = lop?.trim() || "12T2";
    const currentMonth = month?.trim() || "Tháng 09/2025";
    const parsedSlots: SeatSlotData[] = Array.isArray(slots) ? slots : JSON.parse(slots || "[]");

    // Automatically synchronize student's Tổ with the seat column (Col 1,2 = Tổ 1; Col 3,4 = Tổ 2; Col 5,6 = Tổ 3; Col 7,8 = Tổ 4)
    const normalizedSlots = parsedSlots.map((s) => {
      const computedTo = getSlotTo(s.col);
      return {
        ...s,
        to: computedTo,
      };
    });

    const slotsString = JSON.stringify(normalizedSlots);

    let updated;
    if (id) {
      updated = await prisma.seatingChart.update({
        where: { id: Number(id) },
        data: {
          title: title?.trim() || `SƠ ĐỒ LỚP ${currentLop}`,
          gvcn: gvcn !== undefined ? gvcn?.trim() : undefined,
          slogan: slogan !== undefined ? slogan?.trim() : undefined,
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

    // Sync Tổ (to) and avatar directly to Student table in database
    if (Array.isArray(normalizedSlots)) {
      const seatedStudents = normalizedSlots.filter((s) => s.studentId);
      if (seatedStudents.length > 0) {
        await Promise.allSettled(
          seatedStudents.map((s) => {
            const updateData: { to: number; avatar?: string } = {
              to: getSlotTo(s.col),
            };
            if (s.studentPhoto) {
              updateData.avatar = s.studentPhoto;
            }
            return prisma.student.update({
              where: { id: Number(s.studentId) },
              data: updateData,
            });
          })
        );
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("POST seating chart error:", error);
    return NextResponse.json(
      { error: "Lỗi khi lưu sơ đồ: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
