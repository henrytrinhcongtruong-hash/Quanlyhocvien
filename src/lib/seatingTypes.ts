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
}

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
      });
    }
  }

  return slots;
}
