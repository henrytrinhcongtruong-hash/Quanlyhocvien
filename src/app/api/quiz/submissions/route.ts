import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/quiz/submissions - Lấy danh sách kết quả bài nộp của học sinh
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quizSetId = searchParams.get("quizSetId");
    const lop = searchParams.get("lop");

    const where: any = {};

    if (quizSetId) {
      where.quizSetId = parseInt(quizSetId, 10);
    }

    if (lop && lop !== "ALL") {
      where.studentClass = lop;
    }

    const submissions = await prisma.quizSubmission.findMany({
      where,
      include: {
        quizSet: {
          select: {
            title: true,
            subject: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: 200,
    });

    const data = submissions.map((sub) => ({
      id: sub.id,
      quizSetId: sub.quizSetId,
      quizTitle: sub.quizSet.title,
      subject: sub.quizSet.subject,
      studentId: sub.studentId,
      studentName: sub.studentName,
      studentClass: sub.studentClass,
      score: sub.score,
      totalQuestions: sub.totalQuestions,
      correctCount: sub.correctCount,
      timeSpent: sub.timeSpent,
      submittedAt: sub.submittedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching quiz submissions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi lấy danh sách kết quả" },
      { status: 500 }
    );
  }
}
