import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/quiz/submit - Học sinh nộp bài và chấm điểm tự động
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      quizSetId,
      studentName,
      studentClass = "12T2",
      studentId,
      answers = {}, // { [questionId: number]: string }
      timeSpent = 0,
      suspiciousLogs,
    } = body;

    const setId = parseInt(String(quizSetId), 10);
    if (isNaN(setId)) {
      return NextResponse.json({ success: false, error: "ID đề thi không hợp lệ" }, { status: 400 });
    }

    if (!studentName || !studentName.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập họ và tên thí sinh" }, { status: 400 });
    }

    // Lấy đề thi và danh sách câu hỏi kèm đáp án chuẩn từ database
    const quizSet = await prisma.quizSet.findUnique({
      where: { id: setId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quizSet) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bộ đề thi này" }, { status: 404 });
    }

    const totalQuestions = quizSet.questions.length;
    let correctCount = 0;

    // Chi tiết chấm điểm từng câu
    const reviewDetails = quizSet.questions.map((q) => {
      let parsedOptions: string[] = [];
      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      const userAnswer = String(answers[q.id] || "").trim().toUpperCase();
      const correctAnswer = String(q.correctAnswer || "").trim().toUpperCase();

      const isCorrect = userAnswer !== "" && userAnswer === correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        content: q.content,
        options: parsedOptions,
        userAnswer: userAnswer || "Chưa chọn",
        correctAnswer,
        isCorrect,
        explanation: q.explanation || "Không có giải thích chi tiết cho câu hỏi này.",
      };
    });

    // Thang điểm 10 chuẩn
    const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
    const finalScore = Math.round(rawScore * 10) / 10; // Làm tròn 1 chữ số thập phân (VD: 8.5)

    // Tìm học sinh tương ứng trong bảng Student nếu có
    let matchedStudentId = studentId ? Number(studentId) : null;
    if (!matchedStudentId) {
      const matched = await prisma.student.findFirst({
        where: {
          hoTen: {
            equals: studentName.trim(),
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      if (matched) matchedStudentId = matched.id;
    }

    // Lưu kết quả nộp bài vào database
    const submission = await prisma.quizSubmission.create({
      data: {
        quizSetId: setId,
        studentId: matchedStudentId,
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        score: finalScore,
        totalQuestions,
        correctCount,
        answers: JSON.stringify(answers),
        timeSpent: Number(timeSpent) || 0,
        suspiciousLogs: suspiciousLogs ? JSON.stringify(suspiciousLogs) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        submissionId: submission.id,
        quizTitle: quizSet.title,
        subject: quizSet.subject,
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        score: finalScore,
        totalQuestions,
        correctCount,
        incorrectCount: totalQuestions - correctCount,
        timeSpent: Number(timeSpent) || 0,
        reviewDetails,
      },
    });
  } catch (error: any) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi nộp bài làm" },
      { status: 500 }
    );
  }
}
