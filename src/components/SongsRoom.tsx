import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { playSoundEffect, playVietnameseText } from '../utils/audioHelper';

interface SongsRoomProps {
  onBackToDashboard: () => void;
  accent: 'north' | 'south';
  onAwardCoins: (coins: number) => void;
}

interface Song {
  id: string;
  title: string;
  emoji: string;
  composer: string;
  duration: string;
  lyrics: string[];
}

const CHILDREN_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Cả Nhà Thương Nhau',
    composer: 'Phan Văn Minh',
    emoji: '👨‍👩‍👧‍👦',
    duration: '01:10',
    lyrics: [
      "Ba thương con vì con giống mẹ",
      "Mẹ thương con vì con giống ba",
      "Cả nhà ta cùng thương yêu nhau",
      "Xa là nhớ, gần nhau là cười!"
    ]
  },
  {
    id: 'song-2',
    title: 'Một Con Vịt',
    composer: 'Dân ca thiếu nhi',
    emoji: '🦆',
    duration: '01:15',
    lyrics: [
      "Một con vịt xòe ra hai cái cánh",
      "Nó kêu rằng cáp cáp cáp, cạp cạp cạp",
      "Gặp hồ nước nó bì bà bì bõm",
      "Lúc lên bờ vẫy cái cánh cho khô."
    ]
  },
  {
    id: 'song-3',
    title: 'Cháu Lên Ba',
    composer: 'Phạm Tuyên',
    emoji: '🎒',
    duration: '01:05',
    lyrics: [
      "Cháu lên ba cháu đi mẫu giáo",
      "Cô thương cháu vì cháu không khóc nhè",
      "Không khóc nhè để mẹ trồng trái cây",
      "Bố vào nhà máy, vinh dự ông bà nha!"
    ]
  }
];

export default function SongsRoom({
  onBackToDashboard,
  accent,
  onAwardCoins
}: SongsRoomProps) {
  const [selectedSongId, setSelectedSongId] = useState<string>(CHILDREN_SONGS[0].id);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeLyricIndex, setActiveLyricIndex] = useState<number>(0);
  const [songProgress, setSongProgress] = useState<number>(0);

  const selectedSong = CHILDREN_SONGS.find(s => s.id === selectedSongId) || CHILDREN_SONGS[0];

  const playTimerRef = useRef<any>(null);
  const audioIntervalRef = useRef<any>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const startPlayback = () => {
    stopPlayback();
    playSoundEffect('click');
    setIsPlaying(true);
    setActiveLyricIndex(0);
    setSongProgress(0);

    playVietnameseText(`Bé ơi! Chúng mình cùng múa hát rộn ràng bài ca: ${selectedSong.title} nhé!`);

    let currentLine = 0;
    let progressVal = 0;

    // Simulate lyric highlighting step-by-step
    playTimerRef.current = setInterval(() => {
      currentLine = (currentLine + 1) % selectedSong.lyrics.length;
      setActiveLyricIndex(currentLine);
      
      // Speak the current line automatically to make it a REAL sing-along tutorial!
      playVietnameseText(selectedSong.lyrics[currentLine], accent);
    }, 4500); // 4.5 seconds per line

    // Progress bar runner
    audioIntervalRef.current = setInterval(() => {
      progressVal += 1;
      setSongProgress(Math.min(progressVal, 100));

      if (progressVal >= 100) {
        stopPlayback();
        playSoundEffect('victory');
        // Earn coins for complete singing!
        onAwardCoins(10);
        playVietnameseText("Bé đã khoe giọng hát hay tuyệt vời rồi! Cô tặng bé thêm mười đồng vàng nhé!");
      }
    }, 500); // reaches 100 in 50 seconds
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
  };

  const handleSelectSong = (songId: string) => {
    stopPlayback();
    setSelectedSongId(songId);
    setActiveLyricIndex(0);
    setSongProgress(0);
    playSoundEffect('click');
  };

  return (
    <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-slate-150 border-b-8 border-slate-200 p-5 md:p-8 max-w-4xl mx-auto shadow-sm" id="songs-room-workspace">
      
      {/* 👑 TITLE BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-dashed border-slate-150 pb-5 mb-6">
        
        <button 
          onClick={() => { playSoundEffect('pop'); onBackToDashboard(); }}
          className="flex items-center gap-1.5 text-xs font-black text-[#5C3C10] hover:bg-slate-50 border-2 border-[#EAD5AB] border-b-4 border-b-[#C2B08C] px-4 py-2.5 rounded-2xl transition-all cursor-pointer outline-none"
        >
          <LucideIcons.ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>VÀO HỌC CHỮ</span>
        </button>

        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-5 py-1.5 shadow-inner">
          <span className="text-xl">🎵</span>
          <span className="text-sm font-black text-purple-900 bubble-font tracking-tight">PHÒNG KHÚC NHẠC THIẾU NHI</span>
        </div>

        <div className="text-[10px] font-black uppercase text-purple-600 bg-purple-100 border border-purple-200 rounded-lg py-1.5 px-3.5">
          <span>Sắp phát triển sau • Demo mộc mạc</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left song list panel (4 cols of 12) */}
        <div className="lg:col-span-4 bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-4 w-full">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            DANH SÁCH BÀI HÁT ({CHILDREN_SONGS.length})
          </span>
          
          <div className="flex flex-col gap-3">
            {CHILDREN_SONGS.map((song) => {
              const active = selectedSongId === song.id;
              return (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song.id)}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between border-2 text-left transition-all outline-none cursor-pointer ${
                    active
                      ? 'bg-purple-100/60 border-purple-300 text-purple-950 font-black'
                      : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2.5xl">{song.emoji}</span>
                    <div className="leading-tight">
                      <span className="block text-xs font-black">{song.title}</span>
                      <span className="block text-[9px] text-[#A0522D] mt-0.5 opacity-85">Sáng tác: {song.composer}</span>
                    </div>
                  </div>
                  
                  <span className="text-[10px] font-mono opacity-80">{song.duration}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-[#FFFCE4] border border-amber-300 p-4 rounded-2.5xl text-[10.5px] text-[#A0522D] font-extrabold leading-relaxed">
            🌿 <strong>Bé học bài ca:</strong> Nghe cô giáo phát từng vế chữ của lời nhạc rồi nhẩm hát ríu rít theo nhé! Hát hết bài sẽ được thưởng 🪙 10 đồng vàng óng đấy!
          </div>
        </div>

        {/* Right active player singalong room (8 cols of 12) */}
        <div className="lg:col-span-8 bg-[#FAFAFD] rounded-3xl p-6 border border-slate-150 flex flex-col items-center justify-between relative min-h-[420px]" id="karaoke-theater">
          
          {/* Deck with spinning record */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-6 justify-center py-4">
            
            {/* Spinning Disc vinyl representation */}
            <div className="relative">
              <motion.div 
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={isPlaying ? { repeat: Infinity, duration: 8, ease: 'linear' } : {}}
                className={`w-32 h-32 rounded-full bg-slate-900 border-8 border-slate-750 flex items-center justify-center shadow-lg relative ${isPlaying ? 'pulse-border' : ''}`}
              >
                {/* Center label */}
                <div className="w-12 h-12 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-xl select-none">
                  {selectedSong.emoji}
                </div>
                {/* Vinyl line indicator */}
                <div className="w-24 h-24 rounded-full border border-slate-800 absolute pointer-events-none"></div>
                <div className="w-18 h-18 rounded-full border border-slate-700 absolute pointer-events-none"></div>
              </motion.div>

              {/* Music Play note indicator particles */}
              {isPlaying && (
                <div className="absolute top-0 right-0 text-xl animate-bounce">🎶</div>
              )}
            </div>

            {/* Song label */}
            <div className="text-center sm:text-left leading-snug">
              <span className="text-[10px] bg-purple-100 text-purple-700 font-black px-2.5 py-1 rounded-full border border-purple-200">
                ĐANG TRÌNH DIỄN 🎙️
              </span>
              <h4 className="text-2xl font-black text-slate-800 bubble-font mt-2.5">
                {selectedSong.title}
              </h4>
              <p className="text-xs text-slate-500 font-extrabold font-sans mt-0.5">
                Sáng tác: {selectedSong.composer} • Giọng chuẩn cô Chích Chòe
              </p>
            </div>

          </div>

          {/* Karaoke Teleprompter Screen */}
          <div className="w-full bg-[#1E272C] rounded-2.5xl p-6 min-h-[160px] flex flex-col justify-center items-center text-center shadow-inner relative border-2 border-slate-800">
            {selectedSong.lyrics.map((line, idx) => {
              const isActive = activeLyricIndex === idx && isPlaying;
              return (
                <motion.p
                  key={idx}
                  animate={isActive ? { scale: 1.08, y: -2 } : { scale: 1 }}
                  className={`text-sm sm:text-base font-black transition-all duration-300 leading-relaxed my-1 select-none ${
                    isActive 
                      ? 'text-[#FFD32A] drop-shadow-md' 
                      : isPlaying && idx < activeLyricIndex 
                        ? 'text-slate-500/70 strike-through' 
                        : 'text-slate-300'
                  }`}
                >
                  {line}
                </motion.p>
              );
            })}

            {!isPlaying && (
              <span className="text-[10px] font-black uppercase text-slate-500/80 tracking-widest absolute inset-0 flex items-center justify-center bg-[#1E272C]/40 backdrop-blur-xs rounded-2.5xl select-none pointer-events-none">
                👉 Ấn nút PHÁT màu tím bên dưới để cùng múa ca!
              </span>
            )}
          </div>

          {/* Music Progress slider & bottom buttons */}
          <div className="w-full space-y-4 pt-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Progress bar line */}
            <div className="flex-1 w-full flex items-center gap-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-400">00:00</span>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                <div 
                  className="absolute left-0 top-0 h-full bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${songProgress}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">{selectedSong.duration}</span>
            </div>

            {/* Play controls */}
            <div className="flex items-center gap-3">
              {isPlaying ? (
                <button
                  onClick={stopPlayback}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-rose-700 outline-none cursor-pointer"
                >
                  <LucideIcons.Square className="w-4 h-4 fill-white" />
                  <span>DỪNG HÁT</span>
                </button>
              ) : (
                <button
                  onClick={startPlayback}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-black px-7 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition-all border-b-4 border-purple-800 outline-none cursor-pointer animate-pulse"
                >
                  <LucideIcons.Play className="w-4 h-4 fill-white" />
                  <span>CÙNG HÁT 🎶</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
