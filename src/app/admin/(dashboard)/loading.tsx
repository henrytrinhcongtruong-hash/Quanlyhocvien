"use client";

export default function Loading() {
  return (
    <div className="animate-fade-in" style={{ padding: 0 }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="skeleton" style={{ width: 280, height: 28, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "40%", height: 32, borderRadius: 8, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "80%", height: 6, borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <div className="skeleton" style={{ width: 200, height: 16, borderRadius: 6 }} />
        </div>
        <div style={{ padding: 16 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 44, marginBottom: 6, borderRadius: 8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
