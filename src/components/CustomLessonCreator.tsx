import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Wand2, Plus, Upload, Trash2, 
  Volume2, Music, Image as ImageIcon, Check, Info, Mic, Square, Play, Pause, AlertCircle, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSoundEffect, playVietnameseText } from '../utils/audioHelper';
import { LessonItem } from '../types';

interface CustomLessonCreatorProps {
  onBackToDashboard: () => void;
  onLessonCreated: (customItem: LessonItem) => void;
}

type ModeType = 'select-mode' | 'ai-prompt' | 'manual-form' | 'configure';

export default function CustomLessonCreator({
  onBackToDashboard,
  onLessonCreated
}: CustomLessonCreatorProps) {
  // Navigation steps inside creator: 'select-mode' | 'ai-prompt' | 'manual-form' | 'configure'
  const [step, setStep] = useState<ModeType>('select-mode');
  
  // AI topic input
  const [topicInput, setTopicInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Lesson configuration fields
  const [sentence, setSentence] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [phonetics, setPhonetics] = useState<string>('');
  const [funFact, setFunFact] = useState<string>('');
  const [emoji, setEmoji] = useState<string>('⭐');
  const [difficulty, setDifficulty] = useState<'dễ' | 'trung bình' | 'khó'>('trung bình');
  const [topicName, setTopicName] = useState<string>('Bài học tự chọn');

  // Custom visual & audio assets saved as base64 strings
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string | null>(null);
  const [customAudio, setCustomAudio] = useState<string | null>(null);
  const [customAudioName, setCustomAudioName] = useState<string | null>(null);

  // Audio testing states
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState<boolean>(false);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(null);

  // Teacher Microphone recording states
  const [isRecordingTutor, setIsRecordingTutor] = useState<boolean>(false);
  const [recDuration, setRecDuration] = useState<number>(0);
  const [tutorMicStream, setTutorMicStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recIntervalRef = useRef<any>(null);

  // Suggested keywords kids love
  const SUGGESTIONS = [
    { text: 'Chú Khủng Long', emoji: '🦕' },
    { text: 'Tên Lửa Bay Vào Vũ Trụ', emoji: '🚀' },
    { text: 'Con Chó Corgi Chạy Bộ', emoji: '🐕' },
    { text: 'Con Bạch Tuộc Dưới Biển', emoji: '🐙' },
    { text: 'Rửa Tay Sạch Trước Ăn', emoji: '🧼' },
    { text: 'Bảo Vệ Hành Tinh Xanh', emoji: '🌍' }
  ];

  // Drag and drop states for illustration and teacher audio file fields
  const [isImgDragging, setIsImgDragging] = useState<boolean>(false);
  const [isAudioDragging, setIsAudioDragging] = useState<boolean>(false);

  // Clean recording triggers on unmount
  useEffect(() => {
    return () => {
      if (tutorMicStream) {
        tutorMicStream.getTracks().forEach(track => track.stop());
      }
      if (recIntervalRef.current) {
        clearInterval(recIntervalRef.current);
      }
    };
  }, [tutorMicStream]);

  const handleSelectSuggestion = (text: string) => {
    playSoundEffect('click');
    setTopicInput(text);
  };

  // Convert files to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle Image upload or drop
  const processImageFile = async (file: File) => {
    // Only accept image files
    if (!file.type.startsWith('image/')) {
      alert("Ầy gụ! Vui lòng chọn tệp hình ảnh (.png, .jpg, .jpg, .webp, .gif) nha ba mẹ!");
      return;
    }
    // Safeguard filesize
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Kích thước tệp quá lớn! Vui lòng chọn ảnh nhỏ hơn 1.5 MB để ứng dụng lưu trữ và học tập siêu mượt nhé.");
      return;
    }

    try {
      const base64Str = await fileToBase64(file);
      setCustomImage(base64Str);
      setCustomImageName(file.name);
      playSoundEffect('success');
    } catch (e) {
      console.error("Image base64 conversion failed", e);
    }
  };

  // Handle Drag & Drop image events
  const handleImgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsImgDragging(true);
  };

  const handleImgDragLeave = () => {
    setIsImgDragging(false);
  };

  const handleImgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsImgDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Audio file upload or drop
  const processAudioFile = async (file: File) => {
    // Only accept audio files
    if (!file.type.startsWith('audio/')) {
      alert("Ầy gụ! Vui lòng chọn tệp âm thanh (.mp3, .wav, .m4a, .webm) chuẩn nha ba mẹ!");
      return;
    }
    // Safeguard filesize
    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước tệp âm thanh lớn! Hãy dùng đoạn phát âm mẫu ngắn dưới 2 MB (khoảng 3-6 từ) để tối ưu dung lượng học nha.");
      return;
    }

    try {
      const base64Str = await fileToBase64(file);
      setCustomAudio(base64Str);
      setCustomAudioName(file.name);
      playSoundEffect('success');
    } catch (e) {
      console.error("Audio base64 conversion failed", e);
    }
  };

  const handleAudioDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAudioDragging(true);
  };

  const handleAudioDragLeave = () => {
    setIsAudioDragging(false);
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsAudioDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAudioFile(e.dataTransfer.files[0]);
    }
  };

  // Start micro recording
  const startTutorRecording = async () => {
    playSoundEffect('click');
    setAudioChunks([]);
    setRecDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setTutorMicStream(stream);

      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: '' }; // Fallback
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        // Collect chunks and convert
        const collectedChunks = audioChunksRefCurrentHack || audioChunks;
        const mimeType = options.mimeType || 'audio/webm';
        const audioBlob = new Blob(collectedChunks, { type: mimeType });
        
        // Convert blob to Base64 Url to store
        try {
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
          });
          setCustomAudio(base64Str);
          setCustomAudioName(`Giọng nói Thầy Cô ghi âm lúc ${new Date().toLocaleTimeString('vi-VN')}`);
          playSoundEffect('victory');
        } catch (e) {
          console.error("Failed to base64-record recording", e);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      // Keep a shadow reference hack for fast async closure retrieval
      let recordedSoFar: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedSoFar.push(event.data);
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      (mediaRecorderRef as any).current._recordedChunks = recordedSoFar;

      recorder.start(250); // fire dataavailable events every 250ms
      setIsRecordingTutor(true);

      // Start duration elapsed interval
      recIntervalRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Recording authorization blocked:", err);
      alert("Thầy cô ơi, trình duyệt đang khóa quyền dùng micro rồi ạ. Hãy nhấn Cho phép sử dụng micro để ghi âm giọng nói chuẩn nhé!");
    }
  };

  // Shadow reference reader
  const audioChunksRefCurrentHack = mediaRecorderRef.current ? (mediaRecorderRef.current as any)._recordedChunks : null;

  // Stop micro recording
  const stopTutorRecording = () => {
    if (!isRecordingTutor || !mediaRecorderRef.current) return;
    
    if (recIntervalRef.current) {
      clearInterval(recIntervalRef.current);
    }

    mediaRecorderRef.current.stop();
    setIsRecordingTutor(false);
    playSoundEffect('pop');
  };

  // Trigger test-playback of loaded custom audio
  const handlePlayTestAudio = () => {
    if (!customAudio) return;
    
    if (isPlayingTestAudio && testAudioObj) {
      testAudioObj.pause();
      setIsPlayingTestAudio(false);
      return;
    }

    playSoundEffect('click');
    const audio = new Audio(customAudio);
    setTestAudioObj(audio);
    setIsPlayingTestAudio(true);

    audio.onended = () => {
      setIsPlayingTestAudio(false);
    };
    audio.onerror = () => {
      setIsPlayingTestAudio(false);
      alert("Không thể phát thử đoạn âm thanh. Vui lòng tải file định dạng khác nhé!");
    };
    audio.play().catch(e => {
      console.error(e);
      setIsPlayingTestAudio(false);
    });
  };

  // AI-powered automated pre-fills
  const handleGenerateAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsGenerating(true);
    setErrorText(null);
    playSoundEffect('click');

    try {
      const response = await fetch('/api/generate-custom-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: topicInput.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to generate custom lesson from server.");
      }

      const data = await response.json();
      
      // Load generated elements directly into form configurations
      setSentence(data.sentence || '');
      setQuestion(data.question || '');
      setPhonetics(data.phoneticsGuide || '');
      setFunFact(data.funFact || 'Rút chữ đúng chuẩn rèn luyện từ siêu vui!');
      setEmoji(data.emoji || '✨');
      setTopicName(topicInput.trim());
      setDifficulty('trung bình');
      setCustomImage(null);
      setCustomImageName(null);
      setCustomAudio(null);
      setCustomAudioName(null);

      playSoundEffect('victory');
      setStep('configure');
    } catch (err: any) {
      console.error("Generator custom lesson error:", err);
      setErrorText("Ầy gụ! Không thể kết nối với thần chú của Cô Chích Chòe rồi. Ba mẹ/Thầy cô hãy kiểm tra lại mạng hoặc thử chủ đề khác nhé! 🥰");
    } finally {
      setIsGenerating(false);
    }
  };

  // Fully manual empty pre-fills
  const handleStartManual = () => {
    playSoundEffect('click');
    setSentence('');
    setQuestion('');
    setPhonetics('');
    setFunFact('');
    setEmoji('📝');
    setTopicName('Bài học tự soạn');
    setDifficulty('dễ');
    setCustomImage(null);
    setCustomImageName(null);
    setCustomAudio(null);
    setCustomAudioName(null);
    setStep('configure');
  };

  // Publish / Fire game created
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sentence.trim()) {
      alert("Vui lòng nhập câu tiếng Việt hoàn chỉnh để bé sắp xếp nhé!");
      return;
    }

    // Scramble logic: split into individual word tokens
    const words = sentence
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(Boolean);

    if (words.length === 0) {
      alert("Câu luyện tập không hợp lệ!");
      return;
    }

    // Scramble them and guarantee some changes in indexes
    let scrambled = [...words];
    let attempts = 0;
    while (attempts < 10 && words.length > 1) {
      scrambled = scrambled.sort(() => Math.random() - 0.5);
      if (scrambled.join(' ').toLowerCase() !== words.join(' ').toLowerCase()) {
        break;
      }
      attempts++;
    }

    const compiledItem: LessonItem = {
      id: `custom-${Date.now()}`,
      sentence: sentence.trim(),
      question: question.trim() || undefined,
      type: 'sentence',
      topic: 'custom-topic',
      scrambledWords: scrambled,
      difficulty,
      emoji: emoji.trim() || '⭐️',
      guideVoiceText: sentence.trim(),
      phoneticsGuide: phonetics.trim() || undefined,
      funFact: funFact.trim() || "Thầy Cô/Ba Mẹ đã thiết kế bài học bổ ích cho bé yêu!",
      customImage: customImage || undefined,
      customAudio: customAudio || undefined
    };

    playSoundEffect('success');
    onLessonCreated(compiledItem);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2" id="custom-lesson-builder-container">
      
      {/* Back button */}
      <button
        onClick={onBackToDashboard}
        className="flex items-center gap-1.5 text-xs font-black text-indigo-700 hover:text-indigo-800 bg-white border-2 border-indigo-200 border-b-4 border-b-indigo-400 px-4 py-2.5 rounded-xl transition-all mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 stroke-[3]" />
        <span>VỀ TRANG CHỦ</span>
      </button>

      {/* STEP 1: SELECT CREATION MODULE */}
      {step === 'select-mode' && (
        <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-indigo-500 border-2 border-indigo-300 border-b-4 border-b-indigo-700 rounded-2xl text-white mb-4 shadow-sm animate-bounce-slow">
              <Sparkles className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight font-sans">
              Thầy Cô & Cha Mẹ Soạn Bài Học!
            </h2>
            <p className="text-gray-500 text-xs font-black max-w-sm mx-auto mt-2 leading-relaxed uppercase">
              Hãy chọn phương pháp thiết kế bài học thú vị nhất cho trẻ thơ:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* AI magic generator pathway */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                playSoundEffect('click');
                setStep('ai-prompt');
              }}
              className="bg-purple-50/50 hover:bg-purple-50 border-2 border-purple-200 border-b-8 border-b-purple-400 rounded-3xl p-6 text-center cursor-pointer flex flex-col justify-between items-center transition-all h-64"
            >
              <div className="text-5xl mt-2 animate-bounce-slow">🔮</div>
              <div>
                <h4 className="text-lg font-black text-purple-950 font-sans">Cách 1: Trí Tuệ Nhân Tạo AI</h4>
                <p className="text-xs font-semibold text-gray-500 mt-1 max-w-[220px]">
                  Chỉ cần gõ ý tưởng (ví dụ: &ldquo;Con gà trống gáy vang&rdquo;), AI tự soạn câu nói, câu hỏi mầm mống & sự thật vui cho bé tức thì!
                </p>
              </div>
              <span className="text-xs font-black text-purple-700 uppercase tracking-widest mt-2 flex items-center gap-1">
                <span>Dùng Thần Chú AI</span>
                <Wand2 className="w-3.5 h-3.5" />
              </span>
            </motion.div>

            {/* Manual builder pathway */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={handleStartManual}
              className="bg-blue-50/50 hover:bg-blue-50 border-2 border-blue-200 border-b-8 border-b-blue-400 rounded-3xl p-6 text-center cursor-pointer flex flex-col justify-between items-center transition-all h-64"
            >
              <div className="text-5xl mt-2 animate-pulse">✍️</div>
              <div>
                <h4 className="text-lg font-black text-blue-950 font-sans">Cách 2: Tự Soạn Thủ Công</h4>
                <p className="text-xs font-semibold text-gray-500 mt-1 max-w-[220px]">
                  Dành cho Ba Mẹ & Thầy Cô giáo muốn thiết kế riêng từng câu chữ sát thực nhất cho cuộc sống của bé học ở lớp và ở nhà.
                </p>
              </div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest mt-2 flex items-center gap-1">
                <span>Tự thiết kế từ đầu</span>
                <Plus className="w-4 h-4 stroke-[3]" />
              </span>
            </motion.div>

          </div>
        </div>
      )}

      {/* STEP 2: PROMPT TO GET AI-GENERATED CONTENT */}
      {step === 'ai-prompt' && (
        <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-indigo-950 tracking-tight font-sans">
              Phép Thuật AI Soạn Giáo Án ✨
            </h2>
            <p className="text-gray-500 text-xs font-bold max-w-sm mx-auto mt-2 leading-relaxed">
              Nhập bất kỳ loài vật, đồ chơi, hành động nào bé mến yêu, AI sẽ vẽ nên nội dung mẫu lý thú!
            </p>
          </div>

          <form onSubmit={handleGenerateAI} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-indigo-950 uppercase tracking-widest">
                Chủ đề bé thích là gì?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Ví dụ: Bé bảo vệ rùa biển, quả dưa hấu chín..."
                  maxLength={35}
                  disabled={isGenerating}
                  className="w-full px-5 py-4 bg-purple-50/25 border-2 border-purple-200 focus:border-purple-400 outline-none rounded-2xl text-indigo-950 placeholder-indigo-300/80 font-black text-base transition-all pr-12 focus:bg-white"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-500 text-xl">
                  🔮
                </div>
              </div>
              <p className="text-[10px] text-gray-400 font-extrabold italic">Ba mẹ/Thầy cô viết tối đa 35 ký tự phong phú nhé!</p>
            </div>

            {/* Quick suggestions */}
            <div className="space-y-3">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Gợi ý chủ đề siêu nghộ nghĩnh cho bé:
              </span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((sug) => (
                  <button
                    type="button"
                    key={sug.text}
                    onClick={() => handleSelectSuggestion(sug.text)}
                    disabled={isGenerating}
                    className="bg-white hover:bg-indigo-50 border-2 border-gray-200 border-b-4 border-b-gray-400 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 hover:border-indigo-300 cursor-pointer"
                  >
                    <span>{sug.emoji}</span>
                    <span className="text-gray-700 font-extrabold text-xs">{sug.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  playSoundEffect('pop');
                  setStep('select-mode');
                }}
                className="px-6 py-4 rounded-2xl font-black text-gray-500 border-2 border-gray-200 border-b-4 border-b-gray-400 text-xs hover:bg-gray-50 transition-all uppercase"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={isGenerating || !topicInput.trim()}
                className={`flex-1 py-4 rounded-2xl font-black text-white shadow-md flex items-center justify-center gap-2 transform transition-all border-b-8 text-base cursor-pointer ${
                  topicInput.trim() && !isGenerating
                    ? 'bg-purple-600 border-purple-800 hover:brightness-105'
                    : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>VẼ BÀI HỌC VỚI AI 🧙‍♀️</span>
                <Wand2 className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* AI Loader Screen */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/97 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-20"
                id="chalkboard-chalk-loading"
              >
                <div className="w-20 h-20 rounded-full bg-indigo-50 border-4 border-indigo-400 flex items-center justify-center text-4xl shadow-md relative animate-bounce mb-6">
                  🧙‍♀️
                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    AI
                  </div>
                </div>

                <h4 className="text-lg font-black text-indigo-950 font-sans text-center">
                  Cô Chích Chòe bốc quẻ thông thái...
                </h4>
                <p className="text-indigo-600 text-xs mt-2 text-center max-w-xs leading-relaxed font-sans font-extrabold uppercase">
                  Đang lập trình giáo án về: &ldquo;{topicInput}&rdquo; cho bé!
                </p>

                <div className="mt-8 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-0"></span>
                  <span className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce delay-300"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorText && (
            <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl p-4 mt-4">
              {errorText}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: CONFIGURE/MANAGE CUSTOM AND UPLOAD MEDIA (FOR BOTH PATHWAY OUTPUTS) */}
      {step === 'configure' && (
        <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 shadow-sm">
          
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <Edit3 className="w-6 h-6 text-teal-600" />
            <div>
              <h3 className="text-lg font-black text-indigo-950 font-sans">
                Cấu Hình Nội Dung Bài Học
              </h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase">
                Bổ sung hình minh họa và giọng phát âm mẫu của Thầy Cô
              </p>
            </div>
          </div>

          <form onSubmit={handlePublish} className="space-y-6">
            
            {/* Topic & Basic texts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                  Tên Chủ Đề Của Bài
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="Ví dụ: Động vật trong vườn"
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-xs font-bold"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                  Trực Quan Emoji Đại Diện
                </label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="Ví dụ: 🦖, 🦁, 🏠"
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-xs font-bold text-center"
                  required
                />
              </div>
            </div>

            {/* Target sentence block */}
            <div className="space-y-2Rect bg-indigo-50/20 p-4 rounded-2xl border-2 border-indigo-100/50 space-y-3">
              <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider">
                1. Câu Tiếng Việt Bé Sắp Xếp (Mẫu Đọc Học) *
              </label>
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Ví dụ: Con chó đang gặm xương"
                rows={2}
                className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-sm font-black resize-none"
                required
              />
              <p className="text-[10px] text-indigo-500 font-bold leading-normal">
                💡 Hệ thống sẽ tự động bóc tách từng chữ đơn lẻ để xáo trộn cho bé chơi gắp ghép bóng từ!
              </p>
            </div>

            {/* Custom Question prompt */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                2. Câu Hỏi Câu Gợi Ý Kích Thích Tháo Vát (Nếu có)
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ví dụ: Bạn cún ngoan làm gì khi gặm xương con nhỉ?"
                className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-xs font-bold"
              />
            </div>

            {/* Phonetics Pronunciation guide & Fun facts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                  3. Phiên Âm / Phát Âm Từng Từ
                </label>
                <input
                  type="text"
                  value={phonetics}
                  onChange={(e) => setPhonetics(e.target.value)}
                  placeholder="Ví dụ: con / chó / đang / gặm / xương"
                  className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-xs font-mono text-amber-800 bg-amber-50/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                  4. Mức Độ Khó
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dễ', 'trung bình', 'khó'] as const).map(diff => (
                    <button
                      type="button"
                      key={diff}
                      onClick={() => {
                        playSoundEffect('click');
                        setDifficulty(diff);
                      }}
                      className={`py-2 px-3 text-[10px] font-black rounded-xl uppercase transition-all ${
                        difficulty === diff
                          ? 'bg-amber-400 text-white border-b-4 border-b-amber-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                5. Sự Thật Thú Vị / Phần Thưởng Bé Nghe
              </label>
              <textarea
                value={funFact}
                onChange={(e) => setFunFact(e.target.value)}
                placeholder="Ví dụ: Bạn chó cún vẫy đuôi mừng khi bé đi học ngoan về đó nha!"
                rows={2}
                className="w-full px-4 py-3 border-2 border-slate-200 focus:border-indigo-400 outline-none rounded-xl text-xs font-medium resize-none text-slate-600"
              />
            </div>

            {/* EXPAND 1: CHỌN LOAD HÌNH MINH HỌA - DRAG DROP GRAPHIC */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 text-sky-800">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                <span>6. Hình Ảnh Minh Họa Cho Câu (Tùy Chọn)</span>
              </h4>

              {/* Drag and drop image dropzone */}
              {!customImage ? (
                <div
                  onDragOver={handleImgDragOver}
                  onDragLeave={handleImgDragLeave}
                  onDrop={handleImgDrop}
                  className={`border-4 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                    isImgDragging 
                      ? 'border-sky-500 bg-sky-50' 
                      : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/20'
                  }`}
                  onClick={() => {
                    const el = document.getElementById('image-uploader-input');
                    if (el) el.click();
                  }}
                >
                  <Upload className="w-10 h-10 text-sky-400 stroke-[2] mb-2 animate-bounce-slow" />
                  <p className="text-xs font-black text-sky-900 font-sans">Kéo thả hình minh họa vào đây nhé</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Hoặc nhấn để chọn tệp từ máy (Ảnh dưới 1.5 MB)</p>
                  <input
                    id="image-uploader-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processImageFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-sky-50/50 rounded-2xl p-4 border border-sky-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={customImage} 
                      alt="Review" 
                      className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-xs" 
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-black text-sky-950 truncate max-w-xs">{customImageName || "Ảnh đã tải lên"}</p>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-250 inline-block mt-1">Đã Sẵn Sàng 📷</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSoundEffect('pop');
                      setCustomImage(null);
                      setCustomImageName(null);
                    }}
                    className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-300"
                    title="Xóa hình minh họa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* EXPAND 2: ĐOẠN PHÁT ÂM CỦA CÔ/THẦY GIÁO (Teacher voice clip uploader/recorder) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                <Music className="w-4 h-4 text-emerald-500" />
                <span>7. Đoạn Phát Âm Của Cô/Thầy Mẫu (Tùy Chọn)</span>
              </h4>

              {!customAudio ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Option A: Drag & Drop / Upload Audio File */}
                  <div
                    onDragOver={handleAudioDragOver}
                    onDragLeave={handleAudioDragLeave}
                    onDrop={handleAudioDrop}
                    onClick={() => {
                      const el = document.getElementById('audio-uploader-input');
                      if (el) el.click();
                    }}
                    className={`border-4 border-dashed rounded-2xl p-5 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isAudioDragging 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-emerald-400 stroke-[2] mb-2" />
                    <p className="text-xs font-black text-emerald-900 font-sans">1. Tải Tệp Âm Thanh Chuẩn</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Nhấn để chọn file MP3, WAV (Dưới 2 MB)</p>
                    
                    <input
                      id="audio-uploader-input"
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          processAudioFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </div>

                  {/* Option B: Direct Micro Recorder inside form */}
                  <div className="border-4 border-dashed border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center justify-center bg-slate-50/30">
                    <Mic className="w-8 h-8 text-indigo-400 stroke-[2] mb-1.5" />
                    <p className="text-xs font-black text-indigo-950 font-sans">2. Ghi Âm Trực Tiếp Mẫu</p>
                    
                    {isRecordingTutor ? (
                      <div className="mt-2.5 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-red-500 font-black animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-600 rounded-full inline-block"></span>
                          <span>ĐANG GHI ÂM: {recDuration} giây</span>
                        </span>
                        <button
                          type="button"
                          onClick={stopTutorRecording}
                          className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] px-3.5 py-1.5 rounded-full border-b-2 border-red-700 flex items-center gap-1 outline-none"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>DỪNG LẠI & LƯU</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startTutorRecording}
                        className="mt-2 text-[10px] font-black uppercase text-indigo-700 hover:text-white hover:bg-indigo-600 border-2 border-indigo-200 hover:border-indigo-600 px-4 py-2 rounded-xl transition-all flex items-center gap-1 bg-white cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5 text-current" />
                        <span>Bắt đầu nói ghi âm</span>
                      </button>
                    )}
                  </div>

                </div>
              ) : (
                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePlayTestAudio}
                      className={`p-3 text-white rounded-full transition-all cursor-pointer ${
                        isPlayingTestAudio ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                      title={isPlayingTestAudio ? "Dừng nghe thử" : "Nghe thử phát âm mẫu"}
                    >
                      {isPlayingTestAudio ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <div>
                      <p className="text-xs font-black text-emerald-950 truncate max-w-xs">{customAudioName || "Đoạn âm thanh đã tải lên"}</p>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md border border-indigo-250 inline-block mt-1">Sẵn Sàng Hát Nhạc 🎙️</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSoundEffect('pop');
                      setCustomAudio(null);
                      setCustomAudioName(null);
                      if (isPlayingTestAudio && testAudioObj) {
                        testAudioObj.pause();
                        setIsPlayingTestAudio(false);
                      }
                    }}
                    className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-300"
                    title="Xóa đoạn phát âm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions for steps */}
            <div className="pt-6 border-t border-slate-100 flex gap-4">
              <button
                type="button"
                onClick={() => {
                  playSoundEffect('pop');
                  setStep('select-mode');
                }}
                className="px-6 py-4 rounded-xl font-black text-gray-500 border-2 border-gray-200 border-b-4 border-b-gray-400 text-xs hover:bg-gray-50 transition-all uppercase"
              >
                Đổi Cách Soạn
              </button>
              
              <button
                type="submit"
                disabled={!sentence.trim()}
                className={`flex-1 py-4 rounded-2xl font-black text-white shadow-md flex items-center justify-center gap-2 transform transition-all active:scale-98 border-b-8 text-base cursor-pointer ${
                  sentence.trim()
                    ? 'bg-emerald-600 border-emerald-800 hover:brightness-105'
                    : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>BẮT ĐẦU CHƠI BÀI HỌC CỦA BÉ! 🚀</span>
                <Check className="w-5 h-5 stroke-[3]" />
              </button>
            </div>

          </form>

        </div>
      )}

    </div>
  );
}
