"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicLayout from "@/components/layout/PublicLayout";
import { Star, Calendar, Clock, Users, CheckCircle, AlertCircle, Info } from "lucide-react";
import { formatDate } from "@/lib/format";

interface Event {
  id: number;
  tenSuKien: string;
  hangMuc: string | null;
  deadline: string | null;
  trangThai: string;
  members: { vaiTro: string; student: { hoTen: string } }[];
}

function SuKienInner() {
  const searchParams = useSearchParams();
  const urlLop = searchParams.get("lop");
  const [activeLop, setActiveLop] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return urlLop || localStorage.getItem("admin_selected_class") || "11AT3";
    }
    return urlLop || "11AT3";
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (urlLop && urlLop !== "ALL") setActiveLop(urlLop);
  }, [urlLop]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/events?public=1")
      .then(r => r.json())
      .then(d => {
        setEvents(d.data || d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Sự kiện & Phong trào Lớp {activeLop}</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Kế hoạch hoạt động, deadline và phân công nhân sự
        </p>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Star size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p>Hiện chưa có sự kiện nào</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {events.map((e) => (
            <div key={e.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{e.tenSuKien}</h3>
                <span className={`badge ${e.trangThai === "Đã xong" ? "badge-success" : e.trangThai === "Đang diễn ra" ? "badge-warning" : "badge-info"}`}>
                  {e.trangThai}
                </span>
              </div>

              {e.hangMuc && (
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 10 }}>
                  Hạng mục: <span style={{ fontWeight: 600 }}>{e.hangMuc}</span>
                </div>
              )}

              {e.deadline && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 14 }}>
                  <Calendar size={13} /> Hạn chót: <span style={{ fontWeight: 600 }}>{formatDate(e.deadline)}</span>
                </div>
              )}

              {e.members && e.members.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                    Phân công:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {e.members.map((m, mIdx) => (
                      <span key={mIdx} className="badge badge-neutral" style={{ fontSize: "0.75rem" }}>
                        {m.student.hoTen} ({m.vaiTro})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicSuKienPage() {
  return (
    <PublicLayout>
      <Suspense fallback={<div className="skeleton" style={{ height: 200 }} />}>
        <SuKienInner />
      </Suspense>
    </PublicLayout>
  );
}
