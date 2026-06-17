import React, { useState, useEffect } from 'react';
import { Topic, LessonItem, UserStats } from './types';
import { TOPICS } from './data/lessons';
import Dashboard from './components/Dashboard';
import SentenceBuilder from './components/SentenceBuilder';
import AudioTutor from './components/AudioTutor';
import CustomLessonCreator from './components/CustomLessonCreator';
import TeacherPortal from './components/TeacherPortal';
import { playSoundEffect, playVietnameseText } from './utils/audioHelper';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Default user stats initialization
const DEFAULT_STATS: UserStats = {
  streak: 3, // Start with a friendly non-zero streak for motivation
  stars: 12,
  coins: 50,
  lastActiveDate: new Date().toDateString(),
  completedIds: []
};

export default function App() {
  // Stats state persisted in localStorage
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  // App views: 'dashboard' | 'active-play' | 'custom-creator' | 'teacher-portal'
  const [currentView, setCurrentView] = useState<'dashboard' | 'active-play' | 'custom-creator' | 'teacher-portal'>('dashboard');
  
  // Audio accent: 'north' | 'south'
  const [accent, setAccent] = useState<'north' | 'south'>('north');

  // Custom visual/auditory overrides loading for topics & items
  const [overrides, setOverrides] = useState<Record<string, { customImage?: string; customAudio?: string }>>(() => {
    try {
      const savedOverrides = localStorage.getItem('be_hoc_tieng_viet_overrides');
      return savedOverrides ? JSON.parse(savedOverrides) : {};
    } catch (e) {
      return {};
    }
  });

  // User customized topics list
  const [customTopics, setCustomTopics] = useState<Topic[]>(() => {
    try {
      const savedTopics = localStorage.getItem('be_hoc_tieng_viet_custom_topics');
      return savedTopics ? JSON.parse(savedTopics) : TOPICS;
    } catch (e) {
      return TOPICS;
    }
  });

  // Parental Control Lock Dialog States
  const [isParentLockOpen, setIsParentLockOpen] = useState<boolean>(false);
  const [parentMathQuestion, setParentMathQuestion] = useState<{ q: string; a: number }>({ q: '', a: 0 });
  const [parentMathInput, setParentMathInput] = useState<string>('');
  const [parentMathError, setParentMathError] = useState<boolean>(false);

  // Selected topic/lesson tracking
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Step indicator in active-play: 'puzzle' (ghép câu) | 'speech' (phát âm)
  const [playStep, setPlayStep] = useState<'puzzle' | 'speech'>('puzzle');

  // Custom generated lesson item via Gemini
  const [customLessonItem, setCustomLessonItem] = useState<LessonItem | null>(null);

  // Load stats and overrides on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('be_hoc_tieng_viet_stats');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Dynamic streak validator based on days elapsed
        let updatedStats = { ...parsed };
        const lastActive = new Date(parsed.lastActiveDate);
        const today = new Date();
        
        // Zero out time part
        lastActive.setHours(0,0,0,0);
        today.setHours(0,0,0,0);
        
        const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          updatedStats.streak += 0; // maintain streak
        } else if (diffDays > 1) {
          updatedStats.streak = 1; // reset streak gently to 1 instead of 0 for kids
        }
        
        updatedStats.lastActiveDate = new Date().toDateString();
        setUserStats(updatedStats);
      } else {
        localStorage.setItem('be_hoc_tieng_viet_stats', JSON.stringify(DEFAULT_STATS));
      }
    } catch (e) {
      console.error("Localstorage stats parsing error:", e);
    }
  }, []);

  // Save stats helper
  const saveStats = (newStats: UserStats) => {
    setUserStats(newStats);
    try {
      localStorage.setItem('be_hoc_tieng_viet_stats', JSON.stringify(newStats));
    } catch (e) {
      console.error("Localstorage save error", e);
    }
  };

  // Save overrides helper
  const handleSaveOverrides = (newOverrides: Record<string, { customImage?: string; customAudio?: string }>) => {
    setOverrides(newOverrides);
    try {
      localStorage.setItem('be_hoc_tieng_viet_overrides', JSON.stringify(newOverrides));
    } catch (e) {
      console.error("Localstorage save overrides error", e);
    }
  };

  // Save customTopics helper
  const handleSaveCustomTopics = (newTopics: Topic[]) => {
    setCustomTopics(newTopics);
    try {
      localStorage.setItem('be_hoc_tieng_viet_custom_topics', JSON.stringify(newTopics));
    } catch (e) {
      console.error("Localstorage save custom topics error", e);
    }
  };

  // Reset entire syllabus to default config
  const handleResetSyllabus = () => {
    setCustomTopics(TOPICS);
    setOverrides({});
    try {
      localStorage.removeItem('be_hoc_tieng_viet_custom_topics');
      localStorage.removeItem('be_hoc_tieng_viet_overrides');
    } catch (e) {
      console.error("Localstorage removal error for syllabus reset", e);
    }
  };

  // Compute merged topics dynamically applying parents/teachers custom overrides (illustrations and voice pronunciation overrides)
  const mergedTopics = customTopics.map(topic => ({
    ...topic,
    items: topic.items.map(item => {
      const override = overrides[item.id];
      if (override) {
        return {
          ...item,
          customImage: override.customImage ?? item.customImage,
          customAudio: override.customAudio ?? item.customAudio
        };
      }
      return item;
    })
  }));

  // Trigger mathematical gate lock for teacher/parent entrance
  const handleTriggerParentLock = () => {
    const isPlus = Math.random() > 0.5;
    let query = '';
    let expected = 0;
    
    if (isPlus) {
      const n1 = Math.floor(Math.random() * 15) + 11; // 11 to 25
      const n2 = Math.floor(Math.random() * 9) + 4;   // 4 to 12
      query = `${n1} + ${n2} = ?`;
      expected = n1 + n2;
    } else {
      const n1 = Math.floor(Math.random() * 20) + 21; // 21 to 40
      const n2 = Math.floor(Math.random() * 12) + 5;  // 5 to 16
      query = `${n1} - ${n2} = ?`;
      expected = n1 - n2;
    }
    
    setParentMathQuestion({ q: query, a: expected });
    setParentMathInput('');
    setParentMathError(false);
    setIsParentLockOpen(true);
    playSoundEffect('click');
  };

  // Verify answer of parent math challenge
  const handleVerifyParentLock = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(parentMathInput.trim());
    if (parsed === parentMathQuestion.a) {
      setIsParentLockOpen(false);
      setCurrentView('teacher-portal');
      playSoundEffect('victory');
    } else {
      setParentMathError(true);
      setParentMathInput('');
      playSoundEffect('pop');
    }
  };

  // Reset progress logic
  const handleResetProgress = () => {
    if (window.confirm("Bố mẹ chắc chắn muốn đặt lại toàn bộ điểm số, quà và sao vàng của bé chứ? Bé sẽ học lại từ đầu nhé!")) {
      saveStats(DEFAULT_STATS);
      setSelectedTopic(null);
      setCurrentView('dashboard');
      playSoundEffect('pop');
    }
  };

  // Select a pre-defined learning topic
  const handleSelectTopic = (topicId: string) => {
    const topic = mergedTopics.find(t => t.id === topicId);
    if (topic) {
      setSelectedTopic(topic);
      setCurrentIndex(0);
      setPlayStep('puzzle');
      setCustomLessonItem(null);
      setCurrentView('active-play');
    }
  };

  // Custom generated lesson triggered
  const handleCustomLessonCreated = (customItem: LessonItem) => {
    setCustomLessonItem(customItem);
    setSelectedTopic(null);
    setCurrentIndex(0);
    setPlayStep('puzzle');
    setCurrentView('active-play');
  };

  // Skip step or complete puzzle
  const handlePuzzleCompleted = () => {
    setPlayStep('speech');
  };

  // Voice recording & feedback complete action
  const handleLessonItemFinished = (earnedStars: number, earnedCoins: number) => {
    const currentItem = customLessonItem || (selectedTopic ? selectedTopic.items[currentIndex] : null);
    if (!currentItem) return;

    // Build new progress stats
    const alreadyCompleted = userStats.completedIds.includes(currentItem.id);
    const updatedCompletedIds = alreadyCompleted 
      ? userStats.completedIds 
      : [...userStats.completedIds, currentItem.id];

    const todayStr = new Date().toDateString();
    let isNewDay = userStats.lastActiveDate !== todayStr;
    const newStreak = isNewDay ? userStats.streak + 1 : userStats.streak;

    const newStats: UserStats = {
      ...userStats,
      stars: userStats.stars + (alreadyCompleted ? 0 : earnedStars),
      coins: userStats.coins + (alreadyCompleted ? 1 : earnedCoins),
      completedIds: updatedCompletedIds,
      streak: newStreak,
      lastActiveDate: todayStr
    };

    saveStats(newStats);

    // If it is a custom generated topic, return immediately to custom planner
    if (customLessonItem) {
      setCurrentView('dashboard');
      setCustomLessonItem(null);
      return;
    }

    // Advance to next index under the same topic
    if (selectedTopic && currentIndex < selectedTopic.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setPlayStep('puzzle');
    } else {
      // Completed last lesson of this selected topic!
      // Trigger a beautiful audio victory fanare
      playSoundEffect('victory');
      setTimeout(() => {
        alert(`🎉 Chúc mừng bé yêu! Bé đã tốt nghiệp thành công chủ đề: "${selectedTopic?.name}". Nhận ngay vương miện và sao vàng danh giá! 🏆👑`);
        setSelectedTopic(null);
        setCurrentView('dashboard');
      }, 500);
    }
  };

  // Fallback trigger if index changes or manual navigations
  const activeItem = customLessonItem || (selectedTopic ? selectedTopic.items[currentIndex] : null);

  return (
    <div className="min-h-screen bg-sky-50 text-[#2D3436] flex flex-col justify-between" id="be-hoc-tieng-viet-app">
      
      {/* 🚀 Bubbly Navigation Header - Geometric Balance Style */}
      <header className="sticky top-0 bg-white border-b-4 border-yellow-400 z-50 py-3.5 px-6 shadow-sm" id="app-header">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
            <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center border-b-4 border-orange-600 shadow-sm text-2xl transform hover:rotate-3 transition-all">
              🐥
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-sky-900 tracking-tight bubble-font flex items-center gap-1.5 leading-none">
                <span>BÉ HỌC TIẾNG VIỆT</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-yellow-400 text-white rounded-lg border-b-2 border-yellow-600">
                  4 - 6 Tuổi
                </span>
              </h1>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mt-1">
                Phát âm chuẩn câu • Không bị ngược từ
              </p>
            </div>
          </div>

          {/* Controls: Voice Accent / Game scores */}
          <div className="flex items-center flex-wrap gap-4 justify-center">
            
            {/* Tone Toggle Accent (North / South) */}
            <div className="bg-slate-100 p-1 rounded-2xl border-2 border-slate-200 flex items-center gap-1">
              <button
                onClick={() => {
                  playSoundEffect('click');
                  setAccent('north');
                }}
                className={`flex items-center gap-1 text-xs font-black px-4 py-1.5 rounded-xl transition-all outline-none ${
                  accent === 'north' 
                    ? 'bg-white text-indigo-700 shadow-sm border-b-2 border-indigo-400' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>🎙️ Giọng Bắc</span>
              </button>
              <button
                onClick={() => {
                  playSoundEffect('click');
                  setAccent('south');
                }}
                className={`flex items-center gap-1 text-xs font-black px-4 py-1.5 rounded-xl transition-all outline-none ${
                  accent === 'south' 
                    ? 'bg-white text-indigo-700 shadow-sm border-b-2 border-indigo-400' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>📢 Giọng Nam</span>
              </button>
            </div>

            {/* Teacher/Parent Mode Button */}
            <button
              onClick={handleTriggerParentLock}
              className="flex items-center gap-1.5 text-xs font-black px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 border-b-4 border-b-indigo-400 text-indigo-800 rounded-2xl transition-all hover:scale-102 active:scale-95 cursor-pointer outline-none"
              title="Cấu hình giáo trình, sửa hình minh họa, thu âm giọng nói của tất cả bé hoặc bài giảng"
            >
              <LucideIcons.Settings className="w-4 h-4 text-indigo-600" />
              <span>Thầy Cô / Ba Mẹ</span>
            </button>

            {/* Kid Stats Dashboard */}
            <div className="flex items-center gap-2">
              {/* Daily Streak */}
              <div className="bg-orange-100 border-2 border-orange-200 text-orange-850 font-black text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5">
                <span>🔥</span>
                <span>{userStats.streak} ngày</span>
              </div>
              
              {/* Gold Star Count */}
              <div className="bg-yellow-50 border-2 border-yellow-250 text-yellow-800 font-black text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 relative group">
                <LucideIcons.Star className="w-4 h-4 text-yellow-500 fill-yellow-400 animate-pulse" />
                <span>{userStats.stars} sao</span>
              </div>

              {/* Coins Count */}
              <div className="bg-emerald-50 border-2 border-emerald-250 text-emerald-800 font-black text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5">
                <span>🪙</span>
                <span>{userStats.coins} vàng</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* 🎪 Main Content Stage Area */}
      <main className="flex-1 w-full py-6 md:py-8" id="primary-stage-game">
        <AnimatePresence mode="wait">
          
          {/* VIEW 1: TOPIC SELECTION DASHBOARD */}
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <Dashboard 
                topics={mergedTopics}
                userStats={userStats}
                onSelectTopic={handleSelectTopic}
                onOpenCustomLessonCreator={() => {
                  playSoundEffect('click');
                  setCurrentView('custom-creator');
                }}
              />
            </motion.div>
          )}

          {/* VIEW 2: CUSTOM TOPIC GENERATION WITH AI */}
          {currentView === 'custom-creator' && (
            <motion.div
              key="custom-creator"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <CustomLessonCreator 
                onBackToDashboard={() => setCurrentView('dashboard')}
                onLessonCreated={handleCustomLessonCreated}
              />
            </motion.div>
          )}

          {/* VIEW 4: TEACHER & PARENT CONFIGURATION PORTAL */}
          {currentView === 'teacher-portal' && (
            <motion.div
              key="teacher-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <TeacherPortal 
                topics={mergedTopics}
                onSaveTopics={handleSaveCustomTopics}
                onResetSyllabus={handleResetSyllabus}
                overrides={overrides}
                onSaveOverrides={handleSaveOverrides}
                onBackToDashboard={() => setCurrentView('dashboard')}
              />
            </motion.div>
          )}

          {/* VIEW 3: ACTIVE PLAY ZONE (WORD SORTING & SPEECH TUTORING) */}
          {currentView === 'active-play' && activeItem && (
            <motion.div
              key="active-play"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto px-4"
              id="active-playing-zone"
            >
              {/* Game Level Indicator Header */}
              <div className="bg-white border-2 border-l-2 border-r-2 border-t-2 border-slate-200 border-b-6 border-b-slate-300 rounded-[28px] p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Topic Title */}
                <div className="flex items-center gap-3">
                  <div className="text-3xl filter drop-shadow-xs">
                    {customLessonItem ? "✨" : selectedTopic?.emoji}
                  </div>
                  <div>
                    <h5 className="font-black text-sky-950 text-base leading-tight">
                      {customLessonItem ? "BÀI HỌC THẦN CHÚ AI" : selectedTopic?.name.toUpperCase()}
                    </h5>
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mt-1">
                      {customLessonItem ? "Chủ đề bé tự chọn" : `Phần ${currentIndex + 1} • Nhóm ${activeItem.difficulty}`}
                    </p>
                  </div>
                </div>

                {/* Visual Bubble Step progress indicators */}
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <div className="flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-inner gap-1.5">
                    {/* Previous lesson button */}
                    {selectedTopic && selectedTopic.items.length > 1 && (
                      <button
                        onClick={() => {
                          if (currentIndex > 0) {
                            playSoundEffect('click');
                            setCurrentIndex(currentIndex - 1);
                            setPlayStep('puzzle');
                          }
                        }}
                        disabled={currentIndex === 0}
                        className={`w-7 h-7 rounded-lg font-black flex items-center justify-center border transition-all cursor-pointer outline-none ${
                          currentIndex === 0
                            ? 'bg-gray-55 border-gray-150 text-gray-300 cursor-not-allowed opacity-40'
                            : 'bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 active:scale-95'
                        }`}
                        title="Bài trước"
                      >
                        <LucideIcons.ChevronLeft className="w-3.5 h-3.5 stroke-[3.5]" />
                      </button>
                    )}

                    {/* Interactive numbered circles */}
                    {selectedTopic && selectedTopic.items.map((item, idx) => (
                      <button 
                        key={item.id}
                        onClick={() => {
                          playSoundEffect('click');
                          setCurrentIndex(idx);
                          setPlayStep('puzzle');
                        }}
                        title={`Bài ${idx + 1}`}
                        className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-indigo-100 ${
                          idx === currentIndex 
                            ? 'bg-amber-400 border-amber-500 text-amber-950 scale-110 shadow-xs' 
                            : idx < currentIndex 
                              ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800' 
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    {/* Next lesson button */}
                    {selectedTopic && selectedTopic.items.length > 1 && (
                      <button
                        onClick={() => {
                          if (currentIndex < selectedTopic.items.length - 1) {
                            playSoundEffect('click');
                            setCurrentIndex(currentIndex + 1);
                            setPlayStep('puzzle');
                          }
                        }}
                        disabled={currentIndex === selectedTopic.items.length - 1}
                        className={`w-7 h-7 rounded-lg font-black flex items-center justify-center border transition-all cursor-pointer outline-none ${
                          currentIndex === selectedTopic.items.length - 1
                            ? 'bg-gray-55 border-gray-200 text-gray-300 cursor-not-allowed opacity-40'
                            : 'bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 active:scale-95'
                        }`}
                        title="Bài sau"
                      >
                        <LucideIcons.ChevronRight className="w-3.5 h-3.5 stroke-[3.5]" />
                      </button>
                    )}
                  </div>

                  {/* Puzzle Step indicator */}
                  <div className="flex items-center bg-slate-100 rounded-2xl p-1 text-xs font-black text-gray-500 border border-slate-200">
                    <button
                      onClick={() => {
                        playSoundEffect('click');
                        setPlayStep('puzzle');
                      }}
                      className={`px-4 py-2 rounded-xl transition-all cursor-pointer outline-none ${playStep === 'puzzle' ? 'bg-amber-400 text-white font-black border-b-2 border-b-amber-600' : 'text-slate-500'}`}
                    >
                      🧩 Ghép Câu
                    </button>
                    <button
                      onClick={() => {
                        playSoundEffect('click');
                        setPlayStep('speech');
                      }}
                      className={`px-4 py-2 rounded-xl transition-all cursor-pointer outline-none ${playStep === 'speech' ? 'bg-indigo-500 text-white font-black border-b-2 border-b-indigo-700' : 'text-slate-500'}`}
                    >
                      🎙️ Luyện Âm
                    </button>
                  </div>
                </div>

              </div>

              {/* Conditional step render */}
              {playStep === 'puzzle' ? (
                <SentenceBuilder 
                  key={activeItem.id}
                  item={activeItem}
                  accent={accent}
                  onCompleted={handlePuzzleCompleted}
                  onBackToTopic={() => setCurrentView('dashboard')}
                />
              ) : (
                <AudioTutor 
                  key={activeItem.id}
                  item={activeItem}
                  accent={accent}
                  onCompletedLessons={handleLessonItemFinished}
                  onBackToTopic={() => setCurrentView('dashboard')}
                  onBackToPuzzle={() => setPlayStep('puzzle')}
                />
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 🏡 Parents' Counseling Portal / Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-10 border-t-4 border-slate-900" id="parents-counseling-footer">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left panel - core goal and settings */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm flex items-center gap-2 font-display">
              <span>🐥 Ứng Dụng Bé Học Tiếng Việt Chuẩn Câu</span>
            </h4>
            <p className="text-slate-400 leading-relaxed text-xs">
              Được thiết kế tỉ mỉ khoa học dành riêng cho trẻ em tiền tiểu học từ 4 đến 6 tuổi. Ứng dụng giải quyết triệt để tình trạng nói ngược câu ở trẻ bằng cách giúp trẻ lắp ghép các vế câu chuẩn xác, rèn luyện tư duy ngữ pháp tự nhiên thông qua bối cảnh sinh hoạt thường ngày.
            </p>
            
            {/* Setting actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button 
                onClick={handleResetProgress}
                className="text-rose-400 hover:text-rose-300 font-extrabold bg-rose-950/40 border border-rose-900/50 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              >
                🧹 Xóa lịch sử học của bé
              </button>
              <button 
                onClick={handleTriggerParentLock}
                className="text-cyan-400 hover:text-cyan-300 font-extrabold bg-cyan-950/40 border border-cyan-900/50 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                title="Sửa hình minh họa & tệp phát âm của giáo lý"
              >
                <span>⚙️ Chế độ Giáo Viên / Cha Mẹ</span>
              </button>
            </div>
          </div>

          {/* Right panel - Parent tips */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
            <h5 className="text-amber-400 font-bold text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
              <span>💡 Dành Cho Ba Mẹ: Cách Sửa Lỗi Bé Nói Ngược Câu</span>
            </h5>
            <ol className="list-decimal pl-4 space-y-2 text-[11px] text-slate-300 leading-relaxed font-sans">
              <li>
                <strong>Tránh chỉ trích hoặc chế giễu:</strong> Khi trẻ nói ngược câu (như &ldquo;Bóng mua ba cho bé&rdquo;), ba mẹ hãy ôm bé nhẹ nhàng và lặp lại câu đúng ngữ pháp: &ldquo;À, ba mua quả bóng tròn tặng bé đúng hông nè!&rdquo;.
              </li>
              <li>
                <strong>Học cụ quan trực quan:</strong> Cho trẻ chơi xếp các thẻ từ vựng hành động xếp tương ứng giống như Game 1 của ứng dụng giúp tay - mắt - tai bé liên kết logic chặt chẽ.
              </li>
              <li>
                <strong>Kiên nhẫn đối chiếu:</strong> Dùng ghi âm của ứng dụng cho bé nghe giọng của mình dưới giọng cô giáo giảng dạy để tự bé điều chỉnh rành mạch, hình thành vốn câu chuẩn nhất.
              </li>
            </ol>
          </div>

        </div>

        <div className="max-w-5xl mx-auto px-6 mt-10 pt-4 border-t border-slate-900 text-center text-slate-600 font-sans text-[10px]">
          &copy; 2026 Bé Học Tiếng Việt. Sáng tạo bền bỉ cho tương lai trẻ thơ Việt Nam.
        </div>
      </footer>

      {/* 🔒 Parent Gate Lock Modal - High-fidelity visual security challenge */}
      <AnimatePresence>
        {isParentLockOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-150 flex items-center justify-center p-4" id="parent-lock-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] border-4 border-yellow-400 p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="mx-auto w-14 h-14 bg-indigo-50 border-2 border-indigo-100 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-inner">
                🔒
              </div>

              <h4 className="text-base font-black text-sky-950 uppercase tracking-tight font-sans">
                VÙNG BẢO MẬT CHO CHA MẸ
              </h4>
              <p className="text-[11px] text-slate-500 font-bold mt-2 leading-relaxed">
                Bé ơi, đây là khu vực chỉnh sửa giáo án dành cho Thầy Cô & Ba Mẹ! Phụ huynh vui lòng giải bài toán nhỏ dưới đây để tiếp tục nhé:
              </p>

              {/* Math Question Container */}
              <div className="my-5 bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-6 flex items-center justify-center gap-2">
                <span className="text-lg font-extrabold text-indigo-900 tracking-wider font-mono">
                  {parentMathQuestion.q}
                </span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleVerifyParentLock} className="space-y-4">
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="Nhập kết quả..."
                  value={parentMathInput}
                  onChange={(e) => setParentMathInput(e.target.value)}
                  className="w-full text-center text-base font-black tracking-widest text-slate-800 bg-slate-50 border-2 border-slate-200 focus:border-indigo-400 p-2.5 rounded-xl outline-none transition-all placeholder:text-slate-300 font-mono"
                />

                {parentMathError && (
                  <p className="text-xs font-black text-rose-500 flex items-center justify-center gap-1">
                    <LucideIcons.AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Kết quả chưa đúng, ba mẹ thử lại nhé!</span>
                  </p>
                )}

                {/* Submits and Controls */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playSoundEffect('pop');
                      setIsParentLockOpen(false);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-600 font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 border-2 border-indigo-800 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <LucideIcons.CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>XÁC NHẬN</span>
                  </button>
                </div>
              </form>

              <div className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                Xác thực thông minh chống trẻ em bấm nhầm
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
