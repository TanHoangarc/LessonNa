import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header per guidelines
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

const ai = getGeminiClient();

// API 1: Review/Analyze kid's pronunciation & sentence ordering
app.post('/api/speech-review', async (req, res) => {
  const { targetSentence, spokenTranscript } = req.body;

  if (!targetSentence) {
    return res.status(400).json({ error: 'targetSentence is required' });
  }

  // If there's no spoke text, or it's empty, handle cleanly
  if (!spokenTranscript || spokenTranscript.trim() === "") {
    return res.json({
      isCorrect: false,
      score: 0,
      matchedWords: [],
      missingWords: targetSentence.split(' '),
      aiFeedback: "Bé ơi, Cô Chích Chòe chưa nghe thấy giọng của bé nè! Bé hãy nhấn giữ chiếc mic hồng xinh xắn rồi đọc to rành mạch câu trên nhé! 🌸"
    });
  }

  try {
    const prompt = `
Hãy đóng vai là Cô Chích Chòe - một cô giáo mầm non dạy tiếng Việt vô cùng hiền dịu, ngọt ngào, ấm áp và yêu trẻ con. Cô đang dạy các bé từ 4 đến 6 tuổi phát âm chuẩn và sắp xếp câu từ đúng trật tự tiếng Việt để không bị ngược câu.

Hãy phân tích và đánh giá giọng đọc của bé sau đây:
- Câu mẫu chuẩn (Target Sentence): "${targetSentence}"
- Bé đã nói (Spoken Transcript): "${spokenTranscript}"

Hãy đánh giá và đưa ra phản hồi bằng tiếng Việt thân thiện nhất cho trẻ, sử dụng nhiều biểu tượng cảm xúc dễ thương (như 🌸, 🐥, ❤️, ⭐).
Nếu bé phát âm sai hoặc ngược trật tự câu (ví dụ: đáng lẽ nói "Bé ăn dưa hấu" thì nói "Dưa hấu ăn bé" hoặc "Bé dưa hấu ăn"), cô hãy sửa lại một cách dí dỏm, ngộ nghĩnh và bày cho bé cách đọc đúng dễ nhớ.
Tránh các thuật ngữ ngữ pháp phức tạp như Chủ ngữ, Vị ngữ, S-V-O. Hãy dùng những ví dụ thực tế vui tươi cho bé dễ hiểu (ví dụ: "Giống như con mèo trèo cây, chứ cây không trèo con mèo được đâu con yêu nhỉ!").

Hãy trả về kết quả dưới định dạng JSON có cấu trúc như sau:
{
  "isCorrect": boolean (true nếu bé đọc chính xác hoặc đạt trên 80% từ đúng trật tự),
  "score": number (từ 0 đến 100 biểu đạt mức độ phát âm/sắp xếp đúng),
  "matchedWords": array of strings (những từ bé phát âm tốt, đúng vị trí),
  "missingWords": array of strings (những từ bé thiếu hoặc đảo ngược cần sửa),
  "reversedSentenceWarning": boolean (true nếu bé bị lỗi đảo ngược câu / ngược từ vựng),
  "encouragingFeedback": "Lời nhận xét ấm áp của Cô Chích Chòe cho bé đọc"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['isCorrect', 'score', 'matchedWords', 'missingWords', 'reversedSentenceWarning', 'encouragingFeedback'],
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            matchedWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            missingWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            reversedSentenceWarning: { type: Type.BOOLEAN },
            encouragingFeedback: { type: Type.STRING }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Speech Review Error:", error);
    // Fallback comparison logic so the app is 100% resilient
    const targetNorm = targetSentence.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    const spokenNorm = spokenTranscript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();

    const targetWords = targetNorm.split(/\s+/);
    const spokenWords = spokenNorm.split(/\s+/);

    const matchedWords = targetWords.filter(w => spokenWords.includes(w));
    const missingWords = targetWords.filter(w => !spokenWords.includes(w));
    const ratio = matchedWords.length / targetWords.length;
    const isCorrect = ratio >= 0.75;
    const score = Math.round(ratio * 100);

    return res.json({
      isCorrect,
      score,
      matchedWords,
      missingWords,
      reversedSentenceWarning: spokenWords.length > 1 && spokenWords[0] === targetWords[targetWords.length - 1],
      encouragingFeedback: `Bé giỏi quá! Bé đã nói được chiếc câu thật dễ thương nè. Cô Chích Chòe khen con đã cố gắng đọc to rành mạch nha! ❤️ Tuyệt vời! ✨`
    });
  }
});

// API 2: Generate custom kid sentence & scrambled cards on arbitrary topics (e.g. Dinosaurs, space, toys, fish)
app.post('/api/generate-custom-lesson', async (req, res) => {
  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'userPrompt is required' });
  }

  try {
    const prompt = `
Hãy tạo ra một câu tiếng Việt cực kỳ vui tươi, dễ thương, bổ ích dành cho trẻ nhỏ tuổi từ 4 đến 6 tuổi, phù hợp với chủ đề sau: "${userPrompt}".
Câu tiếng Việt phải chuẩn ngữ pháp, mộc mạc, miêu tả một thói quen tốt hoặc một sự thật đáng yêu dễ hiểu cho bé mầm non, chiều dài câu khoảng từ 3 đến 6 từ.

Chúng ta muốn dạy bé cấu trúc nói không đảo ngược từ (Ví dụ: "Bạn khủng long ăn lá" chứ không nói "Ăn lá bạn khủng long").

LƯU Ý QUAN TRỌNG: Không có bất kỳ yếu tố tiếng Anh nào ở đây. Toàn bộ nội dung câu, giải thích và từ vựng đều là tiếng Việt chuẩn.

Hãy trả về kết quả dưới định dạng JSON có cấu trúc chính xác sau:
{
  "sentence": "Câu tiếng Việt tự nhiên đầy đủ (ví dụ: 'Chú khủng long ăn lá')",
  "question": "Câu hỏi dẫn dắt tương ứng của bài học này (ví dụ: 'Chú khủng long ăn gì?')",
  "englishTranslation": "Để trống giá trị này '' (không ghi gì cả)",
  "scrambledWords": ["Chú", "khủng", "long", "ăn", "lá"] làm sao để tách rời hoàn toàn từng từ đơn lẻ một (Single-word tokens) và xáo trộn vị trí của bé. Nghiêm cấm gộp cụm từ, hãy luôn luôn tách rời chi tiết từng từ một,
  "emoji": "Một emoji sinh động liên quan nhất (ví dụ: '🦕')",
  "phoneticsGuide": "Phiên âm dễ thương bằng tiếng Việt để hướng dẫn bé phát âm rành mạch chuẩn giọng",
  "funFact": "Một sự thật ngộ nghĩnh ngắn gọn bằng tiếng Việt cho bé về chủ đề này (ví dụ: 'Khủng long cổ dài ăn cỏ rất là hiền lành nha!')"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['sentence', 'question', 'englishTranslation', 'scrambledWords', 'emoji', 'phoneticsGuide', 'funFact'],
          properties: {
            sentence: { type: Type.STRING },
            question: { type: Type.STRING },
            englishTranslation: { type: Type.STRING },
            scrambledWords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            emoji: { type: Type.STRING },
            phoneticsGuide: { type: Type.STRING },
            funFact: { type: Type.STRING }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Lesson Gen Error:", error);
    // Safe fallbacks for popular kid topics when custom prompt fails
    return res.json({
      sentence: "Bạn khủng long ăn cỏ",
      question: "Bạn khủng long ăn gì?",
      englishTranslation: "",
      scrambledWords: ["Bạn", "khủng", "long", "ăn", "cỏ"],
      emoji: "🦕",
      phoneticsGuide: "bạn / khủng / lon / ăn / cỏ",
      funFact: "Bạn khủng long cổ dài ăn cỏ rất hiền lành và dẻo dai đấy nha bé!"
    });
  }
});

// Setup Vite dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("🛠️ Running in development mode with Vite HMR middleware.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("🚀 Running in production mode, serving built assets.");
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ BÉ HỌC TIẾNG VIỆT server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
