"use client";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  FileQuestion,
  BookOpen,
  Clock,
  HelpCircle,
  Users,
  Search,
  ChevronRight,
  Sparkles,
  Award,
  Play,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

interface QuizSetItem {
  id: number;
  title: string;
  subject: string;
  grade: string;
  lop: string;
  duration: number;
  description: string | null;
  isActive: boolean;
  questionCount: number;
  submissionCount: number;
  avgScore: string;
  createdAt: string;
}

const SUBJECT_METAS: Record<
  string,
  { bg: string; text: string; border: string; iconBg: string; gradient: string }
> = {
  "Toán Học": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    iconBg: "bg-blue-600 text-white",
    gradient: "from-blue-600 to-indigo-700",
  },
  "Ngữ Văn": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    iconBg: "bg-purple-600 text-white",
    gradient: "from-purple-600 to-pink-700",
  },
  "Tiếng Anh": {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    iconBg: "bg-teal-600 text-white",
    gradient: "from-teal-600 to-emerald-700",
  },
  "Vật Lý": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    iconBg: "bg-orange-600 text-white",
    gradient: "from-orange-600 to-amber-700",
  },
  "Hóa Học": {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    iconBg: "bg-pink-600 text-white",
    gradient: "from-pink-600 to-rose-700",
  },
  "Sinh Học": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    gradient: "from-emerald-600 to-teal-700",
  },
  "Lịch Sử": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    iconBg: "bg-amber-600 text-white",
    gradient: "from-amber-600 to-yellow-700",
  },
  "Địa Lý": {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    iconBg: "bg-slate-700 text-white",
    gradient: "from-slate-700 to-slate-900",
  },
  "Tin Học": {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    iconBg: "bg-sky-600 text-white",
    gradient: "from-sky-600 to-blue-700",
  },
};

function getSubjectMeta(subject: string) {
  return (
    SUBJECT_METAS[subject] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-200",
      iconBg: "bg-blue-600 text-white",
      gradient: "from-blue-600 to-indigo-700",
    }
  );
}

function OnThiHomeContent() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "ALL";

  const [quizSets, setQuizSets] = useState<QuizSetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch("/api/quiz/sets");
        const json = await res.json();
        if (json.success) {
          setQuizSets(json.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải đề thi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Danh sách các môn có đề
  const allSubjects = useMemo(() => {
    const subs = Array.from(new Set(quizSets.map((s) => s.subject)));
    return ["ALL", ...subs];
  }, [quizSets]);

  // Bộ lọc
  const filteredSets = useMemo(() => {
    return quizSets.filter((s) => {
      const matchSub = selectedSubject === "ALL" || s.subject === selectedSubject;
      const matchSearch =
        !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [quizSets, selectedSubject, searchQuery]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 text-white p-6 sm:p-10 shadow-lg shadow-blue-500/15">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Hệ thống ôn luyện & thi thử trắc nghiệm trực tuyến
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Ôn Thi & Luyện Đề Thông Minh
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-xl">
            Luyện tập trắc nghiệm theo từng môn học, tự động tính điểm theo thang điểm 10 và xem lời giải thích chi tiết ngay sau khi nộp bài!
          </p>
        </div>

        {/* Decorative Circle */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Subject Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {allSubjects.map((sub) => {
            const isSelected = selectedSubject === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {sub === "ALL" ? "Tất cả môn" : sub}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm đề ôn thi..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Quiz Sets Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Đang tải danh sách đề ôn thi...</p>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-3">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileQuestion className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Chưa có đề thi nào trong mục này</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Vui lòng chọn môn học khác hoặc liên hệ giáo viên để cập nhật thêm đề ôn tập nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSets.map((set) => {
            const meta = getSubjectMeta(set.subject);

            return (
              <div
                key={set.id}
                className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top info */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
                      {set.subject}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {set.duration} phút
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition leading-snug line-clamp-2">
                    {set.title}
                  </h3>

                  {set.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {set.description}
                    </p>
                  )}
                </div>

                {/* Bottom Meta & Start Action */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                    <span className="flex items-center gap-1 text-gray-700">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      {set.questionCount} câu hỏi
                    </span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <Users className="w-3.5 h-3.5" />
                      {set.submissionCount} lượt làm
                    </span>
                  </div>

                  <Link
                    href={`/on-thi/${set.id}`}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 group-hover:bg-blue-700"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Bắt đầu làm bài thi
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OnThiPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 font-medium">Đang tải hệ thống ôn thi...</p>
          </div>
        }
      >
        <OnThiHomeContent />
      </Suspense>
    </PublicLayout>
  );
}
