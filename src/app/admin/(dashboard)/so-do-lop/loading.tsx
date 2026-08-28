"use client";

export default function SeatingLoading() {
  return (
    <div className="animate-fade-in">
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 260, height: 26, borderRadius: 8 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 8 }} />
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 18, display: "flex", gap: 12 }}>
        <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
      </div>

      {/* Seating grid skeleton */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 12, maxWidth: 900, margin: "0 auto" }}>
          {[...Array(56)].map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div className="skeleton" style={{ width: 80, height: 90, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
