import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { UserStats } from '../types';
import { playSoundEffect, playVietnameseText } from '../utils/audioHelper';

interface LearningGamesProps {
  userStats: UserStats;
  onUpdateStats: (newStats: UserStats) => void;
  onBackToDashboard: () => void;
  initialGame?: 'jigsaw' | 'farm';
}

interface JigsawPiece {
  id: number;
  correctIndex: number;
  emoji: string;
  color: string;
}

export default function LearningGames({
  userStats,
  onUpdateStats,
  onBackToDashboard,
  initialGame = 'jigsaw'
}: LearningGamesProps) {
  // Navigation active game tab: 'jigsaw' | 'farm'
  const [activeGame, setActiveGame] = useState<'jigsaw' | 'farm'>(initialGame);

  // Sync with initialGame prop changes
  useEffect(() => {
    if (initialGame) {
      setActiveGame(initialGame);
    }
  }, [initialGame]);

  // ---------- 🧩 GAME 1: JIGSAW PUZZLE SYSTEM ----------
  // Puzzle difficulties
  // Level 1: 9 pieces (3x3), needs 3 stars
  // Level 2: 16 pieces (4x4), needs 6 stars
  // Level 3: 32 pieces (8x4 or similar size, let's use 25 pieces 5x5 to make it responsive, or 16 and let 32 pieces be 8x4), needs 9 stars.
  // Let's implement Level 1 (3x3 = 9), Level 2 (4x4 = 16), Level 3 (6x4 = 24 or 32 pieces)
  const puzzleLevels = [
    { id: 1, name: 'Khởi đầu vui vẻ (3x3)', piecesCount: 9, cols: 3, rows: 3, reqStars: 3, emoji: '🐥', theme: 'Nông trại bé gà' },
    { id: 2, name: 'Thử thách khéo tay (4x4)', piecesCount: 16, cols: 4, rows: 4, reqStars: 6, emoji: '🦁', theme: 'Khu rừng xanh thẳm' },
    { id: 3, name: 'Siêu trí tuệ nhí (32 mảnh)', piecesCount: 32, cols: 8, rows: 4, reqStars: 9, emoji: '🚀', theme: 'Vũ trụ diệu kỳ' }
  ];

  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [jigsawPieces, setJigsawPieces] = useState<JigsawPiece[]>([]);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [puzzleWon, setPuzzleWon] = useState<boolean>(false);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]); // Level 1 is free-by-default, others need star purchase

  // Emojis array to assemble cute drawings of different scenes
  const sceneEmojis_1 = ['🏡', '🌳', '🌤️', '🐄', '🚜', '🌾', '🐥', '🌻', '🐶']; // 9 pieces
  const sceneEmojis_2 = ['🦁', '🐯', '🌳', '🌴', '🐒', '🐘', '🦋', '🦎', '🌺', '🍃', '🐍', '🦅', '🦓', '🦒', '🦌', '🍄']; // 16 pieces
  // 32 pieces emojis
  const sceneEmojis_3 = [
    '🚀', '⭐', '🪐', '🌙', '🌌', '🛸', '🛰️', '☄️',
    '👨‍🚀', '👾', '🌈', '🌍', '🌞', '✨', '🔭', '📡',
    '🦊', '🐼', '🐰', '🐨', '🐯', '🦁', '🐻', '🐒',
    '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛'
  ];

  const colors_1 = [
    'bg-sky-200', 'bg-blue-200', 'bg-emerald-250',
    'bg-orange-100', 'bg-amber-200', 'bg-yellow-200',
    'bg-rose-150', 'bg-indigo-150', 'bg-purple-150'
  ];

  const colors_2 = [
    'bg-[#E8F8F5]', 'bg-[#D1F2EB]', 'bg-[#A9DFBF]', 'bg-[#7DCEA0]',
    'bg-[#FCF3CF]', 'bg-[#F9E79F]', 'bg-[#F5B041]', 'bg-[#F4D03F]',
    'bg-[#EBDEF0]', 'bg-[#D7BDE2]', 'bg-[#C39BD3]', 'bg-[#AF7AC5]',
    'bg-[#FDEDEC]', 'bg-[#FADBD8]', 'bg-[#F5B7B1]', 'bg-[#F1948A]'
  ];

  const colors_3 = Array(32).fill(0).map((_, i) => {
    const tones = ['bg-amber-100', 'bg-sky-100', 'bg-[#FFF2E2]', 'bg-teal-50', 'bg-[#F5F6FA]', 'bg-indigo-50', 'bg-rose-50', 'bg-[#FEFAEC]'];
    return tones[i % tones.length];
  });

  // Initialize the puzzle
  const initPuzzle = (levelId: number) => {
    setSelectedPieceIndex(null);
    setPuzzleWon(false);
    
    const lvl = puzzleLevels.find(l => l.id === levelId)!;
    const pieces: JigsawPiece[] = [];
    const sourceEmojis = levelId === 1 ? sceneEmojis_1 : levelId === 2 ? sceneEmojis_2 : sceneEmojis_3;
    const sourceColors = levelId === 1 ? colors_1 : levelId === 2 ? colors_2 : colors_3;

    for (let i = 0; i < lvl.piecesCount; i++) {
      pieces.push({
        id: i,
        correctIndex: i,
        emoji: sourceEmojis[i] || '🎁',
        color: sourceColors[i] || 'bg-[#FFFCDF]'
      });
    }

    // Scramble pieces until it's not solved
    let scrambled = [...pieces];
    let isSame = true;
    while (isSame) {
      scrambled.sort(() => Math.random() - 0.5);
      isSame = scrambled.every((piece, index) => piece.correctIndex === index);
    }

    setJigsawPieces(scrambled);
    playSoundEffect('click');
    playVietnameseText(`Trò chơi ghép hình chủ đề: ${lvl.theme}. Bé hãy chọn và đổi vị trí các mảnh để hoàn thiện nhé!`);
  };

  // Run on level changes
  useEffect(() => {
    if (activeGame === 'jigsaw') {
      initPuzzle(selectedLevel);
    }
  }, [selectedLevel, activeGame]);

  // Handle locking check or purchase
  const handleSelectLevel = (levelId: number) => {
    playSoundEffect('click');
    const lvl = puzzleLevels.find(l => l.id === levelId)!;

    if (unlockedLevels.includes(levelId)) {
      setSelectedLevel(levelId);
    } else {
      // Prompt unlock
      if (userStats.stars >= lvl.reqStars) {
        if (window.confirm(`Bé ơi! Trò chơi cần dùng ${lvl.reqStars} ⭐ để mở khóa vĩnh viễn. Bé đồng ý chứ?`)) {
          const newStats = {
            ...userStats,
            stars: userStats.stars - lvl.reqStars
          };
          onUpdateStats(newStats);
          setUnlockedLevels([...unlockedLevels, levelId]);
          setSelectedLevel(levelId);
          playSoundEffect('victory');
          playVietnameseText("Chúc mừng bé đã mở khóa trò chơi mộc mạc mới thành công!");
        }
      } else {
        playSoundEffect('pop');
        alert(`Ôi! Bé chưa đủ ngôi sao rồi. Bé cần có ít nhất ${lvl.reqStars} ⭐ vàng (Bé hiện tại: ${userStats.stars} ⭐). Hãy chăm học tập nói chuẩn câu để tích sao nhé!`);
        playVietnameseText("Con hãy chăm chỉ rèn nói chuẩn câu cùng cô để kiếm thêm sao vàng nhé!");
      }
    }
  };

  // Tap piece to select or swap
  const handlePieceClick = (index: number) => {
    if (puzzleWon) return;

    if (selectedPieceIndex === null) {
      playSoundEffect('click');
      setSelectedPieceIndex(index);
    } else {
      // Swap elements
      playSoundEffect('pop');
      const newPieces = [...jigsawPieces];
      const temp = newPieces[selectedPieceIndex];
      newPieces[selectedPieceIndex] = newPieces[index];
      newPieces[index] = temp;

      setJigsawPieces(newPieces);
      setSelectedPieceIndex(null);

      // Check if solved
      const isSolved = newPieces.every((piece, idx) => piece.correctIndex === idx);
      if (isSolved) {
        setPuzzleWon(true);
        playSoundEffect('success');
        
        // reward sweet award stats
        const rewardStars = selectedLevel * 2;
        const rewardCoins = selectedLevel * 10;
        const updated = {
          ...userStats,
          stars: userStats.stars + rewardStars,
          coins: userStats.coins + rewardCoins
        };
        onUpdateStats(updated);

        playVietnameseText(`Mắt bé tinh anh quá đi thôi! Hoàn thành bức tranh và nhận ngay ${rewardStars} sao và ${rewardCoins} vàng nhé!`);
      }
    }
  };


  // ---------- 🌱 GAME 2: FRUIT TREE FARM SYSTEM ----------
  // Farm Stages:
  // 0: Vacant Pot (Đất trống)
  // 1: Seed planted (Đã gieo hạt giống 🌰)
  // 2: Sprouted (Nảy mầm xinh 🌱)
  // 3: Flowering (Ra hoa thơm 🌸)
  // 4: Fruits ripe (Trĩu quả mọng 🍎)
  const [plantStage, setPlantStage] = useState<number>(0);
  const [waterCount, setWaterCount] = useState<number>(0);
  const [sunlightActive, setSunlightActive] = useState<boolean>(false);
  const [weedWormActive, setWeedWormActive] = useState<boolean>(false);
  const [ripeFruitCount, setRipeFruitCount] = useState<number>(0);
  const [harvestedFruitCount, setHarvestedFruitCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('be_hoc_tieng_viet_farm_apples');
      return saved ? parseInt(saved) : 0;
    } catch (e) {
      return 0;
    }
  });

  // Keep upping local apple persistence
  const saveHarvestedApples = (count: number) => {
    setHarvestedFruitCount(count);
    try {
      localStorage.setItem('be_hoc_tieng_viet_farm_apples', count.toString());
    } catch (e) {}
  };

  // Sow a new seed
  const handleSowSeed = () => {
    if (plantStage > 0) return;
    playSoundEffect('click');
    setPlantStage(1);
    setWaterCount(0);
    setWeedWormActive(false);
    setSunlightActive(false);
    playVietnameseText("Bé đã gieo mầm hạt giống thần kỳ xuống đất rồi! Mau tưới nước thôi!");
  };

  // Water the sprout
  const handleWaterPlant = () => {
    if (plantStage === 0 || plantStage === 4) return;
    playSoundEffect('click');
    
    const newWater = waterCount + 1;
    setWaterCount(newWater);

    if (newWater % 2 === 0) {
      // Sprout or expand Stage
      setPlantStage(prev => Math.min(prev + 1, 3));
      // Randomly attract a worm/weeds to handle
      if (Math.random() > 0.4) {
        setWeedWormActive(true);
      }
      playVietnameseText("Cây uống nước rào rào lớn nhanh thổi thổi rồi kìa bé giỏi lắm!");
    } else {
      playVietnameseText("Bé đã tưới cho cây làn nước mát ngọt lịm!");
    }
  };

  // Sunlight therapy
  const handleSunlight = () => {
    if (plantStage < 2 || plantStage === 4) return;
    playSoundEffect('click');
    setSunlightActive(true);
    setTimeout(() => {
      setSunlightActive(false);
      // Fast upgrade to floral bloom
      if (plantStage === 2) {
        setPlantStage(3);
        playVietnameseText("Cây quang hợp ánh mặt trời dịu hiền và đâm chồi nở hoa rồi!");
      } else if (plantStage === 3) {
        setPlantStage(4);
        setRipeFruitCount(4 + Math.floor(Math.random() * 4)); // 4 to 7 apples
        playVietnameseText("Cây đơm hoa kết trái đỏ mọng ngọt lịm rồi kìa bé ơi! Mau thu hoạch nào!");
      }
    }, 1500);
  };

  // Catch worm & remove weedy mess
  const handleCatchWorm = () => {
    if (!weedWormActive) return;
    playSoundEffect('victory');
    setWeedWormActive(false);
    
    // extra point
    const updated = {
      ...userStats,
      coins: userStats.coins + 5
    };
    onUpdateStats(updated);
    playVietnameseText("Chú sâu nhỏ béo nục đã được gắp ra ngoài rồi! Cây cảm ơn bé nhiều lắm nha!");
  };

  // Harvest apples
  const handleHarvestApple = (fruitIndex: number) => {
    if (plantStage !== 4 || ripeFruitCount <= 0) return;
    playSoundEffect('victory');
    setRipeFruitCount(prev => prev - 1);
    const newTotal = harvestedFruitCount + 1;
    saveHarvestedApples(newTotal);

    if (ripeFruitCount === 1) {
      // Harvested all! Reset soil
      setPlantStage(0);
      setWaterCount(0);
      playVietnameseText("Bé đã nhặt sạch trái chín trong rổ! Hãy gieo hạt giống mới nha!");
    } else {
      playVietnameseText("Đã bỏ rổ một quả táo đỏ chín mọng!");
    }
  };

  // Sell fruits for stars!
  // Cost: 5 apples for 1 star (sao)
  const handleTradeFruits = () => {
    if (harvestedFruitCount < 5) {
      playSoundEffect('pop');
      alert(`Bé ơi! Bé cần hái ít nhất 5 quả táo chín 🍎 trong giỏ để đổi lấy 1 ⭐ vàng nhé. (Hiện bé có: ${harvestedFruitCount} quả)`);
      playVietnameseText("Bé hãy hái thật nhiều táo ngọt thơm nữa rồi đổi sao nhé!");
      return;
    }

    playSoundEffect('success');
    const newApples = harvestedFruitCount - 5;
    saveHarvestedApples(newApples);

    const updated = {
      ...userStats,
      stars: userStats.stars + 1,
      coins: userStats.coins + 15
    };
    onUpdateStats(updated);
    playVietnameseText("Tèn ten! 5 quả quả cải đổi lấy một ngôi sao lấp lánh và vàng hào phóng!");
  };

  return (
    <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-slate-150 border-b-8 border-slate-200 p-5 md:p-8 max-w-4xl mx-auto shadow-sm" id="learning-games-workspace">
      
      {/* 👑 TITLE BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-dashed border-slate-150 pb-5 mb-6">
        
        <button 
          onClick={() => { playSoundEffect('pop'); onBackToDashboard(); }}
          className="flex items-center gap-1.5 text-xs font-black text-[#5C3C10] hover:bg-slate-50 border-2 border-[#EAD5AB] border-b-4 border-b-[#C2B08C] px-4 py-2.5 rounded-2xl transition-all cursor-pointer outline-none"
        >
          <LucideIcons.ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>VÀO HỌC CHỮ</span>
        </button>

        <div className="flex items-center gap-2 bg-[#FFF9E3] border border-amber-300 rounded-full px-5 py-1.5 shadow-inner">
          <span className="text-xl">🎪</span>
          <span className="text-sm font-black text-amber-950 bubble-font tracking-tight">KHU VUI CHƠI TRÍ TUỆ NHÍ</span>
        </div>

        {/* Display kid balances */}
        <div className="flex items-center gap-2.5">
          <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-800 font-black text-xs px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs">
            <LucideIcons.Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500" />
            <span>{userStats.stars} SAO</span>
          </div>
          <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-800 font-black text-xs px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xs">
            <span>🪙</span>
            <span>{userStats.coins} VÀNG</span>
          </div>
        </div>

      </div>

      {/* 🎮 SELECT GAME TAB SWITCHER */}
      <div className="grid grid-cols-2 gap-3 mb-8 bg-slate-100 p-1.5 rounded-2.5xl border border-slate-200">
        <button
          onClick={() => { playSoundEffect('click'); setActiveGame('jigsaw'); }}
          className={`py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 outline-none cursor-pointer ${
            activeGame === 'jigsaw'
              ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-md border-b-4 border-indigo-700'
              : 'text-slate-600 hover:bg-white/55'
          }`}
        >
          <span>🧩</span>
          <span>GHÉP HÌNH ĐỐI VỊ TRÍ</span>
        </button>
        <button
          onClick={() => { playSoundEffect('click'); setActiveGame('farm'); }}
          className={`py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 outline-none cursor-pointer ${
            activeGame === 'farm'
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-md border-b-4 border-green-700'
              : 'text-slate-600 hover:bg-white/55'
          }`}
        >
          <span>🌱</span>
          <span>Ý THỨC TRỒNG CÂY QUẢ</span>
        </button>
      </div>

      {/* 🎪 GAME CONTAINER SCREENS */}
      <AnimatePresence mode="wait">
        
        {/* GAME SCREEN 1: JIGSAW PUZZLE */}
        {activeGame === 'jigsaw' && (
          <motion.div
            key="jigsaw-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col lg:flex-row gap-6 items-start"
          >
            {/* Left controls: difficulties locks */}
            <div className="w-full lg:w-1/3 bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-4">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>🔑 Chọn mức thử thách:</span>
              </h5>

              <div className="flex flex-col gap-3">
                {puzzleLevels.map((lvl) => {
                  const isUnlocked = unlockedLevels.includes(lvl.id);
                  const isCurrent = selectedLevel === lvl.id;
                  
                  return (
                    <button
                      key={lvl.id}
                      onClick={() => handleSelectLevel(lvl.id)}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all outline-none text-left relative overflow-hidden group ${
                        isCurrent
                          ? 'bg-[#FFF9E3] border-yellow-400 shadow-sm font-black text-yellow-950'
                          : 'bg-white border-slate-150 hover:bg-slate-55'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2.5xl filter drop-shadow-xs">{lvl.emoji}</span>
                        <div>
                          <span className="block text-xs font-black text-slate-800 leading-tight">
                            {lvl.name}
                          </span>
                          <span className="block text-[9.5px] font-extrabold text-[#D35400] mt-0.5 uppercase tracking-wide">
                            {lvl.theme}
                          </span>
                        </div>
                      </div>

                      <div className="z-10">
                        {isUnlocked ? (
                          isCurrent ? (
                            <span className="text-xs text-yellow-600 bg-yellow-100 rounded-full py-1 px-3 font-black flex items-center gap-1">
                              <span>BẬT</span>
                              <LucideIcons.Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-teal-600 bg-teal-50 border border-teal-200 rounded-full py-1 px-2.5 uppercase">
                              Ẵm Sẵn
                            </span>
                          )
                        ) : (
                          <div className="flex items-center gap-1 bg-[#FDEDEC] border border-rose-200 text-rose-600 px-3 py-1.5 rounded-full text-[10px] font-black">
                            <LucideIcons.Lock className="w-3 h-3" />
                            <span>Mua • {lvl.reqStars}⭐</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-[10.5px] text-[#A0522D] font-extrabold bg-[#FFF9E3] p-4 rounded-2xl border border-[#FAEDCD] leading-relaxed">
                📢 <strong>Cách chơi:</strong> Bé cưng ơi, hãy bấm vào <strong>mảnh thứ nhất</strong> rồi bấm tiếp vào <strong>mảnh thứ hai</strong>, chúng sẽ lập tức đổi chỗ cho nhau! Sắp xếp đúng thứ tự các con vật sẽ qua màn nhé!
              </div>

              <button
                onClick={() => initPuzzle(selectedLevel)}
                className="w-full text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-2 border-b-4 border-indigo-200 border-b-indigo-400 py-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 outline-none"
              >
                <LucideIcons.RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>PHÁO BÀN COI • XÁO LẠI TRỨNG</span>
              </button>
            </div>

            {/* Right main board: the matrix puzzle */}
            <div className="flex-1 w-full bg-[#FAFBFD] rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center relative min-h-[400px]">
              {puzzleWon && (
                <div className="absolute inset-0 bg-[#E8F8F5]/90 z-20 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in border-4 border-[#2ECC71]">
                  <span className="text-7xl animate-bounce-slow">🎈🏆🥇</span>
                  <h3 className="text-2.5xl font-black text-emerald-950 bubble-font mt-4">
                    XUẤT SẮC CÚ MÈO Ỏ!
                  </h3>
                  <p className="text-sm font-semibold text-emerald-800 max-w-sm mt-2 leading-relaxed">
                    Bé đã ráp hoàn chỉnh bức tranh {puzzleLevels.find(l=>l.id===selectedLevel)?.theme} thật rạng rỡ rồi!
                  </p>
                  <p className="text-xs bg-white text-[#2ECC71] border border-emerald-300 py-2.5 px-5 rounded-2xl font-black shadow-xs mt-4">
                    🎁 Đã thưởng: +{selectedLevel * 2} ⭐ và +{selectedLevel * 10} tiền vàng
                  </p>
                  
                  <button
                    onClick={() => initPuzzle(selectedLevel)}
                    className="mt-6 font-black text-[#5C3C10] bg-[#FFEB33] hover:bg-[#FFF645] border-b-4 border-[#C79D00] px-8 py-3.5 rounded-2xl text-xs uppercase animate-pulse outline-none"
                  >
                    Chơi bài ghép mới 🎮
                  </button>
                </div>
              )}

              {/* Grid drawing area */}
              <div 
                className="grid gap-2 border-4 border-slate-300 bg-slate-200 rounded-3xl p-3.5 shadow-md max-w-sm w-full mx-auto justify-center select-none"
                style={{
                  gridTemplateColumns: `repeat(${puzzleLevels.find(l => l.id === selectedLevel)?.cols}, minmax(0, 1fr))`
                }}
              >
                {jigsawPieces.map((piece, i) => {
                  const isSelected = selectedPieceIndex === i;
                  const isCorrect = piece.correctIndex === i;
                  return (
                    <motion.div
                      key={`${piece.id}-${i}`}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handlePieceClick(i)}
                      className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2.5xl sm:text-3.5xl cursor-pointer border-2 shadow-sm transition-all focus:outline-none ${
                        piece.color
                      } ${
                        isSelected 
                          ? 'border-[#FC5C65] border-b-4 ring-4 ring-rose-300 scale-105' 
                          : isCorrect && !puzzleWon 
                            ? 'border-emerald-500 border-b-4' 
                            : 'border-slate-300 border-b-4'
                      }`}
                    >
                      <span>{piece.emoji}</span>
                      
                      {/* Grid location hint inside piece, soft watermark for toddlers */}
                      <span className="absolute bottom-1 right-1 text-[8px] font-black opacity-30 font-mono">
                        {piece.correctIndex + 1}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Prompt underneath board */}
              <div className="mt-5 text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                  CHỦ ĐỀ: {puzzleLevels.find(l=>l.id===selectedLevel)?.theme.toUpperCase()}
                </span>
                <p className="text-xs text-slate-500 font-extrabold mt-1">
                  Số mảnh: {jigsawPieces.length} miếng ghép • Bé xếp nhanh tay tinh mắt nào!
                </p>
              </div>

            </div>
          </motion.div>
        )}

        {/* GAME SCREEN 2: FRUIT TREE FARM */}
        {activeGame === 'farm' && (
          <motion.div
            key="farm-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col lg:flex-row gap-6 items-stretch"
          >
            {/* Interactive Farm tools */}
            <div className="w-full lg:w-1/3 bg-slate-50/50 p-5 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-5">
              <div>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-150 px-2.5 py-0.5 border border-emerald-200 rounded-full uppercase tracking-wider block w-max">
                  CÔNG CỤ NÔNG DÂN
                </span>
                <h5 className="text-base font-black text-[#5C3C10] mt-2 bubble-font flex items-center gap-1.5">
                  <span>Chăm sóc đất đai</span>
                  <span>🚜</span>
                </h5>
                <p className="text-[11px] text-[#A0522D] font-extrabold mt-0.5 leading-snug">
                  Bé hãy dùng dụng cụ phù hợp dưới đây để giúp cây lớn ríu rít nhé:
                </p>

                {/* Vertical Toolbar buttons */}
                <div className="space-y-3.5 mt-5">
                  {/* Tool 1: Sow Seed */}
                  <button
                    onClick={handleSowSeed}
                    disabled={plantStage > 0}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 border-2 text-left transition-all cursor-pointer outline-none ${
                      plantStage === 0
                        ? 'bg-amber-100 border-amber-300 hover:bg-amber-150 font-black text-amber-950 animate-pulse'
                        : 'bg-white border-slate-150 text-slate-400 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">🌰</span>
                    <div>
                      <span className="block text-xs font-black">Gieo hạt giống hữu cơ</span>
                      <span className="block text-[10px] opacity-80 font-semibold">Khởi tạo sự sống mới</span>
                    </div>
                  </button>

                  {/* Tool 2: Water */}
                  <button
                    onClick={handleWaterPlant}
                    disabled={plantStage === 0 || plantStage === 4}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 border-2 text-left transition-all cursor-pointer outline-none ${
                        plantStage > 0 && plantStage < 4
                        ? 'bg-blue-100 border-blue-300 hover:bg-blue-150 font-black text-blue-950 shadow-xs'
                        : 'bg-white border-slate-150 text-slate-400 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">💧</span>
                    <div>
                      <span className="block text-xs font-black">Tưới nước máy ngọt mát</span>
                      <span className="block text-[10px] opacity-80 font-semibold">Lượng tưới tinh thể, lớn thêm tí nữa</span>
                    </div>
                  </button>

                  {/* Tool 3: Sunlight Sunshine */}
                  <button
                    onClick={handleSunlight}
                    disabled={plantStage < 2 || plantStage === 4}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 border-2 text-left transition-all cursor-pointer outline-none ${
                        plantStage >= 2 && plantStage < 4
                        ? 'bg-orange-100 border-orange-300 hover:bg-orange-150 font-black text-orange-950 shadow-xs'
                        : 'bg-white border-slate-150 text-slate-400 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-2xl">☀️</span>
                    <div>
                      <span className="block text-xs font-black">Chiếu nắng mặt trời vàng</span>
                      <span className="block text-[10px] opacity-80 font-semibold">Giúp cây nở hoa kết trái đỏ</span>
                    </div>
                  </button>

                  {/* Option worm catcher tool */}
                  {weedWormActive && (
                    <button
                      onClick={handleCatchWorm}
                      className="w-full p-3.5 bg-red-100 border-2 border-red-350 rounded-2xl flex items-center gap-3.5 hover:bg-red-200 transition-all cursor-pointer text-left text-red-950 animate-bounce font-black shadow-sm outline-none"
                    >
                      <span className="text-2xl">🐛</span>
                      <div>
                        <span className="block text-xs">Phát hiện bọ dừa sâu hại!</span>
                        <span className="block text-[10px] text-red-700 font-extrabold uppercase animate-pulse">Chạm ngay để tiêu diệt bọ sâu nhận +5🪙</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Basket exchange star panel */}
              <div className="bg-[#FFFCE4] border-2 border-dashed border-yellow-300 p-4 rounded-2.5xl text-center">
                <span className="text-3xl block">🧺</span>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  GIỎ TRÁI CÂY CỦA BÉ
                </span>
                <span className="block text-xl font-black text-amber-950 bubble-font mt-0.5">
                  {harvestedFruitCount} QUẢ TÁO 🍎
                </span>

                <button
                  onClick={handleTradeFruits}
                  disabled={harvestedFruitCount < 5}
                  className={`w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-black transition-all border-b-4 outline-none ${
                    harvestedFruitCount >= 5
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 border-orange-600 text-white font-black animate-pulse cursor-pointer'
                      : 'bg-slate-250 border-slate-300 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  ĐỔI TÁO LẤY SAO ⭐ (+15🪙)
                </button>
                <span className="block text-[9.5px] text-[#A0522D] font-extrabold mt-1.5 opacity-80 font-sans">
                  * 5 quả táo chín 🍎 sẽ đổi lấy 1 sao lấp lánh đấy bé iu!
                </span>
              </div>
            </div>

            {/* Farm stage center arena view */}
            <div className={`flex-1 w-full bg-gradient-to-b ${sunlightActive ? 'from-amber-200/40 to-sky-100' : 'from-sky-100 to-emerald-50'} rounded-3xl border border-slate-250 p-6 flex flex-col justify-between items-center relative overflow-hidden min-h-[440px]`}>
              
              {/* Sunlight overlay shine effect */}
              {sunlightActive && (
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-yellow-300/40 to-transparent pointer-events-none filter blur-md animate-pulse"></div>
              )}

              {/* Floating Cloud decoration */}
              <div className="absolute top-8 left-12 text-3xl opacity-20 pointer-events-none animate-bounce-slow">☁️</div>
              <div className="absolute top-12 right-12 text-4xl opacity-15 pointer-events-none animate-bounce-slow">☁️</div>

              {/* Display board step text */}
              <div className="text-center z-10 w-full mb-4">
                <span className="text-[10px] tracking-widest text-[#2ECC71] bg-[#EAFAF1] font-black px-3.5 py-1.5 rounded-full border border-[#D5F5E3]">
                  {plantStage === 0 && "🌱 ĐẤT ĐANG CHỜ GIEO HẠT"}
                  {plantStage === 1 && "🌰 MẦM NON ĐANG THUỘC ĐẤT"}
                  {plantStage === 2 && "🌿 CÂY BẮT ĐẦU VƯƠN CAO LÁ XANH"}
                  {plantStage === 3 && "🌸 HOA NỞ THƠM NGÀO NGẠT KHẮP NƠI"}
                  {plantStage === 4 && "🍎 TÁO ĐỎ CHÍN TRĨU CÀNH QUẢ NGỌT"}
                </span>

                <div className="h-6 mt-2 relative">
                  {weedWormActive && (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-3 py-0.5 rounded-full font-black animate-pulse inline-block">
                      🐛 Ôi có sâu đục thân cây hoa rồi! Bé cứu cây bé ơ!
                    </span>
                  )}
                </div>
              </div>

              {/* Plant Pot Canvas Visual */}
              <div className="relative flex-1 flex flex-col items-center justify-end w-full pb-8 select-none">
                
                {/* 🌰 Stage 1 seed */}
                {plantStage === 1 && (
                  <motion.div 
                    initial={{ scale: 0.5, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="text-4xl filter drop-shadow-xs z-10 mb-[-10px]"
                  >
                    🌰
                  </motion.div>
                )}

                {/* 🌱 Stage 2 sprout */}
                {plantStage === 2 && (
                  <motion.div 
                    initial={{ scale: 0.6, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="text-6xl filter drop-shadow-xs z-10 mb-[-10px] animate-pulse"
                  >
                    🌱
                  </motion.div>
                )}

                {/* 🌿🌸 Stage 3 flowering */}
                {plantStage === 3 && (
                  <motion.div 
                    initial={{ scale: 0.7, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    className="text-7xl sm:text-8xl filter drop-shadow-xs z-10 mb-[-12px] relative flex flex-col items-center"
                  >
                    <span>🌸</span>
                    <span className="text-3xl absolute top-0 left-[-2px]">🌱</span>
                  </motion.div>
                )}

                {/* 🌳🍎 Stage 4 tree full of apples */}
                {plantStage === 4 && (
                  <motion.div 
                    initial={{ scale: 0.8, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-48 h-48 sm:w-56 sm:h-56 z-10 mb-[-10px] relative flex items-center justify-center"
                  >
                    {/* Big lush tree decoration */}
                    <span className="text-[130px] sm:text-[160px] filter drop-shadow-md absolute inset-0 text-center leading-none select-none z-0">
                      🌳
                    </span>

                    {/* Interactive Apples floating inside tree area */}
                    {Array.from({ length: ripeFruitCount }).map((_, idx) => {
                      // coordinates distributed inside green bushes
                      const offsets = [
                        { top: '35px', left: '46px' },
                        { top: '45px', left: '96px' },
                        { top: '75px', left: '33px' },
                        { top: '70px', left: '116px' },
                        { top: '55px', left: '72px' },
                        { top: '95px', left: '55px' },
                        { top: '88px', left: '90px' }
                      ];
                      const style = offsets[idx % offsets.length];

                      return (
                        <button
                          key={idx}
                          onClick={() => handleHarvestApple(idx)}
                          style={{ top: style.top, left: style.left }}
                          className="absolute z-10 w-9 h-9 bg-white hover:scale-110 active:scale-95 text-lg rounded-full border border-yellow-250 shadow-md flex items-center justify-center transition-all animate-bounce outline-none cursor-pointer"
                          title="Hái táo bỏ giỏ nha bé cưng"
                        >
                          🍎
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {/* Big Pot below */}
                <div className="w-32 h-14 bg-gradient-to-r from-amber-700 to-amber-800 rounded-b-xl border-t-8 border-amber-600 shadow-md relative z-10 flex items-center justify-center">
                  <span className="text-[9px] font-black text-amber-200 tracking-wider">CHẬU ĐẤT CỦA BÉ</span>
                  {/* Dirt line */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-[#4A3225]"></div>
                </div>

              </div>

              {/* Status footer banner */}
              <div className="text-center z-10">
                <span className="text-[11px] font-mono font-black text-[#5C3C10]">
                  Giai đoạn phát triển: {plantStage}/4 • Cấp nước tưới: {waterCount} lần
                </span>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
