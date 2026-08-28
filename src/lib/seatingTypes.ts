// src/lib/seatingTypes.ts

export interface SeatSlotData {
  id: string; // "slot-r1-c1"
  row: number; // 1-7
  col: number; // 1-8 (1-4: Dãy Trái, 5-8: Dãy Phải)
  block: "left" | "right"; // Dãy Trái hay Dãy Phải
  studentId?: number | null;
  studentName?: string | null;
  studentPhoto?: string | null;
  gender?: string | null;
  to?: number | null; // Tổ 1 - 4
}

// Helper lấy Tổ dựa theo Cột ghế (Cột 1,2 = Tổ 1; Cột 3,4 = Tổ 2; Cột 5,6 = Tổ 3; Cột 7,8 = Tổ 4)
export function getSlotTo(col: number): number {
  if (col <= 2) return 1;
  if (col <= 4) return 2;
  if (col <= 6) return 3;
  return 4;
}

export const TO_THEMES: Record<
  number,
  { name: string; bg: string; text: string; border: string; glow: string; badgeBg: string }
> = {
  1: { name: "Tổ 1", bg: "#e0f2fe", text: "#0369a1", border: "#38bdf8", glow: "rgba(2, 132, 199, 0.35)", badgeBg: "#0284c7" },
  2: { name: "Tổ 2", bg: "#dcfce7", text: "#15803d", border: "#4ade80", glow: "rgba(22, 163, 74, 0.35)", badgeBg: "#16a34a" },
  3: { name: "Tổ 3", bg: "#fef3c7", text: "#b45309", border: "#fcd34d", glow: "rgba(217, 119, 6, 0.35)", badgeBg: "#d97706" },
  4: { name: "Tổ 4", bg: "#f3e8ff", text: "#7e22ce", border: "#c084fc", glow: "rgba(147, 51, 234, 0.35)", badgeBg: "#9333ea" },
};

// 56 slots trống hoàn toàn (2 dãy đều 7 hàng x 4 cột = 28 chỗ mỗi dãy)
export function generateEmptySlots(): SeatSlotData[] {
  const slots: SeatSlotData[] = [];

  for (let r = 1; r <= 7; r++) {
    // Dãy Trái (Cột 1 -> 4)
    for (let c = 1; c <= 4; c++) {
      slots.push({
        id: `slot-r${r}-c${c}`,
        row: r,
        col: c,
        block: "left",
        studentName: null,
        studentPhoto: null,
        to: getSlotTo(c),
      });
    }

    // Dãy Phải (Cột 5 -> 8)
    for (let c = 5; c <= 8; c++) {
      slots.push({
        id: `slot-r${r}-c${c}`,
        row: r,
        col: c,
        block: "right",
        studentName: null,
        studentPhoto: null,
        to: getSlotTo(c),
      });
    }
  }

  return slots;
}

