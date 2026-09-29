"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  FileQuestion,
  Plus,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  Trash2,
  Share2,
  Eye,
  Award,
  Users,
  Sparkles,
  FileText,
  X,
  RefreshCw,
  HelpCircle,
  Copy,
  Check,
  AlertCircle,
  BarChart3,
  Layers,
} from "lucide-react";
import { parseRawExamText, ParsedQuestion } from "@/lib/quiz/parser";

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

interface SubmissionItem {
  id: number;
  quizSetId: number;
  quizTitle: string;
  subject: string;
  studentId: number | null;
  studentName: string;
  studentClass: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeSpent: number;
  submittedAt: string;
}

const SUBJECT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Toán Học": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  "Ngữ Văn": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  "Tiếng Anh": { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  "Vật Lý": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "Hóa Học": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  "Sinh Học": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "Lịch Sử": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Địa Lý": { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  "Tin Học": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
};

function getSubjectBadge(subject: string) {
  return SUBJECT_STYLES[subject] || { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" };
}

export default function AdminOnThiPage() {
  const [activeTab, setActiveTab] = useState<"sets" | "submissions">("sets");
  const [quizSets, setQuizSets] = useState<QuizSetItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedSetDetail, setSelectedSetDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form tạo đề mới
  const [formData, setFormData] = useState({
    title: "",
    subject: "Toán Học",
    grade: "12",
    lop: "ALL",
    duration: "45",
    description: "",
  });
  const [importMode, setImportMode] = useState<"smart" | "manual">("smart");
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [creating, setCreating] = useState(false);

  // Load data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSets, resSubs] = await Promise.all([
        fetch("/api/quiz/sets"),
        fetch("/api/quiz/submissions"),
      ]);
      const dataSets = await resSets.json();
      const dataSubs = await resSubs.json();

      if (dataSets.success) setQuizSets(dataSets.data);
      if (dataSubs.success) setSubmissions(dataSubs.data);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Quiz Sets
  const filteredSets = useMemo(() => {
    return quizSets.filter((s) => {
      const matchSubject = selectedSubject === "ALL" || s.subject === selectedSubject;
      const matchSearch =
        !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [quizSets, selectedSubject, searchQuery]);

  // Overall Stats
  const totalQuestionsCount = quizSets.reduce((sum, s) => sum + s.questionCount, 0);
  const totalSubmissionsCount = submissions.length;
  const overallAvgScore =
    totalSubmissionsCount > 0
      ? (
          submissions.reduce((sum, s) => sum + s.score, 0) /
          totalSubmissionsCount
        ).toFixed(1)
      : "0.0";

  // Danh sách các môn hiện có
  const subjectsList = useMemo(() => {
    const subs = Array.from(new Set(quizSets.map((s) => s.subject)));
    return ["ALL", ...subs];
  }, [quizSets]);

  // Copy student share link
  const handleCopyShareLink = (id: number) => {
    const url = `${window.location.origin}/on-thi?set=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Xem chi tiết bộ đề
  const handleViewDetail = async (id: number) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await fetch(`/api/quiz/sets/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedSetDetail(data.data);
      }
    } catch (err) {
      console.error("Lỗi tải chi tiết:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Xóa bộ đề
  const handleDeleteSet = async (id: number, title: string) => {
    if (!window.confirm(`Anh có chắc chắn muốn xóa bộ đề "${title}" không? Toàn bộ câu hỏi và bài làm liên quan sẽ bị xóa.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/quiz/sets/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || "Không thể xóa bộ đề");
      }
    } catch (err) {
      alert("Đã xảy ra lỗi khi xóa");
    }
  };

  // Phân tích văn bản đề thi thông minh
  const handleParseRawText = () => {
    if (!rawText.trim()) return;
    const questions = parseRawExamText(rawText);
    if (questions.length === 0) {
      alert("Không nhận diện được câu hỏi nào. Vui lòng đảm bảo các câu hỏi có tiền tố 'Câu 1:', 'Câu 2:' và các phương án 'A.', 'B.', 'C.', 'D.'");
      return;
    }
    setParsedQuestions(questions);
  };

  // Thêm 1 câu hỏi thủ công
  const handleAddManualQuestion = () => {
    setParsedQuestions([
      ...parsedQuestions,
      {
        content: "",
        type: "MULTIPLE_CHOICE",
        options: ["A. ", "B. ", "C. ", "D. "],
        correctAnswer: "A",
        explanation: "",
      },
    ]);
  };

  // Submit tạo đề mới
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQuestions.length === 0) {
      alert("Bộ đề cần có ít nhất 1 câu hỏi!");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        lop: formData.lop,
        duration: parseInt(formData.duration, 10) || 45,
        description: formData.description,
        shuffleQuestions: true,
        shuffleOptions: true,
        questions: parsedQuestions,
      };

      const res = await fetch("/api/quiz/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          title: "",
          subject: "Toán Học",
          grade: "12",
          lop: "ALL",
          duration: "45",
          description: "",
        });
        setRawText("");
        setParsedQuestions([]);
        fetchData();
      } else {
        alert(data.error || "Không thể tạo bộ đề");
      }
    } catch (err) {
      alert("Lỗi khi kết nối đến máy chủ");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <FileQuestion className="w-5 h-5" />
            </span>
            Quản Lý Ôn Thi & Ngân Hàng Đề
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-12">
            Tạo đề thi trắc nghiệm, nhập nhanh từ văn bản & theo dõi bảng điểm học sinh
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition shadow-xs"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Tạo đề thi mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{quizSets.length}</div>
            <div className="text-xs font-medium text-gray-500">Bộ đề thi hiện có</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{totalQuestionsCount}</div>
            <div className="text-xs font-medium text-gray-500">Tổng số câu hỏi</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{totalSubmissionsCount}</div>
            <div className="text-xs font-medium text-gray-500">Lượt nộp bài làm</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{overallAvgScore}</div>
            <div className="text-xs font-medium text-gray-500">Điểm trung bình</div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("sets")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "sets"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          Danh sách bộ đề ({quizSets.length})
        </button>
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "submissions"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Bảng điểm & Báo cáo bài làm ({submissions.length})
        </button>
      </div>

      {/* TAB 1: DANH SÁCH BỘ ĐỀ */}
      {activeTab === "sets" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
            {/* Subject Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {subjectsList.map((sub) => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
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
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm đề thi..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-500 font-medium">Đang tải danh sách bộ đề...</p>
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
              <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileQuestion className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Không tìm thấy bộ đề nào</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Anh có thể bấm nút "Tạo đề thi mới" ở góc trên để nạp đề thi trắc nghiệm đầu tiên cho học sinh nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSets.map((set) => {
                const badge = getSubjectBadge(set.subject);
                return (
                  <div
                    key={set.id}
                    className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {set.subject}
                        </span>
                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {set.duration} phút
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition line-clamp-2">
                        {set.title}
                      </h3>

                      {set.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {set.description}
                        </p>
                      )}
                    </div>

                    {/* Meta stats */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                          {set.questionCount} câu
                        </span>
                        <span className="font-semibold text-gray-700 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-500" />
                          {set.submissionCount} bài
                        </span>
                      </div>
                      <div className="font-bold text-emerald-600 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        ĐTB: {set.avgScore}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopyShareLink(set.id)}
                        className="flex-1 py-2 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
                        title="Sao chép link làm bài gửi học sinh"
                      >
                        {copiedId === set.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép link</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                            <span>Giao link</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleViewDetail(set.id)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                        title="Xem chi tiết các câu hỏi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSet(set.id, set.title)}
                        className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                        title="Xóa đề thi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BẢNG ĐIỂM & BÁO CÁO BÀI LÀM */}
      {activeTab === "submissions" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Danh sách kết quả bài làm gần nhất ({submissions.length})
            </h3>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs font-medium">
              Chưa có học sinh nào nộp bài thi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Học sinh</th>
                    <th className="px-4 py-3">Lớp</th>
                    <th className="px-4 py-3">Bộ đề ôn tập</th>
                    <th className="px-4 py-3 text-center">Điểm số</th>
                    <th className="px-4 py-3 text-center">Đúng / Tổng</th>
                    <th className="px-4 py-3 text-center">Thời gian</th>
                    <th className="px-4 py-3 text-right">Thời điểm nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {submissions.map((sub) => {
                    const scoreColor =
                      sub.score >= 8
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : sub.score >= 5
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";

                    return (
                      <tr key={sub.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-4 py-3 font-bold text-gray-900">{sub.studentName}</td>
                        <td className="px-4 py-3 font-semibold text-gray-600">{sub.studentClass}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <span className="font-bold text-blue-700 mr-1.5">[{sub.subject}]</span>
                          {sub.quizTitle}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs border ${scoreColor}`}>
                            {sub.score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-600">
                          {sub.correctCount} / {sub.totalQuestions}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500 font-medium">
                          {Math.floor(sub.timeSpent / 60)}p {sub.timeSpent % 60}s
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {new Date(sub.submittedAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: TẠO ĐỀ THI MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Tạo Bộ Đề Thi Mới</h2>
                  <p className="text-xs text-gray-500">Tạo thủ công hoặc nạp nhanh hàng loạt câu hỏi từ văn bản</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tên bộ đề thi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đề ôn tập HKII môn Toán - Đề số 1"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Môn học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Toán Học">Toán Học</option>
                    <option value="Ngữ Văn">Ngữ Văn</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Vật Lý">Vật Lý</option>
                    <option value="Hóa Học">Hóa Học</option>
                    <option value="Sinh Học">Sinh Học</option>
                    <option value="Lịch Sử">Lịch Sử</option>
                    <option value="Địa Lý">Địa Lý</option>
                    <option value="Tin Học">Tin Học</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Thời lượng (Phút)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Khối lớp</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="12">Lớp 12</option>
                    <option value="11">Lớp 11</option>
                    <option value="10">Lớp 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Áp dụng cho lớp</label>
                  <input
                    type="text"
                    value={formData.lop}
                    onChange={(e) => setFormData({ ...formData, lop: e.target.value })}
                    placeholder="VD: 12T2 hoặc ALL"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Chế độ nhập câu hỏi */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-800">Soạn danh sách câu hỏi:</span>
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setImportMode("smart")}
                      className={`px-3 py-1 rounded-lg transition ${
                        importMode === "smart" ? "bg-white text-blue-700 shadow-2xs" : "text-gray-500"
                      }`}
                    >
                      Dán văn bản tự động
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode("manual")}
                      className={`px-3 py-1 rounded-lg transition ${
                        importMode === "manual" ? "bg-white text-blue-700 shadow-2xs" : "text-gray-500"
                      }`}
                    >
                      Tự nhập từng câu
                    </button>
                  </div>
                </div>

                {/* Chế độ Smart Parse */}
                {importMode === "smart" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-800">
                      💡 <strong>Mẹo:</strong> Anh có thể copy trực tiếp đề thi từ Word/PDF dạng <em>"Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: A"</em> rồi dán vào ô bên dưới, hệ thống sẽ tự phân tích và bóc tách câu hỏi!
                    </div>

                    <textarea
                      rows={6}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Dán nội dung đề thi vào đây...&#10;Ví dụ:&#10;Câu 1: Đạo hàm của hàm số y = x² là:&#10;A. 2x&#10;B. x&#10;C. 2&#10;D. x²&#10;Đáp án: A&#10;Lời giải: (x²)' = 2x."
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={handleParseRawText}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Phân tích & Tách câu hỏi
                    </button>
                  </div>
                )}

                {/* Chế độ Manual Add */}
                {importMode === "manual" && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleAddManualQuestion}
                      className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm 1 câu hỏi
                    </button>
                  </div>
                )}

                {/* Danh sách câu hỏi đã bóc tách / sẵn sàng tạo */}
                <div className="mt-4 space-y-3">
                  <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>Câu hỏi đã sẵn sàng ({parsedQuestions.length} câu):</span>
                    {parsedQuestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setParsedQuestions([])}
                        className="text-rose-600 hover:underline text-[11px]"
                      >
                        Xóa tất cả câu
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
                    {parsedQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-blue-700 shrink-0">Câu {idx + 1}:</span>
                          <input
                            type="text"
                            value={q.content}
                            onChange={(e) => {
                              const updated = [...parsedQuestions];
                              updated[idx].content = e.target.value;
                              setParsedQuestions(updated);
                            }}
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs"
                            placeholder="Nội dung câu hỏi..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setParsedQuestions(parsedQuestions.filter((_, i) => i !== idx));
                            }}
                            className="text-gray-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-2 gap-1.5 pl-6">
                          {q.options.map((opt, optIdx) => (
                            <input
                              key={optIdx}
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...parsedQuestions];
                                updated[idx].options[optIdx] = e.target.value;
                                setParsedQuestions(updated);
                              }}
                              className="bg-white border border-gray-200 rounded px-2 py-1 text-[11px]"
                            />
                          ))}
                        </div>

                        {/* Đáp án đúng & Giải thích */}
                        <div className="flex items-center gap-3 pl-6 pt-1 text-[11px]">
                          <span className="font-bold text-gray-700">Đáp án đúng:</span>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => {
                              const updated = [...parsedQuestions];
                              updated[idx].correctAnswer = e.target.value;
                              setParsedQuestions(updated);
                            }}
                            className="bg-white border border-gray-300 rounded px-2 py-0.5 font-bold text-blue-700"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || parsedQuestions.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  {creating ? "Đang lưu đề thi..." : `Lưu bộ đề (${parsedQuestions.length} câu)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM CHI TIẾT CÂU HỎI */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedSetDetail?.title || "Chi tiết bộ đề"}
                </h2>
                <p className="text-xs text-gray-500">
                  Môn: {selectedSetDetail?.subject} • {selectedSetDetail?.questions?.length || 0} câu hỏi • Thời lượng: {selectedSetDetail?.duration} phút
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {detailLoading ? (
                <div className="py-12 text-center text-sm text-gray-500">Đang tải câu hỏi...</div>
              ) : (
                selectedSetDetail?.questions?.map((q: any, idx: number) => (
                  <div key={q.id} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-2.5 text-xs">
                    <div className="font-bold text-gray-900 flex items-start gap-2">
                      <span className="text-blue-700 font-extrabold shrink-0">Câu {idx + 1}:</span>
                      <span>{q.content}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                      {q.options?.map((opt: string, optIdx: number) => {
                        const letter = ["A", "B", "C", "D"][optIdx];
                        const isCorrect = letter === q.correctAnswer;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border font-medium ${
                              isCorrect
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                : "bg-white text-gray-700 border-gray-200"
                            }`}
                          >
                            {opt} {isCorrect && "✓"}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                        <span className="font-bold text-blue-700">💡 Lời giải / Hướng dẫn:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
