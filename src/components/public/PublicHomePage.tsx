"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Wallet,
  CheckCircle,
  XCircle,
  Calendar,
  Star,
  ChevronRight,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Info,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatVND, formatDate } from "@/lib/format";
import { compareVietnameseNames } from "@/lib/utils";

// ==================
// TYPES
// ==================
interface Student {
  id: number;
  hoTen: string;
  tenGoi: string | null;
  ngaySinh: string | null;
  gioiTinh: string;
  to: number;
  lop: string;
}

interface FeeStatus {
  kyThu: string;
  trangThai: string;
  soTien: number;
  ngayDong: string | null;
  hinhThucDong: string;
}

interface FeeSummary {
  tongThu: number;
  tongChi: number;
  conLai: number;
  soHSDaDong: number;
  tongHS: number;
  chiTheoHangMuc: { hangMucChi: string; total: number }[];
}

interface Event {
  id: number;
  tenSuKien: string;
  hangMuc: string | null;
  deadline: string | null;
  trangThai: string;
  members: { vaiTro: string; student: { hoTen: string } }[];
}

interface DutyEntry {
  thu: string;
  thuOrder: number;
  students: string[];
}

// ==================
// BADGE HELPER
// ==================
function TrangThaiFee({ value }: { value: string }) {
  const isDaDong = value === "Đã Đóng";
  return (
    <span
      className={`badge ${isDaDong ? "badge-success" : "badge-danger"}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      {isDaDong ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {value}
    </span>
  );
}

function TrangThaiEvent({ value }: { value: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    "Sắp diễn ra": { cls: "badge-info", icon: <Info size={12} /> },
    "Đang diễn ra": { cls: "badge-warning", icon: <AlertCircle size={12} /> },
    "Đã xong": { cls: "badge-success", icon: <CheckCircle size={12} /> },
  };
  const cfg = map[value] || { cls: "badge-neutral", icon: null };
  return (
    <span className={`badge ${cfg.cls}`}>
      {cfg.icon}
      {value}
    </span>
  );
}

import { useSearchParams } from "next/navigation";

// ==================
// MAIN COMPONENT
// ==================
export default function PublicHomePage() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");

  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "12T2";
    }
    return urlLop || "12T2";
  });

  const [tab, setTab] = useState<"danh-sach" | "quy" | "diem-danh">("danh-sach");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">("default");
  const [filterTo, setFilterTo] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [feeStatus, setFeeStatus] = useState<FeeStatus[]>([]);
  const [loadingFee, setLoadingFee] = useState(false);

  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [duty, setDuty] = useState<DutyEntry[]>([]);
  const [currentWeek, setCurrentWeek] = useState("");

  // Sync active class from searchParams
  useEffect(() => {
    if (urlLop && urlLop !== "ALL") {
      setActiveLop(urlLop);
    }
  }, [urlLop]);

  // Fetch students by class
  useEffect(() => {
    setLoadingStudents(true);
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/students${lopQuery}`)
      .then((r) => r.json())
      .then((d) => { setStudents(d.data || d); setLoadingStudents(false); })
      .catch(() => setLoadingStudents(false));
  }, [activeLop]);

  // Fetch fee summary by class
  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `?lop=${activeLop}` : "";
    fetch(`/api/fees/summary${lopQuery}`)
      .then((r) => r.json())
      .then(setFeeSummary)
      .catch(() => {});
  }, [activeLop]);

  // Fetch events
  useEffect(() => {
    fetch("/api/events?public=1")
      .then((r) => r.json())
      .then((d) => setEvents(d.data || d))
      .catch(() => {});
  }, []);

  // Fetch duty roster (current week)
  useEffect(() => {
    const lopQuery = activeLop && activeLop !== "ALL" ? `&lop=${activeLop}` : "";
    fetch(`/api/duty?week=current${lopQuery}`)
      .then((r) => r.json())
      .then((d) => { setDuty(d.entries || []); setCurrentWeek(d.week || ""); })
      .catch(() => {});
  }, [activeLop]);

  // Fetch fee for selected student
  useEffect(() => {
    if (!selectedStudentId) return;
    setLoadingFee(true);
    fetch(`/api/fees?studentId=${selectedStudentId}`)
      .then((r) => r.json())
      .then((d) => { setFeeStatus(d.data || d); setLoadingFee(false); })
      .catch(() => setLoadingFee(false));
  }, [selectedStudentId]);

  const filtered = students.filter((s) => {
    const matchTo = filterTo === 0 || s.to === filterTo;
    const matchSearch =
      !search ||
      s.hoTen.toLowerCase().includes(search.toLowerCase()) ||
      (s.tenGoi || "").toLowerCase().includes(search.toLowerCase());
    return matchTo && matchSearch;
  });

  // Group by tổ with Vietnamese alphabetical name sort
  const byTo = [1, 2, 3, 4].map((t) => {
    let group = filtered.filter((s) => s.to === t);
    if (sortOrder !== "default") {
      group = [...group].sort((a, b) => compareVietnameseNames(a.hoTen, b.hoTen, sortOrder));
    }
    return {
      to: t,
      students: group,
    };
  });

  return (
    <div className="animate-fade-in">
      {/* ====== HERO BANNER ====== */}
      <div
        style={{
          background: "linear-gradient(135deg, hsl(213,94%,44%) 0%, hsl(213,80%,55%) 50%, hsl(152,60%,38%) 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 28px 24px",
          marginBottom: 24,
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -20,
            right: 60,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
                backdropFilter: "blur(4px)",
              }}
            >
              {activeLop.substring(0, 3)}
            </div>
            <div>
              <h1 style={{ color: "white", fontSize: "1.6rem", marginBottom: 2 }}>
                Chào mừng đến Lớp {activeLop}!
              </h1>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.9rem", margin: 0 }}>
                Năm học 2025–2026 • {students.length} học sinh • 4 tổ
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            {[
              { icon: <Users size={14} />, label: "Học sinh", value: `${students.length}` },
              {
                icon: <CheckCircle size={14} />,
                label: "Đã đóng quỹ HK1",
                value: feeSummary
                  ? `${Math.round((feeSummary.soHSDaDong / feeSummary.tongHS) * 100)}%`
                  : "—",
              },
              {
                icon: <Wallet size={14} />,
                label: "Quỹ còn lại",
                value: feeSummary ? formatVND(feeSummary.conLai) : "—",
              },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.8)", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.icon}
                  {stat.label}
                </div>
                <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem", marginTop: 2 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ====== TABS ====== */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "2px solid var(--border)",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {[
          { key: "danh-sach", icon: <Users size={15} />, label: "Danh sách lớp" },
          { key: "quy", icon: <Wallet size={15} />, label: "Quỹ lớp & Tình trạng đóng" },
          { key: "diem-danh", icon: <BookOpen size={15} />, label: "Lịch trực & Sự kiện" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: tab === t.key ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2,
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== TAB: DANH SÁCH ====== */}
      {tab === "danh-sach" && (
        <div>
          {/* Search + filter + sort */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="input"
                style={{ paddingLeft: 36 }}
                placeholder="Tìm tên học sinh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <select
              className="select"
              style={{ flex: "0 0 140px" }}
              value={filterTo}
              onChange={(e) => setFilterTo(Number(e.target.value))}
            >
              <option value={0}>Tất cả tổ</option>
              {[1, 2, 3, 4].map((t) => (
                <option key={t} value={t}>
                  Tổ {t}
                </option>
              ))}
            </select>

            {/* Nút Sort Tên A-Z / Z-A */}
            <button
              type="button"
              className={`btn btn-sm ${sortOrder !== "default" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                if (sortOrder === "default") setSortOrder("asc");
                else if (sortOrder === "asc") setSortOrder("desc");
                else setSortOrder("default");
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
              title="Bấm để đổi sắp xếp tên: A-Z -> Z-A -> Mặc định"
            >
              {sortOrder === "asc" ? (
                <>
                  <ArrowUpAZ size={15} /> Tên: A $\rightarrow$ Z
                </>
              ) : sortOrder === "desc" ? (
                <>
                  <ArrowDownAZ size={15} /> Tên: Z $\rightarrow$ A
                </>
              ) : (
                <>
                  <ArrowUpDown size={14} /> Sắp xếp tên
                </>
              )}
            </button>

            {(search || filterTo > 0 || sortOrder !== "default") && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setSearch(""); setFilterTo(0); setSortOrder("default"); }}
              >
                <X size={13} /> Bỏ lọc
              </button>
            )}
          </div>

          {loadingStudents ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {byTo.map(({ to, students: group }) => {
                if (group.length === 0) return null;
                return (
                  <div key={to} className="card" style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "var(--primary-light)",
                        borderBottom: "1px solid var(--primary-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <h3 style={{ color: "var(--primary)", fontSize: "0.9rem", margin: 0 }}>
                        Tổ {to}
                      </h3>
                      <span
                        className="badge badge-neutral"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {group.length} học sinh
                      </span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}>#</th>
                            <th
                              style={{ cursor: "pointer", userSelect: "none" }}
                              onClick={() => {
                                if (sortOrder === "default") setSortOrder("asc");
                                else if (sortOrder === "asc") setSortOrder("desc");
                                else setSortOrder("default");
                              }}
                              title="Bấm để đổi chiều sắp xếp tên: A-Z -> Z-A -> Mặc định"
                            >
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span>Họ và tên</span>
                                {sortOrder === "asc" ? (
                                  <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                                    <ArrowUpAZ size={12} /> A-Z
                                  </span>
                                ) : sortOrder === "desc" ? (
                                  <span className="badge badge-primary" style={{ padding: "1px 6px", fontSize: "0.7rem" }}>
                                    <ArrowDownAZ size={12} /> Z-A
                                  </span>
                                ) : (
                                  <ArrowUpDown size={12} style={{ color: "var(--text-muted)" }} />
                                )}
                              </div>
                            </th>
                            <th>Tên gọi</th>
                            <th>Giới tính</th>
                            <th>Ngày sinh</th>
                            <th>Tình trạng quỹ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.map((s, idx) => (
                            <tr key={s.id}>
                              <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                {idx + 1}
                              </td>
                              <td style={{ fontWeight: 600 }}>{s.hoTen}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{s.tenGoi || "—"}</td>
                              <td>
                                <span
                                  style={{
                                    fontSize: "0.78rem",
                                    color: s.gioiTinh === "Nữ" ? "hsl(330,70%,50%)" : "var(--info)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {s.gioiTinh}
                                </span>
                              </td>
                              <td style={{ fontSize: "0.85rem" }}>{formatDate(s.ngaySinh)}</td>
                              <td>
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(s.id === selectedStudentId ? null : s.id);
                                    setTab("quy");
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--primary)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                  }}
                                >
                                  Xem <ChevronRight size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 48,
                    color: "var(--text-muted)",
                  }}
                >
                  <Users size={40} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                  <p>Không tìm thấy học sinh nào phù hợp</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== TAB: QUỸ LỚP ====== */}
      {tab === "quy" && (
        <div>
          {/* Tổng quan quỹ */}
          {feeSummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Tổng thu", value: formatVND(feeSummary.tongThu), color: "var(--success)", icon: <TrendingUp size={18} /> },
                { label: "Tổng chi", value: formatVND(feeSummary.tongChi), color: "var(--danger)", icon: <Wallet size={18} /> },
                { label: "Số dư còn lại", value: formatVND(feeSummary.conLai), color: "var(--primary)", icon: <CheckCircle size={18} /> },
              ].map((kpi, i) => (
                <div key={i} className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div className="kpi-number" style={{ color: kpi.color }}>
                        {kpi.value}
                      </div>
                      <div className="kpi-label">{kpi.label}</div>
                    </div>
                    <div style={{ color: kpi.color, opacity: 0.6 }}>{kpi.icon}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tra cứu cá nhân */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={17} />
              Tra cứu tình trạng đóng quỹ
            </h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select
                className="select"
                style={{ flex: "1 1 200px" }}
                value={selectedStudentId || ""}
                onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Chọn tên học sinh --</option>
                {[1, 2, 3, 4].map((to) => (
                  <optgroup key={to} label={`Tổ ${to}`}>
                    {students.filter((s) => s.to === to).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.hoTen}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {selectedStudentId && (
              <div style={{ marginTop: 16 }}>
                {loadingFee ? (
                  <div className="skeleton" style={{ height: 80 }} />
                ) : feeStatus.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>Chưa có dữ liệu đóng quỹ.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {feeStatus.map((f) => (
                      <div
                        key={f.kyThu}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          background: f.trangThai === "Đã Đóng" ? "var(--success-light)" : "var(--danger-light)",
                          borderRadius: 8,
                          border: `1px solid ${f.trangThai === "Đã Đóng" ? "var(--success-border)" : "var(--danger-border)"}`,
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{f.kyThu}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            {formatVND(f.soTien)} • {f.hinhThucDong}
                            {f.ngayDong ? ` • Ngày ${formatDate(f.ngayDong)}` : ""}
                          </div>
                        </div>
                        <TrangThaiFee value={f.trangThai} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== TAB: LỊCH TRỰC & SỰ KIỆN ====== */}
      {tab === "diem-danh" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Lịch trực nhật */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={17} />
              Lịch trực nhật tuần này
              {currentWeek && (
                <span
                  className="badge badge-info"
                  style={{ marginLeft: 4, fontSize: "0.72rem" }}
                >
                  {currentWeek}
                </span>
              )}
            </h3>
            {duty.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>Chưa có lịch trực nhật tuần này.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      {duty
                        .sort((a, b) => a.thuOrder - b.thuOrder)
                        .map((d) => (
                          <th key={d.thu}>{d.thu}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {duty
                        .sort((a, b) => a.thuOrder - b.thuOrder)
                        .map((d) => (
                          <td key={d.thu}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {d.students.map((name, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                        ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sự kiện sắp tới */}
          <div>
            <h3 style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Star size={17} />
              Sự kiện của lớp
            </h3>
            {events.length === 0 ? (
              <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                <Star size={32} style={{ margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
                <p>Chưa có sự kiện nào.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {events.map((evt) => {
                  const leads = evt.members.filter((m) => m.vaiTro === "Lead");
                  return (
                    <div
                      key={evt.id}
                      className="card"
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <TrangThaiEvent value={evt.trangThai} />
                          {evt.hangMuc && (
                            <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>
                              {evt.hangMuc}
                            </span>
                          )}
                        </div>
                        <h4 style={{ marginBottom: 4 }}>{evt.tenSuKien}</h4>
                        {leads.length > 0 && (
                          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            Phụ trách: {leads.map((l) => l.student.hoTen).join(", ")}
                          </div>
                        )}
                      </div>
                      {evt.deadline && (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Deadline
                          </div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.9rem" }}>
                            {formatDate(evt.deadline)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
