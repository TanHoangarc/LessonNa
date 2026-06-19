import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Topic, UserStats } from '../types';
import { motion } from 'motion/react';
import { playSoundEffect, playVietnameseText } from '../utils/audioHelper';

interface DashboardProps {
  topics: Topic[];
  userStats: UserStats;
  onSelectTopic: (topicId: string) => void;
  onOpenCustomLessonCreator: () => void;
  onNavigateToView?: (view: 'dashboard' | 'games' | 'songs', subTab?: string) => void;
}

export default function Dashboard({
  topics,
  userStats,
  onSelectTopic,
  onOpenCustomLessonCreator,
  onNavigateToView
}: DashboardProps) {
  // Category classification state (Q&A vs Phonics/Spelling vs Math)
  const [activeCategory, setActiveCategory] = useState<'quest' | 'spelling' | 'math'>('quest');
  const [activePill, setActivePill] = useState<string>('ghep'); // Active sidebar mode

  // Stable state for daily training tasks (1 Ghép câu, 1 Ghép chữ, 1 Học toán, 1 Trò chơi)
  const [dailyTasks, setDailyTasks] = useState<{
    sentence: Topic | null;
    spelling: Topic | null;
    math: Topic | null;
    game: 'jigsaw' | 'farm';
  } | null>(null);

  useEffect(() => {
    if (topics && topics.length > 0 && !dailyTasks) {
      // 1. Get a random topic for Ghép câu
      const sentenceList = topics.filter(t => t.id !== 'danh-van' && !t.isSpelling && t.id !== 'toan' && !t.isMath);
      const chosenSentence = sentenceList.length > 0
        ? sentenceList[Math.floor(Math.random() * sentenceList.length)]
        : topics.find(t => t.id === 'dong-vat') || topics[0];

      // 2. Get a random topic for Ghép chữ / Đánh vần
      const spellingList = topics.filter(t => t.id === 'danh-van' || t.isSpelling);
      const chosenSpelling = spellingList.length > 0
        ? spellingList[Math.floor(Math.random() * spellingList.length)]
        : topics.find(t => t.id === 'danh-van') || topics[0];

      // 3. Get a random topic for Học toán
      const mathList = topics.filter(t => t.id === 'toan' || t.isMath);
      const chosenMath = mathList.length > 0
        ? mathList[Math.floor(Math.random() * mathList.length)]
        : topics.find(t => t.id === 'toan') || topics[0];

      // 4. Get a random game
      const chosenGame = Math.random() < 0.5 ? 'jigsaw' : 'farm';

      setDailyTasks({
        sentence: chosenSentence || null,
        spelling: chosenSpelling || null,
        math: chosenMath || null,
        game: chosenGame
      });
    }
  }, [topics, dailyTasks]);

  // Fallbacks for zero-flicker during mount
  const activeSentence = dailyTasks?.sentence || topics.find(t => t.id === 'dong-vat') || topics[0] || null;
  const activeSpelling = dailyTasks?.spelling || topics.find(t => t.id === 'danh-van') || (topics.length > 0 ? topics[topics.length - 1] : null);
  const activeMath = dailyTasks?.math || topics.find(t => t.id === 'toan') || null;
  const activeGame = dailyTasks?.game || 'jigsaw';

  const scrollToHeader = () => {
    setTimeout(() => {
      const element = document.getElementById('topic-scroller-header');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  };

  // Safe icon lookup function
  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Star;
    return <IconComponent className="w-6 h-6 text-indigo-600" />;
  };

  // Grouping criteria
  const questionAnswerTopics = topics.filter(t => t.id !== 'danh-van' && !t.isSpelling && t.id !== 'toan' && !t.isMath);
  const spellingTopics = topics.filter(t => t.id === 'danh-van' || t.isSpelling);
  const mathTopics = topics.filter(t => t.id === 'toan' || t.isMath);
  const filteredTopics = activeCategory === 'quest' 
    ? questionAnswerTopics 
    : activeCategory === 'spelling' 
      ? spellingTopics 
      : mathTopics;

  // Handles clicking on the vertical mode capsules
  const handlePillClick = (mode: string) => {
    playSoundEffect('click');
    setActivePill(mode);
    if (mode === 'doc') {
      setActiveCategory('spelling');
    } else if (mode === 'ghep') {
      setActiveCategory('quest');
    }
  };

  // Featured recommendation lesson from current topics
  const featuredTopic = topics.find(t => t.id === 'dong-vat') || topics[0] || null;
  const activeSpellingTopic = topics.find(t => t.id === 'danh-van') || topics[topics.length - 1] || null;

  return (
    <div className="w-full flex flex-col gap-8" id="dashboard-machine-view">
      
      {/* 🌟 1. Top Section: Kids Learning Machine bento grid (Direct Recreation from reference) 🌟 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="reference-bento-grid">
        
        {/* A. LEFT CORNER CARD: Nhiệm vụ luyện tập ("Training Tasks") */}
        <div className="lg:col-span-4 bg-[#FFFEE5]/95 rounded-[40px] p-6 border-[8px] md:border-[10px] border-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] relative overflow-hidden h-[420px] flex flex-col justify-between" id="tasks-card">
          {/* Stick-out Giraffe/Animal illustration indicator */}
          <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20 transform translate-x-4 -translate-y-4">
            <span className="text-7xl">🦒</span>
          </div>

          <div>
            <span className="text-[9px] font-black tracking-widest text-[#E67E22] uppercase bg-[#FFF2E0] px-3 py-1 rounded-full border border-[#FAD7A0]">
              NHIỆM VỤ HÀNG NGÀY
            </span>
            <h3 className="text-lg font-black text-[#5C3C10] mt-2.5 bubble-font flex items-center gap-1.5">
              <span>Nhiệm vụ luyện tập</span>
              <span className="text-sm">🎯</span>
            </h3>
            <p className="text-[11px] text-[#A0522D] font-extrabold mt-0.5 opacity-80">
              Mỗi ngày 15 phút nói lời ngọt ngào
            </p>

            {/* List of 4 Interactive tasks */}
            <div className="space-y-2 mt-4">
              {/* Task row 1: Ghép câu */}
              <div 
                onClick={() => { playSoundEffect('click'); if (activeSentence) onSelectTopic(activeSentence.id); }}
                className="flex items-center justify-between p-2 bg-[#FFFCEE] hover:bg-[#FFF8D4] border border-[#F5E1B8] rounded-[20px] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-400 text-white flex items-center justify-center text-lg font-black border-b-2 border-orange-600 overflow-hidden select-none shrink-0">
                    {activeSentence?.emoji && (activeSentence.emoji.startsWith('http') || activeSentence.emoji.startsWith('/') || activeSentence.emoji.startsWith('data:')) ? (
                      <img src={activeSentence.emoji} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{activeSentence?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-black text-[#6F4E24]">{activeSentence?.name || "Từ động vật"}</span>
                    <span className="block text-[9px] text-[#A0522D]/70 font-semibold truncate max-w-[150px]">
                      {activeSentence?.id === 'dong-vat' ? 'Tập nói trôi chảy' : activeSentence?.description?.split('.')[0] || 'Phát âm chuẩn câu'}
                    </span>
                  </div>
                </div>
                <button className="text-[9px] font-black text-white bg-orange-500 px-2.5 py-1 rounded-full border-b-2 border-orange-700 shrink-0">
                  Đi học
                </button>
              </div>

              {/* Task row 2: Ghép chữ / Đánh vần */}
              <div 
                onClick={() => { playSoundEffect('click'); if (activeSpelling) onSelectTopic(activeSpelling.id); }}
                className="flex items-center justify-between p-2 bg-[#F4F9FF] hover:bg-[#EAF2FF] border border-[#D5E6F5] rounded-[20px] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-400 text-white flex items-center justify-center text-lg font-black border-b-2 border-blue-600 overflow-hidden select-none shrink-0">
                    {activeSpelling?.emoji && (activeSpelling.emoji.startsWith('http') || activeSpelling.emoji.startsWith('/') || activeSpelling.emoji.startsWith('data:')) ? (
                      <img src={activeSpelling.emoji} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{activeSpelling?.emoji || '🎒'}</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-black text-[#2C3E50]">{activeSpelling?.name || "Lớp em học trò"}</span>
                    <span className="block text-[9px] text-blue-500/80 font-semibold truncate max-w-[150px]">
                      {activeSpelling?.id === 'danh-van' ? 'Ghép vần B + a = Ba' : activeSpelling?.description?.split('.')[0] || 'Phát âm trọn nghĩa'}
                    </span>
                  </div>
                </div>
                <button className="text-[9px] font-black text-white bg-[#3498DB] px-2.5 py-1 rounded-full border-b-2 border-[#1F618D] shrink-0">
                  Học vần
                </button>
              </div>

              {/* Task row 3: Học toán */}
              <div 
                onClick={() => { playSoundEffect('click'); if (activeMath) onSelectTopic(activeMath.id); }}
                className="flex items-center justify-between p-2 bg-[#F0FFF4] hover:bg-[#E1FFE9] border border-[#C5F3D1] rounded-[20px] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400 text-white flex items-center justify-center text-lg font-black border-b-2 border-emerald-600 overflow-hidden select-none shrink-0">
                    {activeMath?.emoji && (activeMath.emoji.startsWith('http') || activeMath.emoji.startsWith('/') || activeMath.emoji.startsWith('data:')) ? (
                      <img src={activeMath.emoji} className="w-full h-full object-contain" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{activeMath?.emoji || '🔢'}</span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-black text-[#1B4F72]">{activeMath?.name || "Bé học toán"}</span>
                    <span className="block text-[9px] text-[#1E8449]/70 font-semibold truncate max-w-[150px]">
                      {activeMath?.id === 'toan' ? 'Cộng trừ thông thái' : activeMath?.description?.split('.')[0] || 'Vui học tính toán'}
                    </span>
                  </div>
                </div>
                <button className="text-[9px] font-black text-white bg-emerald-500 px-2.5 py-1 rounded-full border-b-2 border-emerald-700 shrink-0">
                  Học toán
                </button>
              </div>

              {/* Task row 4: Trò chơi */}
              <div 
                onClick={() => { playSoundEffect('click'); onNavigateToView?.('games', activeGame); }}
                className="flex items-center justify-between p-2 bg-[#FFF2F2] hover:bg-[#FFE3E3] border border-[#FADBD8] rounded-[20px] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-400 text-white flex items-center justify-center text-lg font-black border-b-2 border-rose-600 overflow-hidden select-none shrink-0">
                    <span>{activeGame === 'jigsaw' ? '🧩' : '🐥'}</span>
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-black text-[#7B241C]">
                      {activeGame === 'jigsaw' ? 'Trò chơi ghép hình' : 'Nông trại vui vẻ'}
                    </span>
                    <span className="block text-[9px] text-rose-500/70 font-semibold truncate max-w-[150px]">
                      {activeGame === 'jigsaw' ? 'Tư duy sắp xếp hình ảnh' : 'Đoán tiếng con vật cực yêu'}
                    </span>
                  </div>
                </div>
                <button className="text-[9px] font-black text-white bg-rose-500 px-2.5 py-1 rounded-full border-b-2 border-rose-700 shrink-0">
                  Chơi ngay
                </button>
              </div>
            </div>
          </div>

          <div className="text-[9px] text-[#A0522D] font-extrabold text-center bg-[#FFF8DE] rounded-xl py-1 px-2 border border-[#F5E1B8] leading-tight select-none">
            ⭐ Bé hoàn thành bài học sẽ nhận được điểm Carrot đổi quà nè!
          </div>
        </div>

        {/* B. CENTER BLOCK: Two gorgeous bento containers (Orange & Blue) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[420px]" id="bento-center-cards">
          
          {/* Top Orange Card: Active Featured Lesson */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('quest');
              scrollToHeader();
            }}
            className="flex-1 rounded-[40px] bg-gradient-to-br from-[#FF9F43] to-[#FF6F00] p-5 text-white border-[8px] border-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between cursor-pointer"
            id="featured-orange-card"
          >
            {/* Playful Floating Rabbits & clouds */}
            <div className="absolute right-2 bottom-0 text-[100px] leading-none pointer-events-none opacity-20 filter select-none animate-bounce-slow">
              🐰
            </div>
            {/* Cute cloud shapes background decor */}
            <div className="absolute top-2 right-4 text-4xl opacity-15 select-none animate-pulse">☁️</div>

            <div>
              <span className="text-[8.5px] uppercase font-black tracking-widest bg-white/25 px-2.5 py-0.5 rounded-full border border-white/20">
                Luyện câu logic • Cô Chích Chòe
              </span>
              <h2 className="text-lg md:text-xl font-black mt-1.5 bubble-font drop-shadow-sm tracking-tight leading-tight uppercase">
                Ghép câu
              </h2>
              <p className="text-white/95 text-[10.5px] mt-0.5 font-bold leading-relaxed">
                Ghép câu hoàn chỉnh chuẩn trật tự từ và trả lời câu hỏi đố vui!
              </p>
            </div>

            <div className="flex flex-col gap-1.5 relative z-10 w-full animate-pulse">
              <button 
                type="button"
                className="w-full py-2 bg-[#FFEA33] hover:bg-[#FFF166] text-[#6E5500] font-black rounded-xl border-b-4 border-[#C79D00] shadow-md flex items-center justify-center gap-1.5 transform active:scale-95 transition-all outline-none text-xs cursor-pointer"
              >
                <span className="text-sm">💬</span>
                <span className="uppercase font-black">XEM PHẦN ĐỐI THOẠI & TRẢ LỜI</span>
              </button>
            </div>
          </motion.div>

          {/* Bottom Blue Card: Fun Spelling / Challenger Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('spelling');
              scrollToHeader();
            }}
            className="flex-1 rounded-[40px] bg-gradient-to-br from-[#3498DB] to-[#1E3799] p-5 text-white border-[8px] border-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between cursor-pointer"
            id="challenge-blue-card"
          >
            {/* Bubble decoration */}
            <div className="absolute right-2 bottom-0 text-[100px] leading-none pointer-events-none opacity-15">
              🐳
            </div>

            <div>
              <span className="text-[8.5px] uppercase font-black tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Vượt ải ghép âm • Nhóm chữ cái
              </span>
              <h3 className="text-lg font-black mt-1.5 bubble-font drop-shadow-sm uppercase">
                Ghép Chữ
              </h3>
              <p className="text-white/80 text-[10.5px] font-semibold mt-0.5 leading-tight">
                Tụ hội các chữ cái ngộ nghĩnh tạo thành những âm tiết trực quan rực rỡ nhất!
              </p>
            </div>

            <div className="w-full relative z-10 animate-pulse">
              <button 
                type="button"
                className="w-full py-2 bg-white hover:bg-slate-50 text-indigo-950 font-black rounded-xl border-b-2 border-indigo-200 shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all text-xs outline-none cursor-pointer font-sans"
              >
                <span>🎒 XEM PHẦN ĐÁNH VẦN TIẾNG VIỆT</span>
              </button>
            </div>
          </motion.div>

        </div>

        {/* C. 2 HORIZONTAL CARDS STACKED VERTICALLY: HỌC TOÁN & TRÒ CHƠI PHÁT TRIỂN SAU */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-[420px]" id="right-pill-column">
          
          {/* Học toán */}
          <button
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('math');
              setTimeout(() => {
                const element = document.getElementById('topic-scroller-header');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
            className="flex-1 rounded-[40px] border-[8px] border-white bg-[#EBF5FB] shadow-[0_12px_24px_rgba(0,0,0,0.12)] p-5 relative overflow-hidden flex items-center gap-4 transition-all hover:scale-102 active:scale-95 group text-left cursor-pointer outline-none"
          >
            <div className="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center text-3xl shadow-inner border border-teal-300 group-hover:rotate-12 transition-transform shrink-0">
              🧮
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-black text-teal-950 uppercase tracking-wide font-sans">📐 Học Toán</span>
              <span className="text-[10px] md:text-[11px] text-teal-850 font-extrabold mt-0.5 leading-tight">Ghép đồ vật học toán thông minh</span>
              <div className="mt-2">
                <span className="text-[8px] md:text-[9px] bg-teal-200 text-teal-900 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse inline-block">
                  Sẵn sàng chơi
                </span>
              </div>
            </div>
          </button>

          {/* Trò chơi */}
          <button
            onClick={() => {
              playSoundEffect('click');
              if (onNavigateToView) {
                onNavigateToView('games');
              }
            }}
            className="flex-1 rounded-[40px] border-[8px] border-white bg-[#FFF5E6] shadow-[0_12px_24px_rgba(0,0,0,0.12)] p-5 relative overflow-hidden flex items-center gap-4 transition-all hover:scale-102 active:scale-95 group text-left cursor-pointer outline-none"
          >
            <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center text-3xl shadow-inner border border-amber-300 group-hover:-rotate-12 transition-transform shrink-0">
              🎮
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base font-black text-amber-950 uppercase tracking-wide font-sans">🧩 Trò Chơi</span>
              <span className="text-[10px] md:text-[11px] text-amber-800 font-extrabold mt-0.5 leading-tight">Vui chơi rèn luyện trí tuệ</span>
              <div className="mt-2">
                <span className="text-[8px] md:text-[9px] bg-emerald-200 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse inline-block">
                  CHƠI NGAY 👉
                </span>
              </div>
            </div>
          </button>

        </div>

      </div>

      {/* 🔮 2. Middle Section: Dynamic Category Switcher 🔮 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 mb-2 pt-6 border-t-2 border-dashed border-[#F39C12]/20" id="topic-scroller-header">
        
        <div className="text-center md:text-left">
          <h3 className="text-xl font-black text-sky-950 tracking-tight flex items-center justify-center md:justify-start gap-2 bubble-font">
            <span>🐥 Các bài học và chủ đề của bé</span>
            <span className="text-lg bg-yellow-400 text-white rounded-full px-2 py-0.5 text-xs">Phần {filteredTopics.length}</span>
          </h3>
          <p className="text-[11px] text-gray-500 font-bold mt-1">Bé hãy chọn một ô bài học bên dưới để rèn luyện nói trôi chảy nhé!</p>
        </div>

        {/* Tab switcher matching the reference buttons */}
        <div className="bg-slate-100 p-1 rounded-2xl border-2 border-slate-200 flex flex-wrap items-center gap-1">
          <button
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('quest');
            }}
            className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all outline-none cursor-pointer ${
              activeCategory === 'quest' 
                ? 'bg-white text-[#2980B9] shadow-xs border-b-2 border-sky-400' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💬 Đối Thoại & Trả Lời</span>
          </button>
          <button
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('spelling');
            }}
            className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all outline-none cursor-pointer ${
              activeCategory === 'spelling' 
                ? 'bg-white text-[#D35400] shadow-xs border-b-2 border-orange-400' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🎒 Đánh Vần Tiếng Việt</span>
          </button>
          <button
            onClick={() => {
              playSoundEffect('click');
              setActiveCategory('math');
            }}
            className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all outline-none cursor-pointer ${
              activeCategory === 'math' 
                ? 'bg-white text-[#0D9488] shadow-xs border-b-2 border-teal-400' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🔢 Học Toán Ngộ Nghĩnh</span>
          </button>
          <button
            onClick={() => {
              playSoundEffect('click');
              if (onNavigateToView) {
                onNavigateToView('games');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-black px-4 py-2 text-slate-500 hover:text-slate-800 rounded-xl transition-all outline-none cursor-pointer"
          >
            <span>🎮 Trò Chơi</span>
          </button>
        </div>

      </div>

      {activeCategory === 'math' && filteredTopics.length === 0 && (
        <div className="mx-auto max-w-xl bg-teal-50/60 border-4 border-dashed border-teal-200 rounded-[40px] p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-3xs animate-fade-in self-center">
          <span className="text-6xl animate-bounce">🧮</span>
          <h4 className="text-lg font-black text-teal-950 font-sans uppercase tracking-tight">Chưa có chủ đề học toán nào!</h4>
          <p className="text-xs text-teal-900/80 font-bold leading-relaxed">
            Ba mẹ ơi! Hãy nhấn vào nút <strong className="text-teal-600 bg-white px-2 py-1 rounded-lg border border-teal-200">"Góc Giáo Viên 🔐"</strong> ở trên cùng bên trái màn hình để tạo chủ đề Toán ngộ nghĩnh đầu tiên cho bé nha. Hệ thống sẽ tự động vẽ thêm dâu tây, bóng bay cực kỳ xinh xắn! 🍎🎈
          </p>
        </div>
      )}

      {/* 🎪 3. Grid of pre-defined standard learning cards 🎪 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="topic-grid">
        {filteredTopics.map((topic, index) => {
          // Calculate completed items under this topic
          const completedCount = topic.items.filter(item => 
            userStats.completedIds.includes(item.id)
          ).length;
          const starsEarned = completedCount * 3; // 3 stars max per completed item

          let borderBottomColor = "border-b-amber-600";
          if (topic.id === 'dong-vat') borderBottomColor = "border-b-teal-700";
          else if (topic.id === 'do-an') borderBottomColor = "border-b-rose-700";
          else if (topic.id === 'do-choi') borderBottomColor = "border-b-indigo-700";
          else if (topic.id === 'truong-hoc') borderBottomColor = "border-b-blue-700";
          else if (topic.id === 'ban-than') borderBottomColor = "border-b-sky-700";
          else if (topic.id === 'gia-dinh') borderBottomColor = "border-b-rose-700";
          else if (topic.id === 'danh-van' || topic.isSpelling) borderBottomColor = "border-b-orange-700";
          else if (topic.id === 'toan' || topic.isMath) borderBottomColor = "border-b-teal-700";

          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ scale: 1.025, y: -4 }}
              onClick={() => {
                playSoundEffect('click');
                onSelectTopic(topic.id);
              }}
              className={`bg-white rounded-[36px] overflow-hidden border-[8px] border-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] cursor-pointer transition-all flex flex-col justify-between h-full group`}
              id={`topic-card-${topic.id}`}
            >
              {/* Card top banner with gradient */}
              <div className={`bg-gradient-to-r ${topic.color} p-5 flex items-center justify-between border-b-4 border-black/10`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                    <span className="text-white block">{renderIcon(topic.icon)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-white/90 uppercase tracking-widest bg-black/15 px-2 py-0.5 rounded-full">
                      {activeCategory === 'quest' ? `Chủ đề ${index + 1}` : 'Nền Tảng'}
                    </span>
                    <h4 className="text-base font-black text-white mt-0.5 group-hover:underline bubble-font">
                      {topic.name}
                    </h4>
                  </div>
                </div>
                {topic.emoji && (topic.emoji.startsWith('http://') || topic.emoji.startsWith('https://') || topic.emoji.startsWith('/') || topic.emoji.startsWith('data:')) ? (
                  <img src={topic.emoji} className="w-10 h-10 object-contain rounded-lg shrink-0" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3.5xl">{topic.emoji}</span>
                )}
              </div>

              {/* Card content with topic details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-5 font-sans">
                  {topic.description}
                </p>

                {/* Progress Indicators */}
                <div className="bg-[#FAFBFD] rounded-2.5xl p-3 border border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">TIẾN ĐỘ HỌC</span>
                    <span className="text-xs font-black text-slate-700 font-mono mt-0.5">
                      {completedCount} / {topic.items.length} BÀI XONG
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-yellow-400 text-white font-black text-xs px-2.5 py-1.5 rounded-xl border-b-2 border-yellow-600">
                    <LucideIcons.Star className="w-3.5 h-3.5 fill-white-400 animate-pulse" />
                    <span>+{starsEarned} sao</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Dynamic customized Topic creation powered by Gemini */}
        {activeCategory === 'quest' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: filteredTopics.length * 0.04 }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={() => {
              playSoundEffect('click');
              onOpenCustomLessonCreator();
            }}
            className="bg-purple-100 rounded-[36px] p-6 border-[8px] border-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] cursor-pointer transition-all flex flex-col justify-between h-full relative overflow-hidden group"
            id="custom-lesson-card"
          >
            <div className="absolute -top-6 -right-6 w-16 h-16 bg-purple-200 rounded-full blur-xl opacity-50 pointer-events-none"></div>
            
            <div>
              <div className="flex items-center gap-3.5 mb-4">
                <div className="p-3 bg-purple-500 rounded-xl border-b-4 border-purple-700 shadow-sm">
                  <LucideIcons.Sparkles className="w-6 h-6 text-white animate-spin-slow" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-purple-700 tracking-wider uppercase bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                    Phép Thuật AI
                  </span>
                  <h4 className="text-base font-black text-purple-900 mt-1 bubble-font">
                    Cô Trò Tự Tạo Bài Học
                  </h4>
                </div>
              </div>
              
              <p className="text-purple-950 font-semibold text-xs leading-relaxed mb-5 font-sans">
                Bé muốn học về chủ đề gì khác? Khủng long 🦕, vũ trụ 🚀, các vì sao...? Hãy viết ý kiến của bé và Cô Chích Chòe sẽ thiết kế bài học mới ngay lập tức nhé!
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-purple-100 flex items-center justify-between text-purple-700 font-extrabold text-xs group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-700 transition-all">
              <span>Bắt đầu ước mơ của bé... 🦄</span>
              <LucideIcons.ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
}
