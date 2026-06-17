import React, { useState, useEffect } from 'react';
import { LessonItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playVietnameseText, playSoundEffect } from '../utils/audioHelper';
import * as LucideIcons from 'lucide-react';

interface SentenceBuilderProps {
  key?: React.Key;
  item: LessonItem;
  accent: 'north' | 'south';
  onCompleted: () => void;
  onBackToTopic: () => void;
}

export default function SentenceBuilder({
  item,
  accent,
  onCompleted,
  onBackToTopic
}: SentenceBuilderProps) {
  // Bubbles selected by the kid
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  // Shuffled list
  const [scrambledPool, setScrambledPool] = useState<string[]>([]);
  // Win state
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  // Animated mistake indicator
  const [shakeCount, setShakeCount] = useState<number>(0);

  // Initialize pool on item change
  useEffect(() => {
    setSelectedWords([]);
    setIsSuccess(false);
    // Use the custom scrambled list provided in the lesson item
    // Ensure all trailing/leading whitespaces are stripped for clean matching
    setScrambledPool([...item.scrambledWords].map(w => w.trim()));
  }, [item]);

  // Handle word block tap
  const handleWordTap = (word: string, index: number) => {
    if (isSuccess) return;
    
    playSoundEffect('click');
    const newSelected = [...selectedWords, word];
    setSelectedWords(newSelected);

    // Remove tapped word from pool
    const newPool = [...scrambledPool];
    newPool.splice(index, 1);
    setScrambledPool(newPool);

    // Validate if the user is typing completely correctly
    const finalCleanPath = newSelected.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
    const targetClean = item.sentence.toLowerCase().replace(/\s+/g, ' ').trim();

    // Check if the current pool is empty
    if (newPool.length === 0) {
      // Complete sentence check
      if (finalCleanPath === targetClean) {
        // Success match!
        setIsSuccess(true);
        playSoundEffect('success');
        // Let user digest and autoplays native audio
        setTimeout(() => {
          handleListenGuide();
        }, 400);
      } else {
        // Reversed or incorrect order sentence
        setShakeCount(prev => prev + 1);
        playSoundEffect('wrong');
        
        // Wait 1 second (so children see results and face-shake animation) then bounce words back to original pool
        setTimeout(() => {
          setSelectedWords([]);
          setScrambledPool([...item.scrambledWords].map(w => w.trim()));
        }, 1000);
      }
    }
  };

  // Undo last selected word
  const handleUndoWord = (word: string, index: number) => {
    if (isSuccess) return;
    playSoundEffect('pop');
    
    // Put word back into the pool
    setScrambledPool([...scrambledPool, word]);
    
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
  };

  // Reset current progress
  const handleReset = () => {
    playSoundEffect('pop');
    setSelectedWords([]);
    setScrambledPool([...item.scrambledWords].map(w => w.trim()));
    setIsSuccess(false);
  };

  // Speak the native instruction or custom teacher pronunciation
  const handleListenGuide = () => {
    if (item.customAudio) {
      const audio = new Audio(item.customAudio);
      audio.play().catch(err => {
        console.error("Custom audio play error:", err);
        playVietnameseText(item.sentence, accent);
      });
    } else {
      playVietnameseText(item.sentence, accent);
    }
  };

  // Bubble colors - Geometric balance flat styling variations
  const poolBubbleColors = [
    { bg: 'bg-orange-100 border-2 border-orange-300 text-orange-950 hover:bg-orange-200' },
    { bg: 'bg-green-100 border-2 border-green-300 text-green-950 hover:bg-green-200' },
    { bg: 'bg-sky-100 border-2 border-sky-300 text-sky-950 hover:bg-sky-200' },
    { bg: 'bg-rose-100 border-2 border-rose-300 text-rose-950 hover:bg-rose-200' },
    { bg: 'bg-purple-100 border-2 border-purple-300 text-purple-950 hover:bg-purple-200' }
  ];

  return (
    <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 max-w-2xl mx-auto shadow-sm" id="sentence-builder-block">
      {/* Step Info */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBackToTopic}
          className="flex items-center gap-1.5 text-xs font-black text-teal-700 hover:text-teal-800 bg-white border-2 border-teal-200 border-b-4 border-b-teal-400 px-4 py-2 rounded-xl transition-all"
        >
          <LucideIcons.ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>Về danh sách</span>
        </button>

        <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest bg-sky-100 border-2 border-sky-300 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
          <LucideIcons.Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-spin-slow" />
          <span>TRÒ CHƠI 1: BÉ GHÉP TỪ</span>
        </span>
      </div>

      {/* Target prompt card */}
      <div className="text-center mb-8 relative bg-sky-50/50 p-6 rounded-3xl border-2 border-sky-100">
        {item.customImage ? (
          <div className="mb-4 flex justify-center">
            <img 
              src={item.customImage} 
              alt={item.sentence} 
              className="max-h-48 max-w-full rounded-2xl border-4 border-white shadow-md object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="text-7xl mb-4 animate-bounce-slow filter drop-shadow-xs">{item.emoji}</div>
        )}
        {item.question ? (
          <>
            <h4 className="text-xs font-black uppercase text-teal-600 tracking-wider font-sans bg-teal-50 px-3 py-1.5 rounded-full inline-block mb-2 border border-teal-100">
              ❓ Bé hãy ghép câu để trả lời cho câu hỏi:
            </h4>
            <p className="text-2xl font-black text-sky-950 font-sans mt-2 leading-snug">
              &ldquo;{item.question}&rdquo;
            </p>
            {/* Minimal assistance text */}
            <p className="text-xs text-slate-400 font-extrabold font-sans mt-3">
              💡 {item.funFact}
            </p>
          </>
        ) : (
          <>
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest font-sans">
              Bé hãy ghép câu nói sau đây nhé:
            </h4>
            <p className="text-xl font-black text-sky-950 font-sans mt-1">
              &ldquo;{item.sentence}&rdquo;
            </p>
            <p className="text-xs text-teal-600 font-extrabold font-sans mt-2.5 bg-white py-1 px-4 rounded-full inline-block border border-teal-100">💡 {item.funFact}</p>
          </>
        )}
      </div>

      {/* Selected word line (The child is building a bridge of words) */}
      <div className="mb-8" id="selected-words-display">
        <label className="block text-center text-xs font-black uppercase text-sky-800 tracking-wider mb-3">
          Câu nói đúng trật tự của Bé:
        </label>
        
        <motion.div 
          animate={shakeCount > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="min-h-[96px] bg-sky-50/70 border-4 border-dashed border-sky-200 rounded-[28px] p-4 flex flex-wrap gap-3.5 items-center justify-center relative transition-all"
        >
          {selectedWords.length === 0 && (
            <span className="text-sky-400 font-black text-xs text-center uppercase tracking-wider selection:bg-transparent pointer-events-none">
              👉 Hãy chạm các mảnh chữ phía dưới để xếp câu nhé!
            </span>
          )}
          
          <AnimatePresence>
            {selectedWords.map((word, index) => (
              <motion.button
                key={`${word}-${index}`}
                initial={{ opacity: 0, scale: 0.6, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: -15 }}
                onClick={() => handleUndoWord(word, index)}
                className="px-6 py-4 bg-yellow-400 border-b-4 border-yellow-600 rounded-2xl text-lg font-black text-white shadow-md flex items-center gap-1.5 hover:bg-yellow-350 transition-all outline-none"
              >
                <span>{word}</span>
                <LucideIcons.X className="w-3.5 h-3.5 text-white/80 stroke-[3]" />
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scrambled word pool (The source bubbles) */}
      <div className="mb-8">
        <label className="block text-center text-xs font-black uppercase text-slate-400 tracking-wider mb-4">
          Từ vựng xáo trộn (Chạm để chọn):
        </label>
        
        <div className="flex flex-wrap gap-3.5 items-center justify-center p-2" id="scrambled-pool">
          {scrambledPool.map((word, index) => {
            const currentBubble = poolBubbleColors[index % poolBubbleColors.length];
            return (
              <motion.button
                key={`${word}-${index}`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleWordTap(word, index)}
                className={`${currentBubble.bg} font-black rounded-2xl px-6 py-4 text-lg cursor-pointer transform shadow-xs transition-all outline-none`}
              >
                {word}
              </motion.button>
            );
          })}
          {scrambledPool.length === 0 && !isSuccess && (
            <span className="text-gray-300 font-sans italic text-sm">Trật tự trống rỗng!</span>
          )}
        </div>
      </div>

      {/* Control Actions / Validation Results */}
      <div className="border-t-2 border-slate-100 pt-6 flex flex-col gap-4">
        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-l-2 border-r-2 border-t-2 border-emerald-200 border-b-8 border-emerald-500 rounded-[32px] p-6 text-center flex flex-col items-center shadow-xs"
            id="builder-success-box"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-3 border-b-4 border-emerald-700 text-white">
              <LucideIcons.Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h5 className="text-emerald-950 font-black text-xl font-sans">
              Tuyệt đỉnh cú mèo! Bé xếp đúng rồi! 🎉
            </h5>
            <p className="text-emerald-800 text-sm font-semibold mt-1">
              Câu chuẩn: <strong className="text-emerald-900 text-lg">&ldquo;{item.sentence}&rdquo;</strong>
            </p>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                onClick={handleListenGuide}
                className="bg-sky-500 hover:bg-sky-600 text-white font-black px-5 py-3.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-sky-700"
              >
                <LucideIcons.Volume2 className="w-4 h-4 stroke-[3]" />
                <span>NGHE CÔ GIÁO ĐỌC 👩‍🏫</span>
              </button>
              <button
                onClick={onCompleted}
                className="bg-amber-400 hover:bg-amber-500 text-white font-black px-6 py-3.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-amber-600 animate-pulse"
              >
                <span>CHƠI LUYỆN GIỌNG BÉ 🎙️</span>
                <LucideIcons.ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              onClick={handleListenGuide}
              className="bg-sky-500 hover:bg-sky-600 text-white font-black px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-sky-700"
            >
              <LucideIcons.Volume2 className="w-4 h-4 stroke-[2.5]" />
              <span>NGHE CÔ CỨU TRỢ</span>
            </button>

            <button
              onClick={handleReset}
              disabled={selectedWords.length === 0}
              className={`font-black px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-2 ${
                selectedWords.length > 0 
                  ? 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100 border-b-4 border-b-rose-400' 
                  : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
              }`}
            >
              <LucideIcons.RotateCcw className="w-4 h-4 text-current" />
              <span>XẾP LẠI</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
