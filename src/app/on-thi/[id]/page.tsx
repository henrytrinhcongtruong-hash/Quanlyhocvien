"use client";
import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Award,
  RotateCcw,
  List,
  AlertTriangle,
  Play,
  User,
  School,
  ArrowLeft,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface QuestionItem {
  id: number;
  content: string;
  type: string;
  options: string[];
  orderIndex: number;
}

interface QuizDetail {
  id: number;
  title: string;
  subject: string;
  grade: string;
  lop: string;
  duration: number;
  description: string | null;
  questions: QuestionItem[];
}

interface StudentOption {
  id: number;
  hoTen: string;
  lop: string;
}

interface ExamReviewItem {
  questionId: number;
  content: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface ExamResult {
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  timeSpent: number;
  reviewDetails: ExamReviewItem[];
}

export default function StudentExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const quizId = resolvedParams.id;

  // Stages: 'entry' | 'exam' | 'result'
  const [stage, setStage] = useState<"entry" | "exam" | "result">("entry");
  const [quizData, setQuizData] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [studentList, setStudentList] = useState<StudentOption[]>([]);

  // Entry inputs
  const [studentName, setStudentName] = useState<string>("");
  const [studentClass, setStudentClass] = useState<string>("12T2");

  // Exam state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result state
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  // Load quiz details and student roster
  useEffect(() => {
    async function loadQuiz() {
      setLoading(true);
      try {
        const [resQuiz, resStudents] = await Promise.all([
          fetch(`/api/quiz/sets/${quizId}?forStudent=true`),
          fetch("/api/quiz/students?lop=ALL"),
        ]);
        const jsonQuiz = await resQuiz.json();
        const jsonStudents = await resStudents.json();

        if (jsonQuiz.success) {
          setQuizData(jsonQuiz.data);
          setRemainingSeconds(jsonQuiz.data.duration * 60);
        }
        if (jsonStudents.success) {
          setStudentList(jsonStudents.data);
        }
      } catch (err) {
        console.error("Lỗi tải đề thi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (stage === "exam") {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, userAnswers]);

  // Start exam action
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("Vui lòng chọn hoặc nhập họ và tên của bạn!");
      return;
    }
    if (!quizData || quizData.questions.length === 0) {
      alert("Đề thi này chưa có câu hỏi nào!");
      return;
    }
    setStage("exam");
  };

  // Select option
  const handleSelectOption = (questionId: number, letter: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: letter,
    }));
  };

  // Toggle flag
  const handleToggleFlag = (questionId: number) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Auto submit when time runs out
  const handleAutoSubmit = () => {
    alert("Hết giờ làm bài! Hệ thống đang tự động nộp bài thi của bạn...");
    submitExam();
  };

  // Manual submit action
  const handleManualSubmit = () => {
    const total = quizData?.questions.length || 0;
    const answered = Object.keys(userAnswers).length;
    const unanswered = total - answered;

    const msg =
      unanswered > 0
        ? `Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài thi không?`
        : "Bạn có chắc chắn muốn nộp bài thi ngay bây giờ?";

    if (window.confirm(msg)) {
      submitExam();
    }
  };

  // Execute API submit
  const submitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    try {
      const timeSpent = quizData ? quizData.duration * 60 - remainingSeconds : 0;

      const payload = {
        quizSetId: quizId,
        studentName: studentName.trim(),
        studentClass: studentClass.trim(),
        answers: userAnswers,
        timeSpent: Math.max(timeSpent, 1),
      };

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setExamResult(json.data);
        setStage("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert(json.error || "Không thể nộp bài");
      }
    } catch (err) {
      alert("Lỗi kết nối khi nộp bài thi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="py-24 text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500 font-semibold">Đang chuẩn bị phòng thi trực tuyến...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!quizData) {
    return (
      <PublicLayout>
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Không tìm thấy bộ đề thi</h2>
          <p className="text-xs text-gray-500">Đề thi này có thể đã bị xóa hoặc chưa được phát hành.</p>
          <Link
            href="/on-thi"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại danh mục đề
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const currentQuestion = quizData.questions[currentIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = quizData.questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Format time (mm:ss)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto pb-16">
        {/* STAGE 1: ENTRY / BẮT ĐẦU */}
        {stage === "entry" && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {quizData.subject}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {quizData.title}
              </h1>
              <p className="text-xs text-gray-500">
                {quizData.questions.length} câu hỏi • Thời gian làm bài: {quizData.duration} phút
              </p>
            </div>

            {/* Exam instruction cards */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 space-y-1.5 leading-relaxed">
              <div className="font-bold text-gray-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" /> Hướng dẫn làm bài thi:
              </div>
              <p>• Chọn hoặc nhập Họ và tên và Lớp của bạn trước khi bắt đầu.</p>
              <p>• Thời gian bắt đầu đếm ngược ngay khi bạn bấm nút "Bắt đầu làm bài".</p>
              <p>• Hệ thống sẽ tự động nộp bài khi đồng hồ đếm ngược về 00:00.</p>
              <p>• Sau khi nộp bài, bạn sẽ được xem điểm và lời giải chi tiết cho từng câu.</p>
            </div>

            {/* Entry Form */}
            <form onSubmit={handleStartExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn tên của bạn trong lớp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="students-datalist"
                  placeholder="Gõ hoặc chọn tên của bạn..."
                  value={studentName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStudentName(val);
                    // Tự động điền lớp nếu chọn từ danh sách
                    const matched = studentList.find((s) => s.hoTen.toLowerCase() === val.toLowerCase());
                    if (matched) setStudentClass(matched.lop);
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                <datalist id="students-datalist">
                  {studentList.map((s) => (
                    <option key={s.id} value={s.hoTen}>
                      {s.hoTen} - {s.lop}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Bắt Đầu Làm Bài Thi
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STAGE 2: LIVE EXAM INTERACTION */}
        {stage === "exam" && currentQuestion && (
          <div className="space-y-4">
            {/* Top Bar with Timer */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-4 sticky top-4 z-40">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {quizData.subject}
                </span>
                <h2 className="text-sm font-bold text-gray-900 hidden sm:block truncate max-w-sm">
                  {quizData.title}
                </h2>
              </div>

              {/* Countdown Timer */}
              <div
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-sm font-black transition ${
                  remainingSeconds < 60
                    ? "bg-rose-100 text-rose-700 animate-pulse border border-rose-300"
                    : remainingSeconds < 300
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={submitting}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>

            {/* Main Exam Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Question Viewport (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <span className="text-sm font-black text-blue-700">
                      Câu hỏi {currentIndex + 1} / {totalCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQuestion.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
                        flaggedQuestions[currentQuestion.id]
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-transparent"
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {flaggedQuestions[currentQuestion.id] ? "Đã đánh dấu" : "Đánh dấu xem lại"}
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
                    {currentQuestion.content}
                  </div>

                  {/* Options (A, B, C, D) */}
                  <div className="space-y-3 pt-2">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const letter = ["A", "B", "C", "D"][optIdx] || "A";
                      const isSelected = userAnswers[currentQuestion.id] === letter;

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(currentQuestion.id, letter)}
                          className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-center gap-3.5 ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-600 text-blue-950 font-bold shadow-xs"
                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50/60"
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Navigation */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Câu trước
                    </button>

                    <button
                      type="button"
                      disabled={currentIndex === totalCount - 1}
                      onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition flex items-center gap-1.5 shadow-xs"
                    >
                      Câu tiếp theo <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Side Grid Navigator (1 col) */}
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 mb-1">Tiến độ bài làm:</h3>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold mt-1">
                      <span>Đã làm: {answeredCount} / {totalCount} câu</span>
                      <span>{progressPercent}%</span>
                    </div>
                  </div>

                  {/* Question Grid */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs font-bold text-gray-800 mb-2">Bảng câu hỏi:</div>
                    <div className="grid grid-cols-5 gap-2">
                      {quizData.questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAnswered = !!userAnswers[q.id];
                        const isFlagged = !!flaggedQuestions[q.id];

                        let btnClass = "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100";
                        if (isAnswered) {
                          btnClass = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
                        }
                        if (isFlagged) {
                          btnClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                        }
                        if (isCurrent) {
                          btnClass += " ring-2 ring-blue-500 font-black";
                        }

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-9 rounded-xl text-xs font-bold border flex items-center justify-center transition ${btnClass}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-3 border-t border-gray-100 space-y-1 text-[11px] text-gray-500">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span>
                      <span>Đã chọn đáp án</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300"></span>
                      <span>Đánh dấu xem lại</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-gray-100 border border-gray-300"></span>
                      <span>Chưa trả lời</span>
                    </div>
                  </div>

                  {/* Submit Button in Sidebar */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleManualSubmit}
                      disabled={submitting}
                      className="w-full py-3 rounded-2xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20"
                    >
                      NỘP BÀI THI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: RESULT & FULL EXPLANATION REVIEW */}
        {stage === "result" && examResult && (
          <div className="space-y-6">
            {/* Score Banner */}
            <div className="p-8 rounded-3xl bg-white border border-gray-200 shadow-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {quizData.subject} • Kết quả bài thi
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                  {examResult.score >= 8
                    ? "Xuất Sắc! Chúc Mừng Bạn 🎉"
                    : examResult.score >= 6.5
                    ? "Làm Tốt Lắm! 👏"
                    : "Đã Hoàn Thành Bài Thi! 💪"}
                </h2>
                <p className="text-xs text-gray-500">
                  Thí sinh: <strong>{studentName}</strong> • Lớp: <strong>{studentClass}</strong>
                </p>
              </div>

              {/* Big Score Number */}
              <div className="py-2">
                <div className="inline-block px-8 py-3 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <div className="text-4xl sm:text-5xl font-black tracking-tight">{examResult.score}</div>
                  <div className="text-xs font-bold text-blue-200 mt-0.5">Thang điểm 10</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div className="text-lg font-black text-emerald-700">{examResult.correctCount}</div>
                  <div className="text-[11px] font-bold text-emerald-600">Câu đúng</div>
                </div>

                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <div className="text-lg font-black text-rose-700">{examResult.incorrectCount}</div>
                  <div className="text-[11px] font-bold text-rose-600">Câu sai</div>
                </div>

                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                  <div className="text-lg font-black text-blue-700">
                    {Math.floor(examResult.timeSpent / 60)}p {examResult.timeSpent % 60}s
                  </div>
                  <div className="text-[11px] font-bold text-blue-600">Thời gian</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserAnswers({});
                    setFlaggedQuestions({});
                    setRemainingSeconds(quizData.duration * 60);
                    setCurrentIndex(0);
                    setStage("exam");
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Làm lại đề thi này
                </button>

                <Link
                  href="/on-thi"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Trở về danh mục đề
                </Link>
              </div>
            </div>

            {/* Full Explanation & Review Header */}
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Xem Lại Chi Tiết & Lời Giải Từng Câu
              </h3>

              {/* Review Question Cards */}
              <div className="space-y-4">
                {examResult.reviewDetails.map((item, idx) => (
                  <div
                    key={item.questionId}
                    className={`p-6 rounded-3xl bg-white border-2 space-y-3.5 ${
                      item.isCorrect ? "border-emerald-200 shadow-xs" : "border-rose-200 shadow-xs"
                    }`}
                  >
                    {/* Header item */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                      <span className="font-extrabold text-xs text-gray-800">
                        Câu {idx + 1}:
                      </span>
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                        </span>
                      )}
                    </div>

                    {/* Question text */}
                    <div className="text-sm font-bold text-gray-900">
                      {item.content}
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.options.map((opt, optIdx) => {
                        const letter = ["A", "B", "C", "D"][optIdx];
                        const isStudentChoice = item.userAnswer === letter;
                        const isCorrectAnswer = item.correctAnswer === letter;

                        let style = "bg-gray-50 border-gray-200 text-gray-700";
                        if (isCorrectAnswer) {
                          style = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                        } else if (isStudentChoice && !item.isCorrect) {
                          style = "bg-rose-50 border-rose-300 text-rose-900 font-bold";
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${style}`}
                          >
                            <span>{opt}</span>
                            {isCorrectAnswer && (
                              <span className="text-[11px] font-bold text-emerald-700">✓ Đáp án đúng</span>
                            )}
                            {isStudentChoice && !isCorrectAnswer && (
                              <span className="text-[11px] font-bold text-rose-700">✗ Bạn đã chọn</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900 leading-relaxed">
                        <strong className="text-blue-700 font-bold">💡 Hướng dẫn giải / Lời giải chi tiết:</strong>{" "}
                        {item.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
