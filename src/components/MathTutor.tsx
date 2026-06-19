import React, { useState, useEffect } from 'react';
import { Sparkles, Star, CheckCircle, ArrowRight } from 'lucide-react';
import { LessonItem } from '../types';
import { MathLibraryItem, getMathIllustrations } from '../utils/mathLibraryHelper';

// Simple fun audio paths reused from the rest of the app if possible, or just synthetic beeps
const playSoundEffect = (type: 'pop' | 'success' | 'click' | 'wrong') => {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = context.createOscillator();
    const gainNode = context.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(context.destination);
    
    if (type === 'pop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.1);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, context.currentTime);
      osc.frequency.setValueAtTime(800, context.currentTime + 0.1);
      osc.frequency.setValueAtTime(1200, context.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.5, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.4);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, context.currentTime);
      gainNode.gain.setValueAtTime(0.5, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.05);
      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.05);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, context.currentTime);
      gainNode.gain.setValueAtTime(0.5, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      osc.start(context.currentTime);
      osc.stop(context.currentTime + 0.2);
    }
  } catch (err) {
    console.log("AudioContext blocked or unvailable");
  }
};

interface VisualMathIllustrationProps {
  a: number;
  op: string;
  b: number;
  index: number;
  illustration: MathLibraryItem | null;
}

function VisualMathIllustration({ a, op, b, index, illustration }: VisualMathIllustrationProps) {
  const getCleanLabel = () => {
    if (!illustration) return 'đồ vật';
    // Strip emojis from the start of the name for cleaner textual prompts
    return illustration.name.replace(/^[\p{Emoji}\s]+/u, '').trim();
  };

  const renderCounterItem = (keyStr: string) => {
    if (illustration && illustration.image) {
      return (
        <img
          key={keyStr}
          src={illustration.image}
          alt={illustration.name}
          className="w-10 h-10 md:w-12 md:h-12 object-contain hover:scale-125 transition-transform inline-block drop-shadow-xs cursor-pointer select-none"
          referrerPolicy="no-referrer"
        />
      );
    }
    const countingEmojis = ['🍎', '🍓', '🧸', '🎈', '🌟', '🧁', '⚽', '🦖', '🚗', '🍭'];
    const fallbackEmoji = illustration?.name && /^[\p{Emoji}]+/u.test(illustration.name) 
      ? illustration.name.match(/^[\p{Emoji}]+/u)?.[0] || '⭐' 
      : countingEmojis[index % countingEmojis.length];

    return (
      <span key={keyStr} className="text-3xl md:text-4xl hover:scale-125 transition-transform inline-block drop-shadow-xs cursor-pointer select-none" role="img">
        {fallbackEmoji}
      </span>
    );
  };

  const label = getCleanLabel();

  // Helper for addition (+)
  if (op === '+') {
    return (
      <div className="flex flex-col items-center space-y-4 w-full mt-5">
        <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200">
          Hình Bé Học Phép Tính Cộng Trực Quan 🌟
        </span>

        {/* Outer equation row */}
        <div className="w-full border-4 border-emerald-200 bg-[#FDFFF6] rounded-[32px] p-5 shadow-xs flex flex-row items-center justify-around gap-2 relative overflow-hidden">
          {/* Inner elements container */}
          <div className="flex flex-row items-center justify-center gap-3 w-full flex-wrap">
            {/* Group A */}
            <div className="flex flex-col justify-center items-center gap-1.5 bg-white/85 px-4 py-3 rounded-2xl border border-emerald-100 min-h-[64px] min-w-[70px] max-w-[200px] shadow-3xs">
              <div className="flex flex-row flex-wrap justify-center gap-1">
                {Array.from({ length: Math.min(a, 15) }).map((_, idx) => (
                  renderCounterItem(`a-${idx}`)
                ))}
              </div>
              {a > 15 && <span className="text-[#059669] font-black text-xs">+{a - 15}</span>}
              <div className="w-full text-center mt-1">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{a}</span>
              </div>
            </div>

            {/* Plus Operator */}
            <span className="text-3xl font-extrabold text-[#0F6F4C] px-1 select-none shrink-0 animate-pulse">+</span>

            {/* Group B */}
            <div className="flex flex-col justify-center items-center gap-1.5 bg-white/85 px-4 py-3 rounded-2xl border border-emerald-100 min-h-[64px] min-w-[70px] max-w-[200px] shadow-3xs">
              <div className="flex flex-row flex-wrap justify-center gap-1">
                {Array.from({ length: Math.min(b, 15) }).map((_, idx) => (
                  renderCounterItem(`b-${idx}`)
                ))}
              </div>
              {b > 15 && <span className="text-[#059669] font-black text-xs">+{b - 15}</span>}
              <div className="w-full text-center mt-1">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{b}</span>
              </div>
            </div>

            {/* Equals symbol */}
            <span className="text-3xl font-extrabold text-[#0F6F4C] px-1 select-none shrink-0">=</span>

            {/* Empty Answer Target Slot styled with dashed borders like reference */}
            <div className="w-16 h-16 border-4 border-dashed border-emerald-400 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-300 text-3xl font-bold font-mono animate-pulse shadow-sm min-w-[64px]">
              <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-1 py-0.5 rounded-md scale-90 mb-0.5 shrink-0 uppercase tracking-widest leading-none">Đáp án</span>
              <span className="text-base">❓</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-emerald-850 font-extrabold text-center uppercase tracking-wider animate-bounce select-none">
          Bé hãy gộp lại và đếm hết tất cả {label} để điền vào ô trống nhé! 🎉
        </p>
      </div>
    );
  }

  // Helper for subtraction (-)
  if (op === '-') {
    return (
      <div className="flex flex-col items-center space-y-4 w-full mt-5">
        <span className="text-[11px] font-black text-rose-800 uppercase tracking-widest bg-rose-100 px-3.5 py-1 rounded-full border border-rose-200">
          Hình Bé Học Phép Tính Trừ Trực Quan 🌟
        </span>

        {/* Outer equation row */}
        <div className="w-full border-4 border-rose-200 bg-[#FFFBFB] rounded-[32px] p-5 shadow-xs flex flex-row items-center justify-around gap-2 relative overflow-hidden">
          {/* Inner elements container */}
          <div className="flex flex-row items-center justify-center gap-3 w-full flex-wrap">
            {/* Group A (Total minus Subtracted) */}
            <div className="flex flex-col justify-center items-center gap-1.5 bg-white/85 px-4 py-3 rounded-2xl border border-rose-100 min-h-[64px] min-w-[70px] max-w-[220px] shadow-3xs">
              <div className="flex flex-row flex-wrap justify-center gap-1.5">
                {/* Remaining active ones */}
                {Array.from({ length: Math.max(0, a - b) }).map((_, idx) => (
                  renderCounterItem(`active-${idx}`)
                ))}
                
                {/* Crossed out / subtracted ones */}
                {Array.from({ length: Math.min(a, b) }).map((_, idx) => {
                  if (illustration && illustration.image) {
                    return (
                      <div key={`crossed-${idx}`} className="w-10 h-10 md:w-12 md:h-12 relative opacity-20 scale-90 flex flex-col items-center select-none shrink-0" role="img">
                        <img src={illustration.image} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        <span className="absolute text-[8px] font-black text-rose-600 bg-white border border-rose-400 px-1 py-0.2 rounded rotate-12 -bottom-2 shrink-0">Bỏ</span>
                      </div>
                    );
                  }
                  
                  const countingEmojis = ['🍎', '🍓', '🧸', '🎈', '🌟', '🧁', '⚽', '🦖', '🚗', '🍭'];
                  const fallbackEmoji = illustration?.name && /^[\p{Emoji}]+/u.test(illustration.name) 
                    ? illustration.name.match(/^[\p{Emoji}]+/u)?.[0] || '⭐' 
                    : countingEmojis[index % countingEmojis.length];

                  return (
                    <div key={`crossed-${idx}`} className="text-3xl md:text-4xl relative opacity-20 scale-90 flex flex-col items-center select-none shrink-0" role="img">
                      <span>{fallbackEmoji}</span>
                      <span className="absolute text-[8px] font-black text-rose-600 bg-white border border-rose-400 px-1 py-0.2 rounded rotate-12 -bottom-2 shrink-0">Bỏ</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="w-full text-center mt-1">
                <span className="text-xs font-black text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Tổng cộng {a}</span>
              </div>
            </div>

            {/* Minus Operator */}
            <span className="text-3xl font-extrabold text-rose-600 px-1 select-none shrink-0 animate-pulse">-</span>

            {/* Group B (The subtracted value) */}
            <div className="flex flex-col justify-center items-center gap-1.5 bg-white/85 px-4 py-3 rounded-2xl border border-rose-100 min-h-[64px] min-w-[70px] max-w-[150px] shadow-3xs opacity-45 animate-pulse">
              <div className="flex flex-row flex-wrap justify-center gap-1">
                {Array.from({ length: Math.min(b, 15) }).map((_, idx) => (
                  renderCounterItem(`b-${idx}`)
                ))}
              </div>
              <div className="w-full text-center mt-1">
                <span className="text-xs font-black text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Bớt đi {b}</span>
              </div>
            </div>

            {/* Equals symbol */}
            <span className="text-3xl font-extrabold text-rose-600 px-1 select-none shrink-0">=</span>

            {/* Empty Answer Target Slot styled with dashed borders like reference */}
            <div className="w-16 h-16 border-4 border-dashed border-rose-400 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-300 text-3xl font-bold font-mono animate-pulse shadow-sm min-w-[64px]">
              <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded-md scale-90 mb-0.5 shrink-0 uppercase tracking-widest leading-none">Đáp án</span>
              <span className="text-base">❓</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-rose-850 font-extrabold text-center uppercase tracking-wider animate-bounce select-none">
          Bé hãy đếm xem còn lại bao nhiêu {label} không bị gạch bỏ để tìm đáp án nhé! 🎉
        </p>
      </div>
    );
  }

  // Helper for multiplication (*)
  if (op === '*' || op === 'x' || op === '×') {
    return (
      <div className="flex flex-col items-center space-y-4 w-full mt-5">
        <span className="text-[11px] font-black text-sky-800 uppercase tracking-widest bg-sky-100 px-3.5 py-1 rounded-full border border-sky-200">
          Hình Bé Học Phép Tính Nhân Trực Quan 🌟
        </span>

        {/* Outer equation row */}
        <div className="w-full border-4 border-sky-200 bg-[#F5FBFF] rounded-[32px] p-5 shadow-xs flex flex-row items-center justify-around gap-2 relative overflow-hidden">
          {/* Inner elements container */}
          <div className="flex flex-row items-center justify-center gap-3 w-full flex-wrap">
            
            {/* Visual group list representing multiplication */}
            <div className="flex flex-row flex-wrap justify-center items-center gap-3 bg-white/85 px-4 py-3 rounded-2xl border border-sky-100 min-h-[64px] min-w-[120px] shadow-3xs">
              {Array.from({ length: Math.min(a, 10) }).map((_, gIdx) => (
                <div key={gIdx} className="bg-sky-50/50 border-2 border-dashed border-sky-200 rounded-xl p-1.5 flex flex-wrap justify-center items-center gap-1 min-w-[48px] relative pt-3 shadow-3xs">
                  <span className="absolute -top-1.5 bg-sky-500 text-[6px] font-black text-white px-1 py-0.1 rounded-full shrink-0">Nhóm {gIdx + 1}</span>
                  {Array.from({ length: Math.min(b, 10) }).map((_, iIdx) => (
                    renderCounterItem(`group-${gIdx}-${iIdx}`)
                  ))}
                </div>
              ))}
              <div className="w-full text-center mt-1">
                <span className="text-xs font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                  {a} nhóm × {b} {label}
                </span>
              </div>
            </div>

            {/* Multiply Operator */}
            <span className="text-3xl font-extrabold text-sky-600 px-1 select-none shrink-0 animate-pulse">×</span>

            {/* Indicator label block for multiplication params */}
            <div className="flex flex-col items-center bg-white/90 p-2.5 rounded-xl border border-sky-100 shadow-3xs shrink-0">
              <span className="text-[10px] font-black text-slate-400">GẤP LÊN</span>
              <span className="text-lg font-black text-sky-600">{b} LẦN</span>
            </div>

            {/* Equals symbol */}
            <span className="text-3xl font-extrabold text-sky-600 px-1 select-none shrink-0">=</span>

            {/* Empty Answer Target Slot styled with dashed borders like reference */}
            <div className="w-16 h-16 border-4 border-dashed border-sky-400 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-300 text-3xl font-bold font-mono animate-pulse shadow-sm min-w-[64px]">
              <span className="text-[9px] font-black text-sky-500 bg-sky-50 px-1 py-0.5 rounded-md scale-90 mb-0.5 shrink-0 uppercase tracking-widest leading-none">Đáp án</span>
              <span className="text-base">❓</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-sky-800 font-extrabold text-center uppercase tracking-wider animate-bounce select-none">
          Bé hãy đếm hết tất cả {label} trong các nhóm để nhân ra đáp án nhé! 🎉
        </p>
      </div>
    );
  }

  // Helper for division (/)
  if (op === '/' || op === '÷') {
    const result = Math.round(a / b) || 1;
    return (
      <div className="flex flex-col items-center space-y-4 w-full mt-5">
        <span className="text-[11px] font-black text-amber-800 uppercase tracking-widest bg-amber-100 px-3.5 py-1 rounded-full border border-amber-200">
          Hình Bé Học Phép Tính Chia Trực Quan 🌟
        </span>

        {/* Outer equation row */}
        <div className="w-full border-4 border-amber-200 bg-[#FFFDF5] rounded-[32px] p-5 shadow-xs flex flex-col md:flex-row items-center justify-around gap-4 relative overflow-hidden">
          
          {/* Left panel: Total count */}
          <div className="flex flex-col items-center bg-white/85 p-3.5 rounded-2xl border border-amber-100 shadow-3xs">
            <span className="text-[9px] font-black text-slate-450 uppercase mb-1">Cần chia đều ({a} {label}):</span>
            <div className="flex flex-row flex-wrap justify-center items-center gap-1 max-w-[160px]">
              {Array.from({ length: Math.min(a, 20) }).map((_, idx) => (
                renderCounterItem(`div-total-${idx}`)
              ))}
            </div>
          </div>

          {/* Operator symbols */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-3xl font-extrabold text-amber-600 animate-pulse">÷</span>
            <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Chia cho {b} phần</span>
            <span className="text-3xl font-extrabold text-amber-600">=</span>
          </div>

          {/* Right panel: result preview groups */}
          <div className="flex flex-row flex-wrap justify-center gap-3 bg-white/85 p-3.5 rounded-2xl border border-amber-100 shadow-3xs">
            {Array.from({ length: Math.min(b, 5) }).map((_, groupIdx) => (
              <div key={groupIdx} className="bg-amber-50/50 border border-dashed border-amber-350 rounded-xl p-1.5 text-center shadow-3xs min-w-[54px] pt-4 relative">
                <span className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-amber-500 text-[6px] font-black text-white px-1 py-0.1 rounded-full shrink-0">Phần {groupIdx + 1}</span>
                <div className="flex flex-row gap-0.5 justify-center flex-wrap">
                  {Array.from({ length: Math.min(result, 10) }).map((_, i) => (
                    renderCounterItem(`div-part-${groupIdx}-${i}`)
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty Answer Target Slot styled with dashed borders like reference */}
          <div className="w-16 h-16 border-4 border-dashed border-amber-400 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-300 text-3xl font-bold font-mono animate-pulse shadow-sm min-w-[64px] shrink-0">
            <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1 py-0.5 rounded-md scale-90 mb-0.5 shrink-0 uppercase tracking-widest leading-none">Đáp án</span>
            <span className="text-base">❓</span>
          </div>
        </div>

        <p className="text-xs text-amber-800 font-extrabold text-center uppercase tracking-wider animate-bounce select-none">
          Mỗi phần nhận được bao nhiêu {label}? Hãy tìm đáp án cho bé nhé! 🎉
        </p>
      </div>
    );
  }

  return null;
}

interface MathTutorProps {
  key?: React.Key;
  item: LessonItem;
  onCompleted: (earnedStars: number, earnedCoins: number) => void;
}

export function MathTutor({ item, onCompleted }: MathTutorProps) {
  const operations = item.mathOperations || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<Record<number, number[]>>({});
  const [assignedIllustrations, setAssignedIllustrations] = useState<MathLibraryItem[]>([]);

  useEffect(() => {
    setCurrentIndex(0);
    setCompleted(false);
    setWrongAnswers({});

    if (item.customImage) {
      const itemIllustration: MathLibraryItem = {
        id: `chosen-${item.id}`,
        name: item.sentence || 'Đồ vật',
        image: item.customImage,
        isPreset: false
      };
      setAssignedIllustrations(Array(operations.length).fill(itemIllustration));
    } else {
      // Generate random non-duplicate illustrations from library and backup emojis
      const library = getMathIllustrations();
      const shuffledLibrary = [...library].sort(() => Math.random() - 0.5);
      
      // Backup unique emojis to fill up to any required count cleanly
      const backupEmojis = [
        '🍓', '🧸', '🎈', '🌟', '🧁', '⚽', '🦖', '🚗', '🍭', '🍎',
        '🦁', '🦉', '🦊', '🐨', '🐼', '🐔', '🐸', '🐙', '🐝', '🦕', 
        '🚀', '🛸', '⛵', '🍒', '🍋', '🍇', '🥑', '🍩', '🍪', '🍨'
      ].sort(() => Math.random() - 0.5);

      const assigned: MathLibraryItem[] = [];
      
      // Track unique names/emojis to avoid duplicate representations
      const chosenNames = new Set<string>();

      // First assign from our shuffled library of custom/preset math illustrations
      for (const libItem of shuffledLibrary) {
        if (assigned.length >= operations.length) break;
        const cleanName = libItem.name.toLowerCase().trim();
        if (!chosenNames.has(cleanName)) {
          assigned.push(libItem);
          chosenNames.add(cleanName);
        }
      }

      // Fill remaining with backup emojis
      let backupIdx = 0;
      while (assigned.length < operations.length && backupIdx < backupEmojis.length) {
        const emoji = backupEmojis[backupIdx++];
        if (!chosenNames.has(emoji)) {
          assigned.push({
            id: `backup-emoji-${emoji}`,
            name: emoji,
            image: '', // empty signifies use text/emoji rendering
            isPreset: true
          });
          chosenNames.add(emoji);
        }
      }

      setAssignedIllustrations(assigned);
    }
  }, [item, operations.length]);

  if (operations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-slate-500 font-bold mb-4">Bài học này không có câu hỏi nào.</p>
        <button onClick={() => onCompleted(1, 1)} className="bg-teal-500 text-white font-bold px-6 py-2 rounded-xl">Hoàn thành</button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 space-y-6 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full animate-pulse-slow"></div>
          <CheckCircle className="w-24 h-24 text-emerald-500 drop-shadow-xl relative z-10" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-emerald-950 uppercase tracking-widest font-sans drop-shadow-sm">
            HOAN HÔ BÉ! 🎉
          </h2>
          <p className="text-emerald-700 font-bold text-lg max-w-sm mx-auto">
            Bé đã giải xuất sắc toàn bộ phép tính của chủ đề này!
          </p>
        </div>
        
        <button
          onClick={() => {
            playSoundEffect('click');
            onCompleted(5, 5);
          }}
          className="mt-8 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xl px-12 py-5 rounded-[24px] border-b-[6px] border-b-emerald-700 hover:border-b-emerald-800 transition-all flex items-center gap-3 cursor-pointer outline-none shadow-lg group relative overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <span>BÀI TIẾP THEO</span>
          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  const currentOp = operations[currentIndex];
  // Convert * to x, / to ÷ for kids
  const displayExpression = currentOp.expression.replace(/\*/g, '×').replace(/\//g, '÷');

  const parts = currentOp.expression.split(' ');
  const aVal = parseInt(parts[0], 10) || 0;
  const opStr = parts[1] || '+';
  const bVal = parseInt(parts[2], 10) || 0;

  const handleOptionClick = (val: number) => {
    if (val === currentOp.correctAnswer) {
      playSoundEffect('pop');
      if (currentIndex < operations.length - 1) {
        setTimeout(() => {
            playSoundEffect('success');
            setCurrentIndex(currentIndex + 1);
        }, 300);
      } else {
        setTimeout(() => {
          playSoundEffect('success');
          setCompleted(true);
        }, 300);
      }
    } else {
      playSoundEffect('wrong');
      setWrongAnswers(prev => ({
        ...prev,
        [currentIndex]: [...(prev[currentIndex] || []), val]
      }));
    }
  };

  const progressPct = (currentIndex / operations.length) * 100;

  return (
    <div className="space-y-8 animate-fade-in flex flex-col items-center">
      {/* ProgressBar */}
      <div className="w-full max-w-2xl bg-teal-100 rounded-full h-3 overflow-hidden shadow-inner relative">
        <div 
          className="bg-teal-500 h-full transition-all duration-500 ease-out flex items-center justify-end pr-1 box-border rounded-full"
          style={{ width: `${Math.max(progressPct, 5)}%` }}
        >
           <Star className="w-2.5 h-2.5 text-white fill-white animate-pulse" />
        </div>
      </div>

      <div className="text-center w-full">
        <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-800 font-black px-4 py-1.5 rounded-full text-xs uppercase tracking-wider shadow-sm mb-6">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Thử thách {currentIndex + 1} / {operations.length}</span>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-[32px] p-8 max-w-2xl mx-auto shadow-sm min-h-[220px] flex flex-col items-center justify-center w-full">
            <h2 className="text-6xl md:text-7xl font-black text-slate-800 tracking-wider">
               {displayExpression} = ?
            </h2>
            <VisualMathIllustration 
              a={aVal} 
              op={opStr} 
              b={bVal} 
              index={currentIndex} 
              illustration={assignedIllustrations[currentIndex] || null}
            />
        </div>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl text-2xl">
        {currentOp.options.map((opt, i) => {
           const isWrongMatch = wrongAnswers[currentIndex]?.includes(opt);
           return (
             <button
               key={i}
               onClick={() => !isWrongMatch && handleOptionClick(opt)}
               className={`aspect-square sm:aspect-auto sm:py-6 rounded-3xl font-black transition-all flex items-center justify-center shadow-sm cursor-pointer outline-none relative overflow-hidden ${
                 isWrongMatch
                   ? 'bg-rose-100 border-2 border-rose-200 text-rose-300 cursor-not-allowed scale-95 opacity-50'
                   : 'bg-white hover:bg-slate-50 border-4 border-slate-200 hover:border-slate-300 text-teal-600 hover:text-teal-700 border-b-8 active:border-b-4 active:translate-y-1'
               }`}
             >
               <span className="text-5xl md:text-6xl">{opt}</span>
             </button>
           );
        })}
      </div>

    </div>
  );
}
