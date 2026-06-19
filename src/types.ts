export interface AudioHotspot {
  id: string;
  x: number; // percentage coordinate (0-100) from left
  y: number; // percentage coordinate (0-100) from top
  audioData?: string; // Base64 pronunciation URL
  audioName?: string; // Helper description or filename
}

export interface MathOperation {
  id: string;
  expression: string;
  correctAnswer: number;
  options: number[];
}

export interface LessonItem {
  id: string;
  sentence: string; // The target sentence, e.g., "Mẹ mua quả bóng"
  lessonName?: string; // Tên bài học (mặc định Lesson 1 hoặc nhập thủ công)
  englishTranslation?: string; // Quick reference if needed
  type: 'word' | 'sentence' | 'math';
  topic: string; // e.g., "động vật", "gia đình"
  scrambledWords: string[]; // Scrambled tokens, e.g., ["quả bóng", "Mẹ", "mua"]
  difficulty: 'dễ' | 'trung bình' | 'khó';
  emoji: string; // Engaging visual indicator (e.g., "⚽", "🐱")
  guideVoiceText?: string; // Text to feed Web Speech TTS
  phoneticsGuide?: string; // Chữ có dấu thế nào để hướng dẫn phát âm cho bé
  funFact?: string; // Fun quick explanation for kids
  question?: string; // Dynamic target question if any, e.g. "Con tên gì?"
  customImage?: string; // Base64 data URL for illustration image uploaded by parents/teachers
  customAudio?: string; // Base64 data URL for teacher's custom voice/pronunciation
  audioHotspots?: AudioHotspot[]; // Custom multi-point audio hot-spots overlayed on illustration image
  mathOperations?: MathOperation[];
}

export interface Topic {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind background style (e.g., "from-pink-400 to-rose-400")
  borderColor: string;
  description: string;
  emoji: string;
  items: LessonItem[];
  isSpelling?: boolean;
  isMath?: boolean;
}

export interface UserStats {
  streak: number;
  stars: number;
  coins: number;
  lastActiveDate: string;
  completedIds: string[];
}

export interface SpeechAnalysisResult {
  confidence: number;
  transcript: string;
  isCorrect: boolean;
  score: number; // 0 to 100
  matchedWords: string[]; // which words were spoken correctly
  missingWords: string[]; // which words were missed or mispronounced
  aiFeedback?: string; // Child-friendly encouraging feedback
}
