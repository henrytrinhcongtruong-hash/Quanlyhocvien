// scripts/seed_sample_quizzes.js - Khởi tạo các bộ đề thi mẫu chất lượng cao
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Khởi tạo bộ đề thi trắc nghiệm mẫu...");

  // Kiểm tra xem đã có đề thi nào chưa
  const existingCount = await prisma.quizSet.count();
  if (existingCount > 0) {
    console.log(`Đã có ${existingCount} bộ đề trong hệ thống. Bỏ qua seed.`);
    return;
  }

  // 1. Đề thi Toán học
  await prisma.quizSet.create({
    data: {
      title: "Đề Khảo Sát Kiến Thức Môn Toán Học - Lớp 12",
      subject: "Toán Học",
      grade: "12",
      lop: "ALL",
      duration: 45,
      description: "Đề ôn tập tổng hợp trắc nghiệm Hàm số, Tích phân và Hình học không gian Oxyz.",
      shuffleQuestions: true,
      shuffleOptions: true,
      isActive: true,
      questions: {
        create: [
          {
            content: "Cho hàm số y = f(x) có bảng biến thiên với f'(x) đổi dấu từ dương sang âm khi qua x = 2. Điểm x = 2 là:",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. Điểm cực đại của hàm số",
              "B. Điểm cực tiểu của hàm số",
              "C. Điểm uốn của đồ thị",
              "D. Giá trị lớn nhất của hàm số"
            ]),
            correctAnswer: "A",
            explanation: "Theo định lý dấu của đạo hàm cấp một: Nếu f'(x) đổi dấu từ dương (+) sang âm (-) khi qua x0 thì x0 là điểm cực đại của hàm số.",
            orderIndex: 0
          },
          {
            content: "Nguyên hàm của hàm số f(x) = 2x + cos(x) là:",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. x² + sin(x) + C",
              "B. x² - sin(x) + C",
              "C. 2 + sin(x) + C",
              "D. x² + cos(x) + C"
            ]),
            correctAnswer: "A",
            explanation: "Ta có ∫(2x + cos x)dx = x² + sin x + C vì đạo hàm của (x² + sin x)' = 2x + cos x.",
            orderIndex: 1
          },
          {
            content: "Trong không gian Oxyz, cho mặt cầu (S): (x - 1)² + (y + 2)² + (z - 3)² = 16. Bán kính R của mặt cầu bằng:",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. R = 4",
              "B. R = 16",
              "C. R = 8",
              "D. R = 2"
            ]),
            correctAnswer: "A",
            explanation: "Phương trình mặt cầu có dạng (x-a)² + (y-b)² + (z-c)² = R². Với R² = 16 => R = √16 = 4.",
            orderIndex: 2
          },
          {
            content: "Tập nghiệm của bất phương trình log₂(x - 1) < 3 là:",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. (1; 9)",
              "B. (-∞; 9)",
              "C. (1; 8)",
              "D. (0; 9)"
            ]),
            correctAnswer: "A",
            explanation: "Điều kiện: x - 1 > 0 <=> x > 1. BPT tương đương: x - 1 < 2³ = 8 <=> x < 9. Kết hợp điều kiện ta được 1 < x < 9.",
            orderIndex: 3
          }
        ]
      }
    }
  });

  // 2. Đề thi Tiếng Anh
  await prisma.quizSet.create({
    data: {
      title: "Đề Ôn Luyện Tiếng Anh - Ngữ Pháp & Từ Vựng Cốt Lõi",
      subject: "Tiếng Anh",
      grade: "12",
      lop: "ALL",
      duration: 30,
      description: "Luyện tập thì của động từ, câu điều kiện, giới từ và cụm từ thông dụng.",
      shuffleQuestions: true,
      shuffleOptions: true,
      isActive: true,
      questions: {
        create: [
          {
            content: "If we _____ earlier, we wouldn't have missed the beginning of the concert.",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. had left",
              "B. left",
              "C. have left",
              "D. would leave"
            ]),
            correctAnswer: "A",
            explanation: "Câu điều kiện loại 3 diễn tả sự việc trái với thực tế trong quá khứ: Mệnh đề If dùng thì Quá khứ hoàn thành (had + V3/ed).",
            orderIndex: 0
          },
          {
            content: "She is very interested _____ learning new languages and exploring different cultures.",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. in",
              "B. on",
              "C. at",
              "D. with"
            ]),
            correctAnswer: "A",
            explanation: "Cấu trúc quen thuộc: be interested in something / doing something (thích thú, quan tâm đến cái gì).",
            orderIndex: 1
          },
          {
            content: "By the time we arrive at the station, the train _____ already.",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. will have departed",
              "B. has departed",
              "C. was departing",
              "D. had departed"
            ]),
            correctAnswer: "A",
            explanation: "Cấu trúc tương lai hoàn thành: By the time + hiện tại đơn (arrive), mệnh đề chính dùng thì Tương lai hoàn thành (will have + V3/ed).",
            orderIndex: 2
          }
        ]
      }
    }
  });

  // 3. Đề thi Vật Lý
  await prisma.quizSet.create({
    data: {
      title: "Kiểm Tra Trắc Nghiệm Vật Lý - Dao Động & Sóng Cơ",
      subject: "Vật Lý",
      grade: "12",
      lop: "ALL",
      duration: 45,
      description: "Đề kiểm tra trắc nghiệm chương Dao động điều hòa và Sóng cơ học.",
      shuffleQuestions: true,
      shuffleOptions: true,
      isActive: true,
      questions: {
        create: [
          {
            content: "Một vật dao động điều hòa với phương trình x = A*cos(ωt + φ). Vận tốc của vật có độ lớn cực đại khi vật ở vị trí nào?",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. Vị trí cân bằng",
              "B. Vị trí biên dương",
              "C. Vị trí biên âm",
              "D. Vị trí có li độ x = A/2"
            ]),
            correctAnswer: "A",
            explanation: "Vận tốc trong dao động điều hòa đạt cực đại khi qua vị trí cân bằng: vmax = ωA.",
            orderIndex: 0
          },
          {
            content: "Sóng cơ học KHÔNG truyền được trong môi trường nào sau đây?",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify([
              "A. Chân không",
              "B. Chất rắn",
              "C. Chất lỏng",
              "D. Chất khí"
            ]),
            correctAnswer: "A",
            explanation: "Sóng cơ học cần các phần tử môi trường vật chất đàn hồi để lan truyền dao động, do đó sóng cơ không truyền được trong chân không.",
            orderIndex: 1
          }
        ]
      }
    }
  });

  console.log("✅ Đã tạo thành công 3 bộ đề mẫu cho Toán, Tiếng Anh và Vật Lý!");
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
