// Tiện ích xuất PDF A4 cho Sơ đồ lớp — dùng chung cho trang Admin và trang học sinh.
// Xử lý riêng cho điện thoại: không phụ thuộc kích thước màn hình, giới hạn bộ nhớ canvas,
// dùng Web Share (lưu/gửi file) và có phương án dự phòng khi trình duyệt chặn tải xuống.

export type SeatingPdfResult = "shared" | "downloaded" | "opened" | "cancelled";

const BASE_WIDTH = 920;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
}

export async function exportSeatingChartPdf(
  element: HTMLElement,
  fileName: string,
  title = "Sơ đồ lớp"
): Promise<SeatingPdfResult> {
  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  const mobile = isMobileDevice();

  // Độ phân giải: giữ nét trên PC, giảm trên điện thoại để không hết bộ nhớ canvas
  const naturalHeight = element.scrollHeight || element.offsetHeight || 1400;
  const maxPixels = mobile ? 9_000_000 : 24_000_000;
  let scale = mobile ? 2 : 2.5;
  while (scale > 1 && BASE_WIDTH * scale * naturalHeight * scale > maxPixels) {
    scale -= 0.25;
  }

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: BASE_WIDTH,
    windowWidth: BASE_WIDTH + 40, // giả lập màn hình rộng để bố cục không bị co theo điện thoại
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      // Bỏ thu phóng + bỏ cắt (overflow) của các thẻ cha trong bản sao để chụp đủ toàn bộ sơ đồ
      const box = clonedDoc.getElementById("seating-chart-scale-box");
      if (box) {
        box.style.transform = "none";
        box.style.position = "relative";
        let parent = box.parentElement;
        while (parent && parent !== clonedDoc.body) {
          parent.style.overflow = "visible";
          parent.style.height = "auto";
          parent.style.maxWidth = "none";
          parent = parent.parentElement;
        }
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 4;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  // Giữ đúng tỷ lệ, vừa khít 1 trang A4 và căn giữa
  const canvasRatio = canvas.width / canvas.height;
  const pageRatio = maxW / maxH;
  const renderWidth = canvasRatio > pageRatio ? maxW : maxH * canvasRatio;
  const renderHeight = canvasRatio > pageRatio ? maxW / canvasRatio : maxH;
  const offsetX = margin + (maxW - renderWidth) / 2;
  const offsetY = margin + (maxH - renderHeight) / 2;

  pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight);

  const blob = pdf.output("blob") as Blob;

  // 1) Điện thoại: mở bảng chia sẻ/lưu file (hoạt động cả trong trình duyệt nhúng như Zalo/Facebook)
  if (mobile && typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (!nav.canShare || nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title });
        return "shared";
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // lỗi khác (hết quyền người dùng, không hỗ trợ file...) → thử cách tải xuống bên dưới
    }
  }

  const url = URL.createObjectURL(blob);

  // 2) iOS không tải được qua thẻ download → mở file PDF ở tab mới để xem/lưu
  if (isIOS()) {
    const win = window.open(url, "_blank");
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return "opened";
    }
  }

  // 3) Tải xuống trực tiếp (PC, Android)
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "downloaded";
  } catch {
    // 4) Phương án cuối: mở file trong tab mới
    window.open(url, "_blank");
    return "opened";
  }
}
