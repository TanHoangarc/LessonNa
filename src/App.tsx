import React, { useState, useEffect } from 'react';
import { Topic, LessonItem, UserStats, AudioHotspot } from './types';
import { TOPICS } from './data/lessons';
import Dashboard from './components/Dashboard';
import SentenceBuilder from './components/SentenceBuilder';
import AudioTutor from './components/AudioTutor';
import { MathTutor } from './components/MathTutor';
import CustomLessonCreator from './components/CustomLessonCreator';
import TeacherPortal from './components/TeacherPortal';
import LearningGames from './components/LearningGames';
import SongsRoom from './components/SongsRoom';
import { playSoundEffect, playVietnameseText } from './utils/audioHelper';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getMathIllustrations, saveMathIllustrations, getCustomSounds, saveCustomSounds } from './utils/mathLibraryHelper';
import { syncDataToFirebase, loadDataFromFirebase } from './utils/firebaseHelper';

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
  // App views: 'dashboard' | 'active-play' | 'custom-creator' | 'teacher-portal' | 'games' | 'songs'
  const [currentView, setCurrentView] = useState<'dashboard' | 'active-play' | 'custom-creator' | 'teacher-portal' | 'games' | 'songs'>('dashboard');
  const [preferredGame, setPreferredGame] = useState<'jigsaw' | 'farm'>('jigsaw');
  
  // Audio accent: 'north' | 'south'
  const [accent, setAccent] = useState<'north' | 'south'>('north');

  // Option setting to show/hide "Lời thú vị / Lời gắm thêm"
  const [showFunFact, setShowFunFact] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('be_hoc_tieng_viet_show_funfact');
      return saved !== 'false'; // default is true
    } catch {
      return true;
    }
  });

  const handleToggleFunFact = (val: boolean) => {
    setShowFunFact(val);
    try {
      localStorage.setItem('be_hoc_tieng_viet_show_funfact', val.toString());
    } catch {}
  };

  // Custom visual/auditory overrides loading for topics & items
  const [overrides, setOverrides] = useState<Record<string, { customImage?: string; customAudio?: string; audioHotspots?: AudioHotspot[] }>>(() => {
    try {
      const savedOverrides = localStorage.getItem('be_hoc_tieng_viet_overrides_v2');
      return savedOverrides ? JSON.parse(savedOverrides) : {};
    } catch (e) {
      return {};
    }
  });

  // User customized topics list
  const [customTopics, setCustomTopics] = useState<Topic[]>(() => {
    try {
      const savedTopics = localStorage.getItem('be_hoc_tieng_viet_custom_topics_v2');
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
  const handleSaveOverrides = (newOverrides: Record<string, { customImage?: string; customAudio?: string; audioHotspots?: AudioHotspot[] }>) => {
    setOverrides(newOverrides);
    try {
      localStorage.setItem('be_hoc_tieng_viet_overrides_v2', JSON.stringify(newOverrides));
    } catch (e) {
      console.error("Localstorage save overrides error", e);
    }
  };

  // Save customTopics helper
  const handleSaveCustomTopics = (newTopics: Topic[]) => {
    setCustomTopics(newTopics);
    try {
      localStorage.setItem('be_hoc_tieng_viet_custom_topics_v2', JSON.stringify(newTopics));
    } catch (e) {
      console.error("Localstorage save custom topics error", e);
    }
  };

  // Reset entire syllabus to default config
  const handleResetSyllabus = () => {
    setCustomTopics(TOPICS);
    setOverrides({});
    try {
      localStorage.removeItem('be_hoc_tieng_viet_custom_topics_v2');
      localStorage.removeItem('be_hoc_tieng_viet_overrides_v2');
    } catch (e) {
      console.error("Localstorage removal error for syllabus reset", e);
    }
  };

  const handleFirebaseBackup = async () => {
    try {
      const data = {
        userStats,
        overrides,
        customTopics,
        showFunFact,
        mathLibrary: getMathIllustrations(),
        customSounds: getCustomSounds(),
        farmApples: localStorage.getItem('be_hoc_tieng_viet_farm_apples')
      };
      return await syncDataToFirebase(data);
    } catch (error) {
      console.error("Firebase backup error", error);
      return false;
    }
  };

  const handleFirebaseRestore = async () => {
    try {
      const data = await loadDataFromFirebase();
      if (!data) return false;
      
      if (data.userStats) saveStats(data.userStats);
      if (data.overrides) handleSaveOverrides(data.overrides);
      if (data.customTopics) handleSaveCustomTopics(data.customTopics);
      if (data.showFunFact !== undefined) handleToggleFunFact(data.showFunFact);
      
      if (data.mathLibrary) {
        saveMathIllustrations(data.mathLibrary);
        window.dispatchEvent(new Event('math-library-updated'));
      }
      
      if (data.customSounds) {
        saveCustomSounds(data.customSounds);
      }
      
      if (data.farmApples !== undefined && data.farmApples !== null) {
        localStorage.setItem('be_hoc_tieng_viet_farm_apples', data.farmApples);
      }
      
      return true;
    } catch (error) {
      console.error("Firebase restore error", error);
      return false;
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
          customAudio: override.customAudio ?? item.customAudio,
          audioHotspots: override.audioHotspots ?? item.audioHotspots
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
    <div className="min-h-screen bg-gradient-to-b from-[#E28014] via-[#F89C1E] to-[#F17513] text-[#2D3436] font-sans flex flex-col justify-center items-center py-5 px-4 md:py-8 md:px-10 relative overflow-hidden" id="be-hoc-tieng-viet-app">
      
      {/* 🍁 Scenic autumn leaves and bubbles in the background (exactly matching bottom corner details of screenshot) */}
      <div className="absolute -bottom-8 -right-8 text-[140px] opacity-25 pointer-events-none select-none rotate-45 select-none animate-bounce-slow">
        🍁
      </div>
      <div className="absolute -bottom-6 -left-6 text-[100px] opacity-20 pointer-events-none select-none rotate-[-30deg] select-none">
        🍁
      </div>
      <div className="absolute top-1/4 -right-10 text-6xl opacity-10 pointer-events-none select-none">
        ☁️
      </div>
      <div className="absolute top-10 left-1/3 text-4xl opacity-10 pointer-events-none select-none">
        ☁️
      </div>

      {/* 🌟 Top row floating status buttons (Directly recreated from the reference screenshot corners!) */}
      {/* Top-Left Floating Circle Buttons */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-30 flex items-center gap-2 sm:gap-3.5 select-none animate-fade-in">
        {/* Profile Avatar Button with status indicator */}
        <div 
          onClick={() => { playSoundEffect('click'); playVietnameseText("Xin chào bé yêu! Cùng bé tập nói, rèn chữ và tích lũy thật nhiều cà rốt nhé!"); }}
          className="w-11 h-11 sm:w-14 sm:h-14 bg-[#FFC048] rounded-full border-[4px] sm:border-[5.5px] border-white shadow-[0_6px_12px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-pointer transform active:scale-90 hover:scale-105 transition-all text-xl sm:text-2xl relative"
        >
          🐱
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
        </div>
      </div>

      {/* Top-Right Floating Circle Buttons */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-30 flex items-center gap-2 sm:gap-3.5 select-none animate-fade-in">
        {/* Parent Portal lock / settings button */}
        <div 
          onClick={() => { playSoundEffect('click'); handleTriggerParentLock(); }}
          className="w-9 h-9 sm:w-12 sm:h-12 bg-[#FFC048] rounded-full border-[4px] sm:border-[5px] border-white shadow-[0_6px_12px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-pointer transform active:scale-90 hover:scale-105 transition-all text-base sm:text-lg"
          title="Khu vực của Cha Mẹ / Giáo viên"
        >
          ⚙️
        </div>
      </div>

      {/* 🎪 THE MAGICAL "LEARNING MACHINE" CONSOLE (Thick rounded white frame border modeled from screenshot) */}
      <div className="bg-[#FFFDF3] rounded-[48px] md:rounded-[56px] border-[14px] md:border-[18px] border-white shadow-[0_24px_65px_rgba(0,0,0,0.22)] p-4 md:p-6 max-w-6xl w-full relative overflow-hidden flex flex-col justify-between min-h-[690px] pt-14 md:pt-16" id="learning-machine-console">
        
        {/* Decorative thin sweet inner screen accent border */}
        <div className="absolute inset-0 border-[3px] border-[#FFF8DE] rounded-[28px] md:rounded-[36px] pointer-events-none z-0"></div>

        {/* 🚀 INTERNAL TOY CONSOLE HEADER FOR STATS DISPLAY */}
        <header className="relative z-10 flex items-center justify-between gap-4 border-b-2 border-dashed border-[#F39C12]/15 pb-4 mb-4" id="tablet-header">
          
          {/* Carrot points pill & Active streak count to show metric health */}
          <div className="flex items-center gap-2.5">
            {/* Currency Carrot Badging */}
            <div className="bg-orange-50 border border-orange-100 p-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="text-sm animate-bounce-slow">🥕</span>
              <span className="text-xs font-black text-[#D35400] font-mono">{userStats.coins * 105 || 1260}</span>
            </div>

            {/* Streak Indicator */}
            <div className="bg-amber-50 border border-amber-100 p-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="text-xs">🔥</span>
              <span className="text-[10px] font-black text-amber-950 font-sans">{userStats.streak} ngày</span>
            </div>
          </div>

          {/* Kid-friendly Main Top Navigation Tabs */}
          <div className="flex bg-slate-100/95 p-1 rounded-2xl border border-slate-200/50 font-sans shadow-2xs">
            <button
              onClick={() => {
                if (currentView !== 'dashboard') {
                  playSoundEffect('click');
                  setCurrentView('dashboard');
                }
              }}
              className={`text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 rounded-xl transition-all outline-none flex items-center gap-1 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white text-orange-600 shadow-xs border-b-2 border-orange-400'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🏠 Học Bài</span>
            </button>
            <button
              onClick={() => {
                if (currentView !== 'games') {
                  playSoundEffect('click');
                  setCurrentView('games');
                }
              }}
              className={`text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 rounded-xl transition-all outline-none flex items-center gap-1 cursor-pointer ${
                currentView === 'games'
                  ? 'bg-white text-amber-600 shadow-xs border-b-2 border-amber-400'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🎮 Trò Chơi</span>
            </button>
            <button
              onClick={() => {
                if (currentView !== 'songs') {
                  playSoundEffect('click');
                  setCurrentView('songs');
                }
              }}
              className={`text-[10px] sm:text-xs font-black px-2.5 sm:px-4 py-1.5 rounded-xl transition-all outline-none flex items-center gap-1 cursor-pointer ${
                currentView === 'songs'
                  ? 'bg-white text-indigo-600 shadow-xs border-b-2 border-indigo-400'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🎵 Ca Hát</span>
            </button>
          </div>

          {/* Current view subtitle */}
          <div className="text-right hidden md:block">
            <span className="text-[9px] font-black tracking-widest text-[#E67E22] uppercase bg-[#FFF2E0] px-2.5 py-0.5 rounded-full border border-[#FAD7A0]">
              {currentView === 'dashboard' ? 'Trải nghiệm học' : currentView === 'games' ? 'Đấu trường trò chơi' : currentView === 'songs' ? 'Hòa âm âm nhạc' : 'Vùng tùy chỉnh'}
            </span>
          </div>

        </header>

        {/* 🎪 VIEW CONSOLE DISPLAY SCREEN PORT */}
        <main className="flex-1 w-full relative z-10 py-2" id="primary-stage-game">
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
                  onNavigateToView={(view, subTab) => {
                    setCurrentView(view);
                    if (view === 'games' && subTab) {
                      setPreferredGame(subTab as 'jigsaw' | 'farm');
                    }
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
                  showFunFact={showFunFact}
                  onToggleFunFact={handleToggleFunFact}
                  onFirebaseBackup={handleFirebaseBackup}
                  onFirebaseRestore={handleFirebaseRestore}
                />
              </motion.div>
            )}

            {/* VIEW 5: INTEGRATED INTUITIVE LEARNING GAMES */}
            {currentView === 'games' && (
              <motion.div
                key="games-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <LearningGames 
                  userStats={userStats}
                  onUpdateStats={saveStats}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  initialGame={preferredGame}
                />
              </motion.div>
            )}

            {/* VIEW 6: INTEGRATED NURSERY RHYMES SONGS ROOM */}
            {currentView === 'songs' && (
              <motion.div
                key="songs-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <SongsRoom 
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  accent={accent}
                  onAwardCoins={(earned) => {
                    const updated = {
                      ...userStats,
                      coins: userStats.coins + earned
                    };
                    saveStats(updated);
                  }}
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
                className="max-w-4xl mx-auto px-1"
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
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 active:scale-95'
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
                              ? 'bg-[#FFEB33] border-yellow-500 text-yellow-950 scale-110 shadow-xs' 
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
                              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 active:scale-95'
                          }`}
                          title="Bài sau"
                        >
                          <LucideIcons.ChevronRight className="w-3.5 h-3.5 stroke-[3.5]" />
                        </button>
                      )}
                    </div>

                    {/* Puzzle Step indicator */}
                    {activeItem.type !== 'math' && (
                      <div className="flex items-center bg-slate-100 rounded-2xl p-1 text-xs font-black text-gray-500 border border-slate-200">
                        <button
                          onClick={() => {
                            playSoundEffect('click');
                            setPlayStep('puzzle');
                          }}
                          className={`px-4 py-2 rounded-xl transition-all cursor-pointer outline-none ${playStep === 'puzzle' ? 'bg-amber-400 text-white font-black border-b-2 border-b-amber-600' : 'text-slate-500'}`}
                        >
                          {selectedTopic?.id === 'danh-van' || selectedTopic?.isSpelling ? '🧩 Ghép Vần' : '🧩 Ghép Câu'}
                        </button>
                        <button
                          onClick={() => {
                            playSoundEffect('click');
                            setPlayStep('speech');
                          }}
                          className={`px-4 py-2 rounded-xl transition-all cursor-pointer outline-none ${playStep === 'speech' ? 'bg-indigo-500 text-white font-black border-b-2 border-b-indigo-700' : 'text-slate-500'}`}
                        >
                          {selectedTopic?.id === 'danh-van' || selectedTopic?.isSpelling ? '🎙️ Đánh Vần' : '🎙️ Luyện Âm'}
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Conditional step render */}
                {activeItem.type === 'math' ? (
                  <MathTutor
                    key={activeItem.id}
                    item={activeItem}
                    onCompleted={handleLessonItemFinished}
                  />
                ) : playStep === 'puzzle' ? (
                  <SentenceBuilder 
                    key={activeItem.id}
                    item={activeItem}
                    accent={accent}
                    onCompleted={handlePuzzleCompleted}
                    onBackToTopic={() => setCurrentView('dashboard')}
                    showFunFact={showFunFact}
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

      </div>

      {/* 🏡 PARENTS' INFORMATION COUNSEL FOOTER BLOCK */}
      <footer className="mt-12 max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-amber-950 font-sans relative z-10 px-4" id="counsel-footer">
        
        {/* Left footer card: Goals */}
        <div className="bg-[#FFFCE4]/90 p-6 rounded-[32px] border-2 border-yellow-300 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 bubble-font uppercase">
              <span>🐥 Phương pháp nói chuẩn câu</span>
            </h4>
            <p className="text-[11px] font-semibold text-amber-950/80 leading-relaxed mt-2.5">
              Được thiết kế tỉ mỉ khoa học dành riêng cho trẻ từ 4 đến 6 tuổi. Ứng dụng giải quyết triệt để tình trạng nói ngược câu ở trẻ bằng cách hỗ trợ ghép từ vế logic và rèn nắn thanh âm ấm áp rành mạch.
            </p>
          </div>
          
          <div className="pt-4 flex flex-wrap gap-2.5">
            <button 
              onClick={handleResetProgress}
              className="text-[10px] uppercase font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              🧹 Đặt lại toàn bộ điểm số
            </button>
            <button 
              onClick={handleTriggerParentLock}
              className="text-[10px] uppercase font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              ⚙️ Cấu hình học
            </button>
          </div>
        </div>

        {/* Right footer card: Tips */}
        <div className="bg-[#FFFCE4]/90 p-6 rounded-[32px] border-2 border-yellow-300 shadow-sm">
          <h5 className="text-xs uppercase tracking-wider font-extrabold text-amber-900 flex items-center gap-1">
            <span>💡 Mẹo hay cho ba mẹ dạy con tiếng Việt</span>
          </h5>
          <ul className="list-disc pl-4 space-y-2 text-[10.5px] font-semibold text-slate-800 leading-relaxed mt-3">
            <li><strong>Nhắc khéo vui vẻ:</strong> Khi con nói ngược, ba mẹ trán dịu dắt vế câu chuẩn để não con phản xạ tự nhiên.</li>
            <li><strong>Ghi âm đối chứng:</strong> Sử dụng âm thanh hướng dẫn trên máy để bé mô phỏng theo ngữ điệu dễ thương của cô.</li>
            <li><strong>Mở khóa sticker:</strong> Tặng trẻ động viên bằng carrot sau mỗi bài thơ, bài hát ghép vần rành mạch nhé!</li>
          </ul>
        </div>

      </footer>

      {/* Brand Watermark on the bottom corner */}
      <div className="absolute bottom-4 right-6 text-amber-900/40 text-xs font-black font-display pointer-events-none select-none flex items-center gap-1">
        <span>BY CCT</span>
        <span>🤖</span>
      </div>

      {/* 🔒 Parent Gate Lock Modal */}
      <AnimatePresence>
        {isParentLockOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-150 flex items-center justify-center p-4 animate-fade-in" id="parent-lock-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] border-4 border-[#F2B922] p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="mx-auto w-14 h-14 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-inner">
                🔒
              </div>

              <h4 className="text-base font-black text-sky-950 uppercase tracking-tight font-sans">
                VÙNG BẢO MẬT CHO CHA MẸ
              </h4>
              <p className="text-[11px] text-slate-500 font-bold mt-2 leading-relaxed">
                Phụ huynh vui lòng giải bài toán nhỏ dưới đây để tiếp cận cài đặt sửa đổi chương trình học nhé con:
              </p>

              {/* Math Question Container */}
              <div className="my-5 bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-6 flex items-center justify-center gap-2">
                <span className="text-lg font-extrabold text-amber-900 tracking-wider font-mono">
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
                  className="w-full text-center text-base font-black tracking-widest text-slate-800 bg-slate-50 border-2 border-slate-200 focus:border-amber-400 p-2.5 rounded-xl outline-none transition-all placeholder:text-slate-300 font-mono"
                />

                {parentMathError && (
                  <p className="text-xs font-black text-rose-500 flex items-center justify-center gap-1 animate-shake">
                    <LucideIcons.AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Kết quả chưa đúng, ba mẹ kiểm tra lại nhé!</span>
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
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <LucideIcons.CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>XÁC NHẬN</span>
                  </button>
                </div>
              </form>

              <div className="mt-4 text-[9px] font-bold text-slate-450 uppercase tracking-widest">
                Xác thực thông minh chống trẻ em nghịch nghịch
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
