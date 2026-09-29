/**
 * Quiz Smart Parser & Shuffler
 * Chuyển đổi văn bản đề thi (Word / PDF / Text) thành danh sách câu hỏi có cấu trúc
 */

export interface ParsedQuestion {
  content: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

export function parseRawExamText(rawText: string): ParsedQuestion[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Tách văn bản dựa theo các dấu mốc "Câu 1:", "Câu 2.", "Question 1:", etc.
  const questionSplitter = /(?=(?:^|\n)\s*(?:Câu|Bài|Question)\s*\d+[\.\:\-\s])/gi;
  const rawBlocks = text.split(questionSplitter).map((b) => b.trim()).filter(Boolean);

  const results: ParsedQuestion[] = [];

  for (const block of rawBlocks) {
    const q = parseSingleQuestionBlock(block);
    if (q) results.push(q);
  }

  return results;
}

function parseSingleQuestionBlock(block: string): ParsedQuestion | null {
  if (!block || block.length < 5) return null;

  // 1. Tìm phần giải thích / hướng dẫn giải (nếu có)
  let explanation = "";
  const explMatch = block.match(/(?:Lời giải|Hướng dẫn giải|Giải thích|HDG|Explanation)\s*[\:\-]\s*([\s\S]*?)(?=(?:Đáp án|Chọn|\n\s*ĐA|\n\s*KEY)|$)/i);
  if (explMatch) {
    explanation = explMatch[1].trim();
  }

  // 2. Tìm đáp án đúng (VD: "Đáp án: A", "Chọn B", "ĐA: C", "Key: D")
  let correctAnswer = "";
  const ansMatch = block.match(/(?:Đáp án|Chọn|ĐA|Key|Answer)\s*[\:\-\s]\s*([A-D])/i);
  if (ansMatch) {
    correctAnswer = ansMatch[1].toUpperCase();
  }

  // 3. Phân tách các phương án A, B, C, D
  // Thử match cả 4 phương án A, B, C, D
  const optionRegex = /(?:^|\n|\s{2,})([A-D])[\.\:\)]\s*([\s\S]*?)(?=(?:(?:^|\n|\s{2,})[A-D][\.\:\)]|\n\s*(?:Lời giải|Hướng dẫn|Đáp án|Chọn)|$))/gi;
  
  const optionsMap: Record<string, string> = {};
  let match;
  while ((match = optionRegex.exec(block)) !== null) {
    const letter = match[1].toUpperCase();
    const content = match[2].trim();
    if (content && !optionsMap[letter]) {
      optionsMap[letter] = content;
    }
  }

  const letters = ["A", "B", "C", "D"];
  const hasOptions = letters.every((l) => !!optionsMap[l]) || Object.keys(optionsMap).length >= 2;

  let content = "";
  const options: string[] = [];

  if (hasOptions) {
    // Nội dung câu hỏi là phần trước chữ A.
    const firstOptIndex = block.search(/(?:^|\n|\s{2,})[A-D][\.\:\)]/i);
    if (firstOptIndex > 0) {
      content = block.substring(0, firstOptIndex).trim();
    } else {
      content = block.split("\n")[0].trim();
    }

    // Làm sạch tiền tố "Câu 1:", "Câu 1." trong nội dung
    content = content.replace(/^(?:Câu|Bài|Question)\s*\d+[\.\:\-\s]*/i, "").trim();

    // Thu thập các options theo thứ tự A, B, C, D
    for (const l of letters) {
      if (optionsMap[l]) {
        options.push(`${l}. ${optionsMap[l]}`);
      }
    }
  } else {
    // Không có A, B, C, D rõ ràng: câu hỏi dạng ngắn hoặc tự luận
    content = block
      .replace(/^(?:Câu|Bài|Question)\s*\d+[\.\:\-\s]*/i, "")
      .replace(/(?:Lời giải|Đáp án|Chọn)[\s\S]*$/i, "")
      .trim();
  }

  if (!content) return null;

  return {
    content,
    type: options.length >= 2 ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
    options,
    correctAnswer: correctAnswer || "A",
    explanation: explanation || undefined,
  };
}

/**
 * Xáo trộn ngẫu nhiên thứ tự các câu hỏi và phương án A-B-C-D
 */
export function shuffleExamQuestions<T extends { content: string; options: string[]; correctAnswer: string }>(
  questions: T[],
  options: { shuffleQ?: boolean; shuffleOpt?: boolean } = { shuffleQ: true, shuffleOpt: true }
): T[] {
  let list = JSON.parse(JSON.stringify(questions)) as T[];

  if (options.shuffleQ) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
  }

  if (options.shuffleOpt) {
    list.forEach((q) => {
      if (Array.isArray(q.options) && q.options.length > 1) {
        const origCorrectLetter = (q.correctAnswer || "A").toUpperCase().trim();
        let correctContent = "";

        const parsedOpts = q.options.map((opt) => {
          const m = opt.match(/^([A-D])[\.\:\)]\s*(.*)$/i);
          const letter = m ? m[1].toUpperCase() : "";
          const text = m ? m[2] : opt;
          if (letter === origCorrectLetter) correctContent = text;
          return { letter, text };
        });

        // Xáo trộn phương án
        for (let i = parsedOpts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [parsedOpts[i], parsedOpts[j]] = [parsedOpts[j], parsedOpts[i]];
        }

        // Đánh lại A, B, C, D và cập nhật correctAnswer
        const newLetters = ["A", "B", "C", "D", "E", "F"];
        const newOptions: string[] = [];
        let newCorrectLetter = origCorrectLetter;

        parsedOpts.forEach((item, idx) => {
          const l = newLetters[idx] || "A";
          newOptions.push(`${l}. ${item.text}`);
          if (item.text === correctContent) {
            newCorrectLetter = l;
          }
        });

        q.options = newOptions;
        q.correctAnswer = newCorrectLetter;
      }
    });
  }

  return list;
}
