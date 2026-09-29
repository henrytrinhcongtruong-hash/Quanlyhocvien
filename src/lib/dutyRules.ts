// src/lib/dutyRules.ts
// Module quy định và tính toán phân công trực nhật thông minh

export function normalizeVN(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Kiểm tra xem một học sinh có thuộc diện ĐƯỢC MIỄN TRỰC NHẬT không.
 * Quy định nghiêm ngặt từ Ban Giám Hiệu & Quản Lý Lớp:
 * 1. Đặc biệt: Trịnh Công Trường
 * 2. Lớp trưởng
 * 3. Lớp phó
 * 4. Tổ trưởng (tất cả các tổ)
 * 5. Bí thư (nếu có)
 */
export function isStudentDutyExempt(student: {
  hoTen: string;
  ghiChu?: string | null;
  roleLabel?: string | null;
}): { exempt: boolean; reason?: string } {
  const nameNorm = normalizeVN(student.hoTen || "");

  // 1. Đặc biệt: Học sinh Trịnh Công Trường
  if (nameNorm.includes("trinh cong truong")) {
    return { exempt: true, reason: "Trịnh Công Trường (Miễn trực)" };
  }

  // 2. Kiểm tra ghi chú học sinh (Student.ghiChu)
  const noteNorm = student.ghiChu ? normalizeVN(student.ghiChu) : "";
  if (noteNorm.includes("lop truong")) {
    return { exempt: true, reason: "Lớp trưởng (Miễn trực)" };
  }
  if (noteNorm.includes("lop pho")) {
    return { exempt: true, reason: "Lớp phó (Miễn trực)" };
  }
  if (noteNorm.includes("to truong")) {
    return { exempt: true, reason: "Tổ trưởng (Miễn trực)" };
  }
  if (noteNorm.includes("bi thu")) {
    return { exempt: true, reason: "Bí thư (Miễn trực)" };
  }

  // 3. Kiểm tra vai trò tài khoản (User.roleLabel nếu có)
  const roleNorm = student.roleLabel ? normalizeVN(student.roleLabel) : "";
  if (roleNorm.includes("lop truong")) {
    return { exempt: true, reason: "Lớp trưởng (Miễn trực)" };
  }
  if (roleNorm.includes("lop pho")) {
    return { exempt: true, reason: "Lớp phó (Miễn trực)" };
  }
  if (roleNorm.includes("to truong")) {
    return { exempt: true, reason: "Tổ trưởng (Miễn trực)" };
  }

  return { exempt: false };
}

export const DUTY_WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];

export const THU_ORDER_MAP: Record<string, number> = {
  "Thứ 2": 2,
  "Thứ 3": 3,
  "Thứ 4": 4,
  "Thứ 5": 5,
  "Thứ 6": 6,
};

export interface DistributedDutyAssignment<T> {
  thu: string;
  thuOrder: number;
  student: T;
}

export interface DutyCalculationResult<T> {
  eligibleStudents: T[];
  exemptedStudents: Array<T & { reason: string }>;
  assignments: DistributedDutyAssignment<T>[];
  dayGroups: Record<string, T[]>;
  dailyCounts: Record<string, number>;
}

/**
 * Thuật toán phân công trực nhật công bằng & đều tua:
 * - Lọc bỏ 100% các bạn thuộc diện miễn trừ (Lớp trưởng, Lớp phó, Tổ trưởng, Trịnh Công Trường).
 * - Các thành viên còn lại trong tổ được phân chia đều tua cho 5 ngày học (Thứ 2 ➔ Thứ 6).
 * - Đảm bảo trong tuần đó AI CŨNG CÓ LƯỢT TRỰC (không bỏ sót bất kỳ ai).
 * - Số lượng học sinh mỗi ngày được cân bằng tối đa (chênh lệch giữa các ngày tối đa 1 bạn).
 */
export function calculateDutyDistribution<
  T extends {
    id: number;
    hoTen: string;
    ghiChu?: string | null;
    roleLabel?: string | null;
    gioiTinh?: string | null;
  }
>(
  allStudents: T[],
  days: string[] = DUTY_WEEKDAYS,
  slotsPerDay: number = 4,
  historyCountMap: Record<number, number> = {}
): DutyCalculationResult<T> {
  const eligibleStudents: T[] = [];
  const exemptedStudents: Array<T & { reason: string }> = [];

  for (const s of allStudents) {
    const check = isStudentDutyExempt(s);
    if (check.exempt) {
      exemptedStudents.push({ ...s, reason: check.reason || "Miễn trực nhật" });
    } else {
      eligibleStudents.push(s);
    }
  }

  const assignments: DistributedDutyAssignment<T>[] = [];
  const dayGroups: Record<string, T[]> = {};
  const dailyCounts: Record<string, number> = {};

  days.forEach((day) => {
    dayGroups[day] = [];
    dailyCounts[day] = 0;
  });

  if (eligibleStudents.length === 0) {
    return { eligibleStudents, exemptedStudents, assignments, dayGroups, dailyCounts };
  }

  const numDays = days.length;
  const targetPerDay = Math.max(1, slotsPerDay);

  const males = eligibleStudents.filter((s) => s.gioiTinh === "Nam");
  const females = eligibleStudents.filter((s) => s.gioiTinh !== "Nam");

  // Mục tiêu phân bổ Nam / Nữ mỗi ngày (ưu tiên 2 Nam + 2 Nữ nếu slotsPerDay=4)
  let targetMalePerDay = Math.floor(targetPerDay / 2);
  let targetFemalePerDay = targetPerDay - targetMalePerDay;

  if (males.length === 0) {
    targetMalePerDay = 0;
    targetFemalePerDay = targetPerDay;
  } else if (females.length === 0) {
    targetMalePerDay = targetPerDay;
    targetFemalePerDay = 0;
  } else if (males.length >= females.length * 2) {
    targetMalePerDay = Math.min(males.length, Math.ceil((targetPerDay * 3) / 4));
    targetFemalePerDay = targetPerDay - targetMalePerDay;
  } else if (females.length >= males.length * 2) {
    targetFemalePerDay = Math.min(females.length, Math.ceil((targetPerDay * 3) / 4));
    targetMalePerDay = targetPerDay - targetFemalePerDay;
  }

  const dayBuckets: T[][] = days.map(() => []);

  // Theo dõi số ca trong tuần này & ngày trực gần nhất của từng bạn
  const weekShifts: Record<number, number> = {};
  const lastAssignedDay: Record<number, number> = {};
  eligibleStudents.forEach((s) => {
    weekShifts[s.id] = 0;
    lastAssignedDay[s.id] = -99;
  });

  // Thuật toán chọn ứng viên tốt nhất:
  // 1. Bạn chưa có ca nào trong tuần này được ưu tiên hơn bạn đã có ca
  // 2. [CƠ CHẾ BÙ CA]: Bạn có tổng ca lịch sử ít hơn (từ các tuần trước) được ưu tiên xếp ca trước!
  // 3. Giãn cách: Không xếp 2 ngày liên tiếp
  function getBestCandidate(pool: T[], dayIndex: number): T | null {
    const available = pool.filter((s) => !dayBuckets[dayIndex].some((x) => x.id === s.id));
    if (available.length === 0) return null;

    available.sort((a, b) => {
      // Tiêu chí 1: Tuần này ai có ít ca hơn thì được xếp trước
      const aWeek = weekShifts[a.id] || 0;
      const bWeek = weekShifts[b.id] || 0;
      if (aWeek !== bWeek) return aWeek - bWeek;

      // Tiêu chí 2 (BÙ CA TÍCH LŨY): Bạn nào ở các tuần trước trực ít lần hơn thì được ưu tiên nhận ca trước!
      const aHist = historyCountMap[a.id] || 0;
      const bHist = historyCountMap[b.id] || 0;
      if (aHist !== bHist) return aHist - bHist;

      // Tiêu chí 3: Giãn cách xa ngày trực gần nhất
      const aDist = dayIndex - (lastAssignedDay[a.id] ?? -99);
      const bDist = dayIndex - (lastAssignedDay[b.id] ?? -99);
      return bDist - aDist;
    });

    return available[0];
  }

  // Bước 1: Phân bổ các bạn Nam theo mục tiêu từng ngày
  for (let d = 0; d < numDays; d++) {
    for (let m = 0; m < targetMalePerDay; m++) {
      if (males.length > 0 && dayBuckets[d].length < targetPerDay) {
        const candidate = getBestCandidate(males, d);
        if (candidate) {
          dayBuckets[d].push(candidate);
          weekShifts[candidate.id] = (weekShifts[candidate.id] || 0) + 1;
          lastAssignedDay[candidate.id] = d;
        }
      }
    }
  }

  // Bước 2: Phân bổ các bạn Nữ theo mục tiêu từng ngày
  for (let d = 0; d < numDays; d++) {
    for (let f = 0; f < targetFemalePerDay; f++) {
      if (females.length > 0 && dayBuckets[d].length < targetPerDay) {
        const candidate = getBestCandidate(females, d);
        if (candidate) {
          dayBuckets[d].push(candidate);
          weekShifts[candidate.id] = (weekShifts[candidate.id] || 0) + 1;
          lastAssignedDay[candidate.id] = d;
        }
      }
    }
  }

  // Bước 3: Lấp đầy các vị trí còn lại nếu còn chỗ trống
  const combined = [...males, ...females];
  for (let d = 0; d < numDays; d++) {
    while (dayBuckets[d].length < targetPerDay) {
      const candidate = getBestCandidate(combined, d);
      if (candidate) {
        dayBuckets[d].push(candidate);
        weekShifts[candidate.id] = (weekShifts[candidate.id] || 0) + 1;
        lastAssignedDay[candidate.id] = d;
      } else {
        break;
      }
    }
  }

  // Bước 4: Tổng hợp danh sách phân công
  days.forEach((thu, i) => {
    const thuOrder = THU_ORDER_MAP[thu] || i + 2;
    const bucket = dayBuckets[i];
    bucket.forEach((student) => {
      assignments.push({ thu, thuOrder, student });
      dayGroups[thu].push(student);
      dailyCounts[thu]++;
    });
  });

  return {
    eligibleStudents,
    exemptedStudents,
    assignments,
    dayGroups,
    dailyCounts,
  };
}
