import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Trash2, Volume2, Mic, Square, Play, Pause, 
  Image as ImageIcon, Music, Check, RefreshCw, AlertCircle, Sparkles, Info, PlusCircle
} from 'lucide-react';
import { playSoundEffect } from '../utils/audioHelper';
import { Topic, LessonItem } from '../types';

interface TeacherPortalProps {
  topics: Topic[];
  onSaveTopics: (newTopics: Topic[]) => void;
  onResetSyllabus: () => void;
  overrides: Record<string, { customImage?: string; customAudio?: string }>;
  onSaveOverrides: (newOverrides: Record<string, { customImage?: string; customAudio?: string }>) => void;
  onBackToDashboard: () => void;
}

export default function TeacherPortal({
  topics,
  onSaveTopics,
  onResetSyllabus,
  overrides,
  onSaveOverrides,
  onBackToDashboard
}: TeacherPortalProps) {
  // Navigation: selected topic to edit
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || '');
  
  // Form states for adding a new lesson
  const [newSentence, setNewSentence] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState<string>('');
  const [newDifficulty, setNewDifficulty] = useState<'dễ' | 'trung bình' | 'khó'>('dễ');
  const [scrambledWordsInput, setScrambledWordsInput] = useState<string>('');
  const [newEmoji, setNewEmoji] = useState<string>('🎒');
  const [newFunFact, setNewFunFact] = useState<string>('');
  const [newPhoneticsGuide, setNewPhoneticsGuide] = useState<string>('');

  // Local track of editing state for each item in the selected topic
  const [localOverrides, setLocalOverrides] = useState<Record<string, { customImage?: string; customAudio?: string }>>({});

  useEffect(() => {
    setLocalOverrides({ ...overrides });
  }, [overrides]);

  // Audio testing states
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(null);

  // Recording voice state
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState<number>(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recIntervalRef = useRef<any>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Drag-and-drop flags
  const [dragOverInputId, setDragOverInputId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Clean up audio playback & recorders on unmount
      if (testAudioObj) {
        testAudioObj.pause();
      }
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      if (recIntervalRef.current) {
        clearInterval(recIntervalRef.current);
      }
    };
  }, [testAudioObj, micStream]);

  const activeTopic = topics.find(t => t.id === selectedTopicId);

  // Helper: File to Base64 convertor
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = e => reject(e);
    });
  };

  // Image upload processor
  const handleUploadImage = async (itemId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Ấy gụ! Vui lòng chọn tệp hình ảnh (.png, .jpg, .jpeg, .webp, .gif) nha ba mẹ!");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      alert("Kích thước hình ảnh lớn hơn 1.5 MB rồi ạ. Ba mẹ chọn ảnh nén nhỏ hơn để tải mượt nhé.");
      return;
    }

    try {
      const base64Str = await fileToBase64(file);
      const updated = {
        ...localOverrides,
        [itemId]: {
          ...localOverrides[itemId],
          customImage: base64Str
        }
      };
      setLocalOverrides(updated);
      onSaveOverrides(updated);
      playSoundEffect('success');
    } catch (e) {
      console.error("Base64 coverting image failed", e);
    }
  };

  // Audio file upload processor
  const handleUploadAudio = async (itemId: string, file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert("Vui lòng tải tệp âm thanh hợp lệ (.mp3, .wav, .m4a, .webm)!");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Tệp âm thanh quá lớn! Ba mẹ hãy chọn hoặc ghi âm đoạn ngắn dưới 2 MB.");
      return;
    }

    try {
      const base64Str = await fileToBase64(file);
      const updated = {
        ...localOverrides,
        [itemId]: {
          ...localOverrides[itemId],
          customAudio: base64Str
        }
      };
      setLocalOverrides(updated);
      onSaveOverrides(updated);
      playSoundEffect('success');
    } catch (e) {
      console.error("Base64 converting audio failed", e);
    }
  };

  // Mic recording starter
  const startRecording = async (itemId: string) => {
    playSoundEffect('click');
    setRecordedChunks([]);
    setRecDuration(0);
    setRecordingItemId(itemId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: '' }; // fallback to default browser format
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      let tempChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          tempChunks.push(event.data);
          setRecordedChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(tempChunks, { type: options.mimeType || 'audio/webm' });
        try {
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = err => reject(err);
          });

          const updated = {
            ...localOverrides,
            [itemId]: {
              ...localOverrides[itemId],
              customAudio: base64Str
            }
          };
          setLocalOverrides(updated);
          onSaveOverrides(updated);
          playSoundEffect('victory');
        } catch (e) {
          console.error("Failed recording base64 conversion", e);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(250);
      
      recIntervalRef.current = setInterval(() => {
        setRecDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Access microphone blocked", err);
      alert("Hệ thống chưa được cấp quyền micro. Ba mẹ hoặc Thầy cô vui lòng nhấn 'Cho phép' (Allow) dùng micro trên dòng trình duyệt nhé!");
      setRecordingItemId(null);
    }
  };

  // Mic recording stopper
  const stopRecording = () => {
    if (!recordingItemId || !mediaRecorderRef.current) return;
    clearInterval(recIntervalRef.current);
    mediaRecorderRef.current.stop();
    setRecordingItemId(null);
    playSoundEffect('pop');
  };

  // Custom audio preview listening
  const playCustomAudio = (itemId: string, audioDataUrl: string) => {
    if (activePlaybackId === itemId && testAudioObj) {
      testAudioObj.pause();
      setActivePlaybackId(null);
      return;
    }

    playSoundEffect('click');
    const audio = new Audio(audioDataUrl);
    setTestAudioObj(audio);
    setActivePlaybackId(itemId);

    audio.onended = () => {
      setActivePlaybackId(null);
    };
    audio.onerror = () => {
      setActivePlaybackId(null);
      alert("Lỗi phát tệp ghi âm này, vui lòng thu âm hoặc chọn tệp mới nhé!");
    };
    
    audio.play().catch(err => {
      console.error(err);
      setActivePlaybackId(null);
    });
  };

  // Remove overrides for a specific item
  const handleRemoveImageOverride = (itemId: string) => {
    playSoundEffect('pop');
    const updated = { ...localOverrides };
    if (updated[itemId]) {
      delete updated[itemId].customImage;
      if (Object.keys(updated[itemId]).length === 0) {
        delete updated[itemId];
      }
    }
    setLocalOverrides(updated);
    onSaveOverrides(updated);
  };

  const handleRemoveAudioOverride = (itemId: string) => {
    playSoundEffect('pop');
    const updated = { ...localOverrides };
    if (updated[itemId]) {
      delete updated[itemId].customAudio;
      if (Object.keys(updated[itemId]).length === 0) {
        delete updated[itemId];
      }
    }
    setLocalOverrides(updated);
    onSaveOverrides(updated);
    if (activePlaybackId === itemId && testAudioObj) {
      testAudioObj.pause();
      setActivePlaybackId(null);
    }
  };

  // Wipe all custom overrides entirely
  const handleWipeAllOverrides = () => {
    if (window.confirm("Thầy cô/Ba mẹ có chắc muốn xóa TẤT CẢ các bài học tự thêm/xóa và các tệp hình ảnh, tọng mẫu tự ghi âm không? Giáo án sẽ khôi phục về trạng thái mặc định ban đầu.")) {
      playSoundEffect('pop');
      onResetSyllabus();
      alert("Đã hoàn tác toàn bộ giáo trình gốc thành công!");
    }
  };

  const handleAddNewLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !newSentence.trim() || !scrambledWordsInput.trim()) return;

    // Process scrambled words
    const finalWords = scrambledWordsInput
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    if (finalWords.length === 0) {
      alert("Vui lòng phân nhỏ các mảnh từ ghép cách nhau bằng dấu phẩy (Ví dụ: mẹ, yêu, bé lắm)!");
      return;
    }

    const newItem: LessonItem = {
      id: `custom-lesson-${Date.now()}`,
      sentence: newSentence.trim(),
      question: newQuestion.trim() || undefined,
      type: 'sentence',
      topic: selectedTopicId,
      scrambledWords: finalWords,
      difficulty: newDifficulty,
      emoji: newEmoji.trim(),
      guideVoiceText: newSentence.trim(),
      funFact: newFunFact.trim() || undefined,
      phoneticsGuide: newPhoneticsGuide.trim() || undefined
    };

    // Update custom topics
    const updatedTopics = topics.map(topic => {
      if (topic.id === selectedTopicId) {
        return {
          ...topic,
          items: [...topic.items, newItem]
        };
      }
      return topic;
    });

    onSaveTopics(updatedTopics);
    
    // Clear form
    setNewSentence('');
    setNewQuestion('');
    setNewDifficulty('dễ');
    setScrambledWordsInput('');
    setNewEmoji('🎒');
    setNewFunFact('');
    setNewPhoneticsGuide('');

    playSoundEffect('success');
    alert("🎉 Đã thêm bài học mới thành công!");
  };

  const handleDeleteLessonItem = (itemId: string) => {
    if (!selectedTopicId) return;
    const targetItem = activeTopic?.items.find(i => i.id === itemId);
    if (!targetItem) return;

    if (window.confirm(`Thầy cô/Ba mẹ có muốn XÓA bài học "${targetItem.sentence}" khỏi chủ đề này không?`)) {
      playSoundEffect('pop');
      
      // Update custom topics list
      const updatedTopics = topics.map(topic => {
        if (topic.id === selectedTopicId) {
          return {
            ...topic,
            items: topic.items.filter(item => item.id !== itemId)
          };
        }
        return topic;
      });

      onSaveTopics(updatedTopics);

      // Clean up item overrides as well
      const updatedOverrides = { ...overrides };
      if (updatedOverrides[itemId]) {
        delete updatedOverrides[itemId];
        onSaveOverrides(updatedOverrides);
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2" id="teacher-portal-container">
      
      {/* Back button */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs font-black text-indigo-700 hover:text-indigo-800 bg-white border-2 border-indigo-200 border-b-4 border-b-indigo-400 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>VỀ TRANG CHỦ HỌC</span>
        </button>

        <button
          onClick={handleWipeAllOverrides}
          className="text-xs font-black text-rose-600 hover:text-white hover:bg-rose-600 bg-white hover:border-rose-600 border-2 border-rose-200 border-b-4 border-b-rose-400 px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>KHÔI PHỤC GIÁO TRÌNH GỐC</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 shadow-sm">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row items-center gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-3xl border-b-4 border-indigo-700 shadow-xs">
            👩‍🏫
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              Quản Lý Giáo Án • Góc Giáo Viên & Cha Mẹ 🔐
            </h2>
            <p className="text-slate-400 text-xs font-black uppercase mt-1">
              tự soạn tệp hình ảnh thực tế & thu âm giọng mẫu địa phương của gia đình
            </p>
          </div>
        </div>

        {/* Tip memo block */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 font-medium leading-relaxed font-sans">
            <strong>💡 Cách hoạt động:</strong> Khi thầy cô tải lên một bức ảnh hoặc thu âm một tệp phát âm tùy chỉnh cho một câu nói, hệ thống sẽ <strong>tự động thay thế</strong> hình emoji cũ bằng hình ảnh thực tế, và phát tệp âm thanh nói chuẩn Bắc/Nam do chính Thầy Cô/Ba mẹ ghi âm khi bé chơi ghép câu và luyện phát âm. Giúp bé gắn kết hình ảnh đời thực và giọng đọc thân ruột nhất!
          </div>
        </div>

        {/* Topic Navigator Tabstrip */}
        <div className="mb-8">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            1. Chọn chủ đề giáo án cần chỉnh sửa:
          </label>
          <div className="flex flex-wrap gap-2">
            {topics.map(topic => {
              const countCustomized = topic.items.filter(item => 
                localOverrides[item.id]?.customImage || localOverrides[item.id]?.customAudio
              ).length;

              return (
                <button
                  key={topic.id}
                  onClick={() => {
                    playSoundEffect('click');
                    setSelectedTopicId(topic.id);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all border-b-4 cursor-pointer outline-none ${
                    selectedTopicId === topic.id
                      ? 'bg-indigo-600 text-white border-indigo-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  <span className="text-lg">{topic.emoji}</span>
                  <span>{topic.name}</span>
                  {countCustomized > 0 && (
                    <span className="bg-emerald-500 text-[10px] px-1.5 py-0.5 rounded-md font-black text-white shrink-0">
                      +{countCustomized}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thêm bài học mới block */}
        {activeTopic && (
          <div className="mb-10 bg-indigo-50/40 border-2 border-indigo-100 rounded-[32px] p-6">
            <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2 mb-4 font-sans">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Thêm Bài Học Mới Vào Chủ Đề "{activeTopic.name}"</span>
            </h4>

            <form onSubmit={handleAddNewLessonSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Câu chuẩn tiếng Việt (nhập câu chuẩn, ví dụ: "Bé đi học"): *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSentence}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewSentence(val);
                      // Pre-populate scrambled words by splitting on space & strip punctuation
                      const cleanWords = val.replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
                        .split(/\s+/)
                        .filter(Boolean);
                      setScrambledWordsInput(cleanWords.join(', '));
                    }}
                    placeholder="Ví dụ: Con yêu bố mẹ nhiều"
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Câu hỏi khơi gợi của cô giáo (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Ví dụ: Con yêu ai nhất nhà nhỉ?"
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Độ khó:
                  </label>
                  <select
                    value={newDifficulty}
                    onChange={(e: any) => setNewDifficulty(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all cursor-pointer font-sans"
                  >
                    <option value="dễ">Dễ (3-4 chữ)</option>
                    <option value="trung bình">Trung bình (4-5 chữ)</option>
                    <option value="khó">Khó (trên 6 chữ)</option>
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center justify-between">
                    <span>Mảnh từ ghép (ngăn cách bằng dấu phẩy): *</span>
                    <span className="text-[9px] text-indigo-500 font-black lowercase italic">Mặc định phân tích theo chữ</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={scrambledWordsInput}
                    onChange={(e) => setScrambledWordsInput(e.target.value)}
                    placeholder="Con, yêu, bố mẹ, nhiều"
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Mã hình Emoji: *
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      placeholder="🎒"
                      className="w-12 text-center text-sm font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-2 rounded-xl outline-none transition-all"
                    />
                    <div className="flex flex-wrap gap-1 max-w-[124px]">
                      {['🎒', '🏡', '🍰', '🚗', '🐱', '🍎', '🌟', '🍼'].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => {
                            playSoundEffect('pop');
                            setNewEmoji(em);
                          }}
                          className={`w-6 h-6 text-xs flex items-center justify-center rounded-lg hover:bg-slate-200 cursor-pointer transition-all ${newEmoji === em ? 'bg-indigo-100 border border-indigo-400 scale-105' : ''}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Lời thú vị/Lời gắm thêm cho bé (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newFunFact}
                    onChange={(e) => setNewFunFact(e.target.value)}
                    placeholder="Con là thiên thần nhỏ ngoan nhất đời của bố mẹ!"
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    Phiên âm phát âm chậm (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newPhoneticsGuide}
                    onChange={(e) => setNewPhoneticsGuide(e.target.value)}
                    placeholder="con / yêu / bố / mẹ"
                    className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all"
                  />
                </div>
              </div>

              {scrambledWordsInput.trim() && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-1.5 shadow-2xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-2 font-sans">Các khối từ bé sẽ xếp:</span>
                  {scrambledWordsInput.split(',')
                    .map(w => w.trim())
                    .filter(Boolean)
                    .map((word, i) => (
                      <span key={i} className="text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-lg">
                        {word}
                      </span>
                    ))
                  }
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-2xl border-b-4 border-b-indigo-800 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>XÁC NHẬN THÊM BÀI NÀY</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Items Listing for Selected Topic */}
        {activeTopic && (
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
              <span>Danh Sách Câu Hỏi ({activeTopic.items.length} phần):</span>
              <span className="text-xs text-indigo-600 lowercase font-extrabold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                nhóm: {activeTopic.name}
              </span>
            </h3>

            <div className="space-y-6" id="teacher-items-scroller">
              {activeTopic.items.map((item, idx) => {
                const itemOverride = localOverrides[item.id] || {};
                const currentImg = itemOverride.customImage;
                const currentAud = itemOverride.customAudio;

                return (
                  <div 
                    key={item.id}
                    className="p-5 bg-slate-50/70 hover:bg-slate-50 border-2 border-slate-200 rounded-[28px] grid grid-cols-1 md:grid-cols-12 gap-5 transition-all"
                  >
                    {/* Sentence basic profile info */}
                    <div className="md:col-span-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-2 py-0.5 rounded-md">
                              Bài {idx + 1}
                            </span>
                            <span className="text-xl">{item.emoji}</span>
                          </div>
                          
                          {/* DELETE LESSON ITEM BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLessonItem(item.id)}
                            className="text-[10px] font-black text-rose-600 hover:bg-rose-50 border border-slate-250 hover:border-rose-300 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            title="Xóa bài học này"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>Xóa Bài</span>
                          </button>
                        </div>
                        <h4 className="font-sans font-black text-slate-900 leading-snug text-base">
                          {item.sentence}
                        </h4>
                        {item.question && (
                          <p className="text-[11px] text-teal-600 font-bold mt-1.5 italic font-sans">
                            Gợi mở: &ldquo;{item.question}&rdquo;
                          </p>
                        )}
                        {item.phoneticsGuide && (
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            {item.phoneticsGuide}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* MODERATOR 1: EDIT IMAGE / ILLUSTRATION */}
                    <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-dashed border-slate-200 pt-4 md:pt-0 md:pl-4 flex flex-col justify-between">
                      <div className="mb-2">
                        <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 text-sky-800">
                          <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                          <span>Hình Minh Họa</span>
                        </span>
                      </div>

                      {currentImg ? (
                        <div className="bg-sky-50/40 border border-sky-100 rounded-2xl p-2 flex items-center gap-2.5">
                          <img 
                            src={currentImg} 
                            alt="preview override" 
                            className="w-12 h-12 rounded-xl object-cover border border-white shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden flex-1">
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase border border-emerald-100">
                              Đã Sẵn Sàng 📷
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImageOverride(item.id)}
                            className="p-1.5 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-rose-400 transition-all shrink-0"
                            title="Xóa hình ảnh tự tải"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverInputId(`img-${item.id}`);
                          }}
                          onDragLeave={() => setDragOverInputId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverInputId(null);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleUploadImage(item.id, e.dataTransfer.files[0]);
                            }
                          }}
                          onClick={() => {
                            const input = document.getElementById(`img-file-${item.id}`);
                            if (input) input.click();
                          }}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[60px] ${
                            dragOverInputId === `img-${item.id}`
                              ? 'border-sky-500 bg-sky-50/50'
                              : 'border-slate-350 hover:border-sky-450 hover:bg-sky-50/20'
                          }`}
                        >
                          <Upload className="w-5 h-5 text-sky-400 mb-1" />
                          <span className="text-[10px] font-black text-sky-900 leading-none">Tải Ảnh (.png,.jpg)</span>
                          <span className="text-[8px] text-gray-400 font-extrabold uppercase mt-0.5">Kéo thả hoặc nhấn</span>
                          
                          <input 
                            id={`img-file-${item.id}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadImage(item.id, e.target.files[0]);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* MODERATOR 2: EDIT AUDIO / TUTOR PRONUNCIATION */}
                    <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-dashed border-slate-200 pt-4 md:pt-0 md:pl-4 flex flex-col justify-between">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                          <Music className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Giọng Ghi Mẫu</span>
                        </span>
                        {recordingItemId === item.id && (
                          <span className="text-[9px] text-red-500 font-black animate-pulse">
                            ● {recDuration}s
                          </span>
                        )}
                      </div>

                      {currentAud ? (
                        <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-2 flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playCustomAudio(item.id, currentAud)}
                              className={`p-2 rounded-full text-white cursor-pointer transition-all ${
                                activePlaybackId === item.id ? 'bg-indigo-500' : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                              title={activePlaybackId === item.id ? "Dừng" : "Phát thử"}
                            >
                              {activePlaybackId === item.id ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                            </button>
                            <span className="text-[9px] font-black text-slate-500">Giọng riêng</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveAudioOverride(item.id)}
                            className="p-1.5 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-rose-400 transition-all shrink-0"
                            title="Xóa âm phát mẫu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          
                          {/* Option mic record */}
                          <button
                            type="button"
                            onClick={() => {
                              if (recordingItemId === item.id) {
                                stopRecording();
                              } else {
                                startRecording(item.id);
                              }
                            }}
                            className={`flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-2xl transition-all cursor-pointer min-h-[56px] text-center ${
                              recordingItemId === item.id
                                ? 'border-red-500 bg-red-50 text-red-600 animate-pulse'
                                : 'border-slate-350 hover:border-emerald-450 hover:bg-emerald-50/10 text-emerald-800'
                            }`}
                          >
                            {recordingItemId === item.id ? (
                              <>
                                <Square className="w-4 h-4 fill-current mb-0.5" />
                                <span className="text-[9px] font-black uppercase">Click Dừng</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4 text-emerald-500 mb-0.5" />
                                <span className="text-[9px] font-black">Nói Ghi Âm</span>
                              </>
                            )}
                          </button>

                          {/* Option upload audio */}
                          <div
                            onClick={() => {
                              const input = document.getElementById(`aud-file-${item.id}`);
                              if (input) input.click();
                            }}
                            className="border-2 border-dashed border-slate-350 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-2xl p-2 flex flex-col items-center justify-center text-indigo-700 cursor-pointer min-h-[56px] text-center"
                          >
                            <Upload className="w-4 h-4 text-indigo-400 mb-0.5" />
                            <span className="text-[9px] font-black">Tải File</span>
                            <span className="text-[7px] text-gray-400 uppercase">MP3/WAV/M4A</span>

                            <input 
                              id={`aud-file-${item.id}`}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadAudio(item.id, e.target.files[0]);
                                }
                              }}
                            />
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
