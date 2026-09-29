import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/quiz/sets/[id] - Lấy chi tiết 1 bộ đề
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const setId = parseInt(id, 10);
    if (isNaN(setId)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const forStudent = searchParams.get("forStudent") === "true";

    const quizSet = await prisma.quizSet.findUnique({
      where: { id: setId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quizSet) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bộ đề" }, { status: 404 });
    }

    // Định dạng dữ liệu câu hỏi
    const questions = quizSet.questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      if (forStudent) {
        // Ẩn đáp án đúng và giải thích khi học sinh lấy đề thi để làm bài
        return {
          id: q.id,
          content: q.content,
          type: q.type,
          options: parsedOptions,
          orderIndex: q.orderIndex,
        };
      }

      return {
        id: q.id,
        content: q.content,
        type: q.type,
        options: parsedOptions,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        orderIndex: q.orderIndex,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...quizSet,
        questions,
      },
    });
  } catch (error: any) {
    console.error("Error fetching quiz set detail:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi lấy chi tiết bộ đề" },
      { status: 500 }
    );
  }
}

// PUT /api/quiz/sets/[id] - Cập nhật bộ đề
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const setId = parseInt(id, 10);
    if (isNaN(setId)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const {
      title,
      subject,
      grade,
      lop,
      duration,
      description,
      shuffleQuestions,
      shuffleOptions,
      isActive,
      questions,
    } = body;

    // Cập nhật thông tin chính của bộ đề
    await prisma.quizSet.update({
      where: { id: setId },
      data: {
        title: title?.trim(),
        subject,
        grade,
        lop,
        duration: Number(duration) || 45,
        description: description?.trim() || null,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    // Nếu có gửi danh sách câu hỏi mới để cập nhật
    if (Array.isArray(questions)) {
      // Xóa câu hỏi cũ và nạp lại
      await prisma.$transaction([
        prisma.quizQuestion.deleteMany({ where: { quizSetId: setId } }),
        prisma.quizQuestion.createMany({
          data: questions.map((q: any, idx: number) => ({
            quizSetId: setId,
            content: q.content?.trim() || "",
            type: q.type || "MULTIPLE_CHOICE",
            options: JSON.stringify(q.options || []),
            correctAnswer: (q.correctAnswer || "A").trim(),
            explanation: q.explanation?.trim() || null,
            orderIndex: idx,
          })),
        }),
      ]);
    }

    return NextResponse.json({ success: true, message: "Cập nhật bộ đề thành công" });
  } catch (error: any) {
    console.error("Error updating quiz set:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi cập nhật bộ đề" },
      { status: 500 }
    );
  }
}

// DELETE /api/quiz/sets/[id] - Xóa bộ đề
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const setId = parseInt(id, 10);
    if (isNaN(setId)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    await prisma.quizSet.delete({
      where: { id: setId },
    });

    return NextResponse.json({ success: true, message: "Đã xóa bộ đề thành công" });
  } catch (error: any) {
    console.error("Error deleting quiz set:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi xóa bộ đề" },
      { status: 500 }
    );
  }
}
