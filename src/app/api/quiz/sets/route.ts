import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/quiz/sets - Lấy danh sách bộ đề thi
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const lop = searchParams.get("lop");
    const search = searchParams.get("search");

    const where: any = {};

    if (subject && subject !== "ALL" && subject !== "Tất cả môn") {
      where.subject = subject;
    }

    if (lop && lop !== "ALL") {
      where.OR = [{ lop: "ALL" }, { lop }];
    }

    if (search && search.trim()) {
      where.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    const sets = await prisma.quizSet.findMany({
      where,
      include: {
        _count: {
          select: {
            questions: true,
            submissions: true,
          },
        },
        submissions: {
          select: {
            score: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = sets.map((s) => {
      const subCount = s._count.submissions;
      const avgScore =
        subCount > 0
          ? (
              s.submissions.reduce((acc, cur) => acc + (cur.score || 0), 0) /
              subCount
            ).toFixed(1)
          : "0.0";

      return {
        id: s.id,
        title: s.title,
        subject: s.subject,
        grade: s.grade,
        lop: s.lop,
        duration: s.duration,
        description: s.description,
        isActive: s.isActive,
        shuffleQuestions: s.shuffleQuestions,
        shuffleOptions: s.shuffleOptions,
        questionCount: s._count.questions,
        submissionCount: subCount,
        avgScore,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching quiz sets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi tải danh sách bộ đề" },
      { status: 500 }
    );
  }
}

// POST /api/quiz/sets - Tạo bộ đề thi mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      subject,
      grade = "12",
      lop = "ALL",
      duration = 45,
      description = "",
      shuffleQuestions = true,
      shuffleOptions = true,
      questions = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tên bộ đề" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn môn học" },
        { status: 400 }
      );
    }

    const createdSet = await prisma.quizSet.create({
      data: {
        title: title.trim(),
        subject,
        grade,
        lop,
        duration: Number(duration) || 45,
        description: description?.trim() || null,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        isActive: true,
        questions: {
          create: questions.map((q: any, idx: number) => ({
            content: q.content?.trim() || "",
            type: q.type || "MULTIPLE_CHOICE",
            options: JSON.stringify(q.options || []),
            correctAnswer: (q.correctAnswer || "A").trim(),
            explanation: q.explanation?.trim() || null,
            orderIndex: idx,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return NextResponse.json({ success: true, data: createdSet });
  } catch (error: any) {
    console.error("Error creating quiz set:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi tạo bộ đề" },
      { status: 500 }
    );
  }
}
