import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as LucideIcons from "lucide-react";
import { UserStats } from "../types";
import { playSoundEffect, playVietnameseText } from "../utils/audioHelper";
import CustomJigsawPuzzle from "./CustomJigsawPuzzle";

interface LearningGamesProps {
  userStats: UserStats;
  onUpdateStats: (newStats: UserStats) => void;
  onBackToDashboard: () => void;
  initialGame?: "jigsaw" | "matching";
}

interface JigsawPiece {
  id: number;
  correctIndex: number;
  emoji: string;
  color: string;
}

interface CustomPuzzle {
  id: string;
  name: string;
  imageUrl: string;
  cols: number;
  rows: number;
}

export default function LearningGames({
  userStats,
  onUpdateStats,
  onBackToDashboard,
  initialGame = "jigsaw",
}: LearningGamesProps) {
  // Navigation active game tab: 'jigsaw' | 'matching'
  const [activeGame, setActiveGame] = useState<"jigsaw" | "matching">(initialGame);

  const [customPuzzles, setCustomPuzzles] = useState<CustomPuzzle[]>([]);
  const [hiddenPuzzles, setHiddenPuzzles] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("be_hoc_tieng_viet_custom_puzzles");
    const savedHidden = localStorage.getItem(
      "be_hoc_tieng_viet_hidden_puzzles",
    );
    if (saved) {
      try {
        setCustomPuzzles(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    if (savedHidden) {
      try {
        setHiddenPuzzles(JSON.parse(savedHidden));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveHiddenPuzzles = (puzzles: string[]) => {
    setHiddenPuzzles(puzzles);
    try {
      localStorage.setItem(
        "be_hoc_tieng_viet_hidden_puzzles",
        JSON.stringify(puzzles),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const saveCustomPuzzles = (puzzles: CustomPuzzle[]) => {
    setCustomPuzzles(puzzles);
    try {
      localStorage.setItem(
        "be_hoc_tieng_viet_custom_puzzles",
        JSON.stringify(puzzles),
      );
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        alert("⚠️ Bộ nhớ đã đầy! Ba mẹ vui lòng xóa bớt ảnh ghép hình cũ nhé.");
      }
    }
  };

  // Sync with initialGame prop changes
  useEffect(() => {
    if (initialGame) {
      setActiveGame(initialGame);
    }
  }, [initialGame]);

  // ---------- 🧩 GAME 1: JIGSAW PUZZLE SYSTEM ----------
  const defaultPuzzleLevels = [
    {
      id: "1",
      name: "Khởi đầu vui vẻ (3x3)",
      cols: 3,
      rows: 3,
      reqStars: 3,
      emoji: "🐥",
      theme: "Nông trại bé gà",
      imageUrl:
        "https://images.unsplash.com/photo-1548247661-3d7905940716?auto=format&fit=crop&q=80&w=600&h=600",
    },
    {
      id: "2",
      name: "Thử thách khéo tay (4x4)",
      cols: 4,
      rows: 4,
      reqStars: 6,
      emoji: "🦁",
      theme: "Khu rừng xanh thẳm",
      imageUrl:
        "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800&h=800",
    },
    {
      id: "3",
      name: "Siêu trí tuệ nhí (32 mảnh)",
      cols: 8,
      rows: 4,
      reqStars: 9,
      emoji: "🚀",
      theme: "Vũ trụ diệu kỳ",
      imageUrl:
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800&h=400",
    },
  ];

  const allPuzzles = [
    ...defaultPuzzleLevels,
    ...customPuzzles.map((p) => ({
      id: p.id,
      name: p.name,
      cols: p.cols,
      rows: p.rows,
      reqStars: 0,
      emoji: "🖼️",
      theme: "Ảnh tự ghép",
      imageUrl: p.imageUrl,
      isCustom: true,
    })),
  ];

  const [selectedLevel, setSelectedLevel] = useState<string>("1");
  const [isJigsawPlaying, setIsJigsawPlaying] = useState<boolean>(false);
  const [puzzleWon, setPuzzleWon] = useState<boolean>(false);
  const [puzzleKey, setPuzzleKey] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>(["1"]); // Level 1 is free-by-default, others need star purchase


  // Initialize the puzzle
  const initPuzzle = (levelId: string) => {
    setPuzzleWon(false);
    setPuzzleKey((prev) => prev + 1);

    const lvl = allPuzzles.find((l) => l.id === levelId);
    if (!lvl) return;
  };

  // Run on level changes
  useEffect(() => {
    if (activeGame === "jigsaw") {
      initPuzzle(selectedLevel);
    }
  }, [selectedLevel, activeGame]);

  // Handle locking check or purchase
  const handleSelectLevel = (levelId: string) => {
    playSoundEffect("click");
    const lvl = allPuzzles.find((l) => l.id === levelId);
    if (!lvl) return;

    if (unlockedLevels.includes(levelId) || lvl.isCustom) {
      setSelectedLevel(levelId);
    } else {
      // Prompt unlock
      if (userStats.stars >= lvl.reqStars) {
        if (
          window.confirm(
            `Bé ơi! Trò chơi cần dùng ${lvl.reqStars} ⭐ để mở khóa vĩnh viễn. Bé đồng ý chứ?`,
          )
        ) {
          const newStats = {
            ...userStats,
            stars: userStats.stars - lvl.reqStars,
          };
          onUpdateStats(newStats);
          setUnlockedLevels([...unlockedLevels, levelId]);
          setSelectedLevel(levelId);
          playSoundEffect("victory");
          playVietnameseText(
            "Chúc mừng bé đã mở khóa trò chơi mộc mạc mới thành công!",
          );
        }
      } else {
        playSoundEffect("pop");
        alert(
          `Ôi! Bé chưa đủ ngôi sao rồi. Bé cần có ít nhất ${lvl.reqStars} ⭐ vàng (Bé hiện tại: ${userStats.stars} ⭐). Hãy chăm học tập nói chuẩn câu để tích sao nhé!`,
        );
        playVietnameseText(
          "Con hãy chăm chỉ rèn nói chuẩn câu cùng cô để kiếm thêm sao vàng nhé!",
        );
      }
    }
  };



  // ---------- 🔗 GAME 2: MATCHING GAME SYSTEM ----------
  const [matchingGames, setMatchingGames] = useState<any[]>([]);
  const [selectedMatchingGameId, setSelectedMatchingGameId] = useState<string>("");
  const [connectedPairs, setConnectedPairs] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [drawingStartNode, setDrawingStartNode] = useState<{ id: string, type: 'left' | 'right', x: number, y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftNodes, setLeftNodes] = useState<{ id: string, x: number, y: number }[]>([]);
  const [rightNodes, setRightNodes] = useState<{ id: string, x: number, y: number }[]>([]);
  const [matchingGameWon, setMatchingGameWon] = useState(false);
  const [scrambledLeft, setScrambledLeft] = useState<any[]>([]);
  const [scrambledRight, setScrambledRight] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("be_hoc_tieng_viet_matching_games");
    if (saved) {
      try {
        setMatchingGames(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const startMatchingGame = (gameId: string) => {
    const game = matchingGames.find(g => g.id === gameId);
    if (!game) return;
    
    setSelectedMatchingGameId(gameId);
    setConnectedPairs([]);
    setMatchingGameWon(false);
    
    // Scramble left (images) and right (texts) separately
    const left = [...game.pairs].sort(() => Math.random() - 0.5);
    const right = [...game.pairs].sort(() => Math.random() - 0.5);
    
    setScrambledLeft(left);
    setScrambledRight(right);
    playSoundEffect("pop");
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, id: string, type: 'left' | 'right') => {
    if (matchingGameWon) return;
    // e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    setIsDrawing(true);
    setDrawingStartNode({ id, type, x, y });
    setCurrentLine({ x1: x, y1: y, x2: x, y2: y });
    playSoundEffect("click");
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !currentLine || !containerRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    setCurrentLine({
      ...currentLine,
      x2: clientX - containerRect.left,
      y2: clientY - containerRect.top
    });
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent, endId: string, endType: 'left' | 'right') => {
    if (!isDrawing || !drawingStartNode) return;
    setIsDrawing(false);
    setCurrentLine(null);

    if (drawingStartNode.type !== endType) {
      const pairId1 = drawingStartNode.id;
      const pairId2 = endId;
      
      if (pairId1 === pairId2) {
        if (!connectedPairs.includes(pairId1)) {
          const newConnections = [...connectedPairs, pairId1];
          setConnectedPairs(newConnections);
          
          playSoundEffect("success");
          
          const matchedItem = scrambledRight.find(r => r.id === pairId1);
          if (matchedItem) {
            if (matchedItem.audioUrl) {
              const audio = new Audio(matchedItem.audioUrl);
              audio.play().catch(e => console.error("Audio play error:", e));
            }
            // Removed default playVietnameseText as requested
          }
          
          if (newConnections.length === scrambledLeft.length) {
            setMatchingGameWon(true);
            const updated = {
              ...userStats,
              stars: userStats.stars + 2,
              coins: userStats.coins + 10,
            };
            onUpdateStats(updated);
            setTimeout(() => {
              playSoundEffect("clapping");
              playVietnameseText("Chúc mừng bé đã nối đúng tất cả!");
            }, 1000);
          }
        }
      } else {
        playSoundEffect("wrong");
      }
    } else {
      playSoundEffect("wrong");
    }
  };

  const updateNodePosition = (id: string, type: 'left' | 'right', node: HTMLElement | null) => {
    if (!node || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const x = rect.left - containerRect.left + (type === 'left' ? rect.width : 0);
    const y = rect.top - containerRect.top + rect.height / 2;

    if (type === 'left') {
      setLeftNodes(prev => {
        const existing = prev.find(n => n.id === id);
        if (existing && existing.x === x && existing.y === y) return prev;
        return [...prev.filter(n => n.id !== id), { id, x, y }];
      });
    } else {
      setRightNodes(prev => {
        const existing = prev.find(n => n.id === id);
        if (existing && existing.x === x && existing.y === y) return prev;
        return [...prev.filter(n => n.id !== id), { id, x, y }];
      });
    }
  };

  const getActiveMatchingGame = () => matchingGames.find(g => g.id === selectedMatchingGameId);

  return (
    <div
      className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-slate-150 border-b-8 border-slate-200 p-5 md:p-8 max-w-4xl mx-auto shadow-sm"
      id="learning-games-workspace"
    >
      {/* 👑 TITLE BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-dashed border-slate-150 pb-5 mb-6">
        <button
          onClick={() => {
            playSoundEffect("pop");
            onBackToDashboard();
          }}
          className="flex items-center gap-1.5 text-xs font-black text-[#5C3C10] hover:bg-slate-50 border-2 border-[#EAD5AB] border-b-4 border-b-[#C2B08C] px-4 py-2.5 rounded-2xl transition-all cursor-pointer outline-none"
        >
          <LucideIcons.ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>VÀO HỌC CHỮ</span>
        </button>

        <div className="flex items-center gap-2 bg-[#FFF9E3] border border-amber-300 rounded-full px-5 py-1.5 shadow-inner">
          <span className="text-xl">🎪</span>
          <span className="text-sm font-black text-amber-950 bubble-font tracking-tight">
            KHU VUI CHƠI TRÍ TUỆ NHÍ
          </span>
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
          onClick={() => {
            playSoundEffect("click");
            setActiveGame("jigsaw");
          }}
          className={`py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 outline-none cursor-pointer ${
            activeGame === "jigsaw"
              ? "bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-md border-b-4 border-indigo-700"
              : "text-slate-600 hover:bg-white/55"
          }`}
        >
          <span>🧩</span>
          <span>GHÉP ẢNH JIGSAW PUZZLE</span>
        </button>
        <button
          onClick={() => {
            playSoundEffect("click");
            setActiveGame("matching");
          }}
          className={`py-3.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 outline-none cursor-pointer ${
            activeGame === "matching"
              ? "bg-gradient-to-r from-purple-400 to-indigo-500 text-white shadow-md border-b-4 border-indigo-700"
              : "text-slate-600 hover:bg-white/55"
          }`}
        >
          <span>🔗</span>
          <span>TRÒ CHƠI NỐI HÌNH VÀ TÊN</span>
        </button>
      </div>

      {/* 🎪 GAME CONTAINER SCREENS */}
      <AnimatePresence mode="wait">
        {/* GAME SCREEN 1: JIGSAW PUZZLE */}
        {activeGame === "jigsaw" && (
          <motion.div
            key="jigsaw-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {!isJigsawPlaying ? (
              <div className="w-full bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-4">
                <h5 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <span>🔑 Chọn mức thử thách để bắt đầu:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allPuzzles
                    .filter((p) => !hiddenPuzzles.includes(p.id))
                    .map((lvl) => {
                      const isUnlocked =
                        unlockedLevels.includes(lvl.id) || lvl.isCustom;

                      return (
                        <div key={lvl.id} className="relative group">
                          <button
                            onClick={() => {
                              handleSelectLevel(lvl.id);
                              if (
                                unlockedLevels.includes(lvl.id) ||
                                lvl.isCustom
                              ) {
                                setIsJigsawPlaying(true);
                                initPuzzle(lvl.id);
                              }
                            }}
                            className={`w-full ${lvl.isCustom ? "aspect-square p-0 border-slate-800" : "p-4 border-slate-150 bg-white"} rounded-2xl flex flex-col items-center justify-center border-2 transition-all outline-none text-center relative overflow-hidden hover:-translate-y-1`}
                          >
                            {lvl.isCustom ? (
                              <>
                                <img
                                  src={lvl.imageUrl}
                                  alt="Custom Puzzle"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity md:opacity-100">
                                  <span className="text-white font-black text-xl mb-3 drop-shadow-md">
                                    ({lvl.cols}x{lvl.rows})
                                  </span>
                                  <span className="text-[10px] font-black text-teal-800 bg-teal-100/90 border border-teal-300 rounded-full py-1.5 px-4 uppercase shadow-sm">
                                    Chơi Ngay
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="text-4xl filter drop-shadow-sm mb-2">
                                  {lvl.emoji}
                                </span>
                                <span className="block text-sm font-black text-slate-800 leading-tight">
                                  {lvl.name}
                                </span>
                                <span className="block text-[10px] font-extrabold text-[#D35400] mt-1 uppercase tracking-wide">
                                  {lvl.theme}
                                </span>

                                <div className="mt-3">
                                  {isUnlocked ? (
                                    <span className="text-[10px] font-black text-teal-600 bg-teal-50 border border-teal-200 rounded-full py-1 px-3 uppercase">
                                      Chơi Ngay
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1 bg-[#FDEDEC] border border-rose-200 text-rose-600 px-3 py-1.5 rounded-full text-[10px] font-black">
                                      <LucideIcons.Lock className="w-3 h-3" />
                                      <span>Mua • {lvl.reqStars}⭐</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="flex-1 w-full bg-[#FAFBFD] rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center relative min-h-[400px]">
                <div className="w-full flex justify-between items-center mb-4">
                  <button
                    onClick={() => setIsJigsawPlaying(false)}
                    className="text-xs font-black text-slate-600 bg-white hover:bg-slate-100 border-2 border-slate-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 outline-none"
                  >
                    <LucideIcons.ArrowLeft className="w-4 h-4" />
                    <span>Quay lại</span>
                  </button>
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                      CHỦ ĐỀ:{" "}
                      {allPuzzles
                        .find((l) => l.id === selectedLevel)
                        ?.theme.toUpperCase() || "ẢNH GHÉP"}
                    </span>
                  </div>
                  <button
                    onClick={() => initPuzzle(selectedLevel)}
                    className="text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center gap-2 outline-none"
                  >
                    <LucideIcons.RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Chơi lại</span>
                  </button>
                </div>

                {puzzleWon && (
                  <div className="absolute inset-0 bg-[#E8F8F5]/95 z-50 rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-fade-in border-4 border-[#2ECC71]">
                    <span className="text-7xl animate-bounce-slow">🎈🏆🥇</span>
                    <h3 className="text-2.5xl font-black text-emerald-950 bubble-font mt-4">
                      XUẤT SẮC CÚ MÈO Ỏ!
                    </h3>
                    <p className="text-sm font-semibold text-emerald-800 max-w-sm mt-2 leading-relaxed">
                      Bé đã ráp hoàn chỉnh bức tranh{" "}
                      {allPuzzles.find((l) => l.id === selectedLevel)?.theme ||
                        "ẢNH GHÉP"}{" "}
                      thật rạng rỡ rồi!
                    </p>
                    <p className="text-xs bg-white text-[#2ECC71] border border-emerald-300 py-2.5 px-5 rounded-2xl font-black shadow-xs mt-4">
                      🎁 Đã thưởng: +{parseInt(selectedLevel) * 2 || 6} ⭐ và +
                      {parseInt(selectedLevel) * 10 || 30} tiền vàng
                    </p>

                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={() => setIsJigsawPlaying(false)}
                        className="font-black text-slate-600 bg-slate-100 hover:bg-slate-200 border-b-4 border-slate-300 px-6 py-3.5 rounded-2xl text-xs uppercase outline-none"
                      >
                        Thoát
                      </button>
                      <button
                        onClick={() => initPuzzle(selectedLevel)}
                        className="font-black text-[#5C3C10] bg-[#FFEB33] hover:bg-[#FFF645] border-b-4 border-[#C79D00] px-8 py-3.5 rounded-2xl text-xs uppercase animate-pulse outline-none"
                      >
                        Chơi bài ghép mới 🎮
                      </button>
                    </div>
                  </div>
                )}

                <div className="w-full mx-auto relative">
                  <CustomJigsawPuzzle
                    key={`${selectedLevel}-${puzzleKey}`}
                    imageSrc={
                      allPuzzles.find((l) => l.id === selectedLevel)
                        ?.imageUrl || ""
                    }
                    rows={
                      allPuzzles.find((l) => l.id === selectedLevel)?.rows || 3
                    }
                    cols={
                      allPuzzles.find((l) => l.id === selectedLevel)?.cols || 3
                    }
                    onSolved={() => {
                      if (!puzzleWon) {
                        setPuzzleWon(true);
                        playSoundEffect("victory");
                        const rewardStars = parseInt(selectedLevel) * 2 || 6;
                        const rewardCoins = parseInt(selectedLevel) * 10 || 30;
                        const updated = {
                          ...userStats,
                          stars: userStats.stars + rewardStars,
                          coins: userStats.coins + rewardCoins,
                        };
                        onUpdateStats(updated);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* GAME SCREEN 2: MATCHING GAME */}
        {activeGame === "matching" && (
          <motion.div
            key="matching-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {!selectedMatchingGameId ? (
              <div className="w-full bg-slate-50/70 p-5 rounded-3xl border border-slate-200 space-y-4">
                <h5 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <span>🔑 Chọn bài nối hình để bắt đầu:</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {matchingGames.length === 0 && (
                    <div className="col-span-full text-center py-8 text-slate-500 font-medium text-sm">
                      Chưa có trò chơi nối hình nào. Thầy cô/Ba mẹ hãy vào mục Quản lý Nối hình để thêm mới nhé!
                    </div>
                  )}
                  {matchingGames.map((game) => (
                    <div key={game.id} className="relative group">
                      <button
                        onClick={() => startMatchingGame(game.id)}
                        className="w-full h-full bg-white rounded-2.5xl p-5 border-2 border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col items-center justify-center text-center outline-none overflow-hidden"
                      >
                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                          <span className="text-2xl">🔗</span>
                        </div>
                        <span className="block text-sm font-black text-slate-800 leading-tight mb-2">
                          {game.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {game.pairs.length} cặp hình & chữ
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full relative">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => {
                      playSoundEffect("pop");
                      setSelectedMatchingGameId("");
                    }}
                    className="flex items-center gap-1.5 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
                  >
                    <LucideIcons.ArrowLeft className="w-4 h-4" />
                    <span>CHỌN BÀI KHÁC</span>
                  </button>
                  <div className="text-sm font-black text-purple-700 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                    BÀI: {getActiveMatchingGame()?.name}
                  </div>
                  <button
                    onClick={() => startMatchingGame(selectedMatchingGameId)}
                    className="flex items-center gap-1.5 text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-all"
                  >
                    <LucideIcons.RefreshCw className="w-4 h-4" />
                    <span>CHƠI LẠI</span>
                  </button>
                </div>

                <div 
                  ref={containerRef}
                  className="relative w-full bg-slate-50 rounded-3xl border-2 border-slate-200 p-6 min-h-[500px] flex justify-between touch-none overflow-hidden select-none"
                  onMouseMove={handleTouchMove}
                  onTouchMove={handleTouchMove}
                  onMouseUp={() => { if (isDrawing) { setIsDrawing(false); setCurrentLine(null); } }}
                  onTouchEnd={() => { if (isDrawing) { setIsDrawing(false); setCurrentLine(null); } }}
                  onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setCurrentLine(null); } }}
                >
                  {matchingGameWon && (
                    <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-sm">
                      <span className="text-7xl animate-bounce-slow">🎉🏅🌟</span>
                      <h3 className="text-2xl font-black text-purple-950 bubble-font mt-4">
                        BÉ GIỎI QUÁ! ĐÚNG HẾT RỒI!
                      </h3>
                      <p className="text-sm bg-purple-50 text-purple-700 border border-purple-200 py-2 px-5 rounded-2xl font-black shadow-xs mt-4">
                        🎁 Đã thưởng: +2 ⭐ và +10 vàng
                      </p>
                      <button
                        onClick={() => setSelectedMatchingGameId("")}
                        className="mt-6 font-black text-white bg-purple-600 hover:bg-purple-700 px-8 py-3.5 rounded-2xl text-sm transition-colors"
                      >
                        CHỌN BÀI KHÁC NHA
                      </button>
                    </div>
                  )}

                  {/* Left Column (Images) */}
                  <div className="flex flex-col gap-6 w-[120px] sm:w-[150px] relative z-20">
                    {scrambledLeft.map((item) => {
                      const isConnected = connectedPairs.includes(item.id);
                      return (
                        <div
                          key={`left-${item.id}`}
                          id={`left-${item.id}`}
                          ref={el => updateNodePosition(item.id, 'left', el)}
                          className={`w-full aspect-square rounded-2xl border-4 ${isConnected ? 'border-emerald-400 bg-emerald-50 opacity-50' : 'border-slate-300 bg-white hover:border-purple-400 cursor-pointer'} shadow-sm flex items-center justify-center overflow-hidden relative transition-all select-none`}
                          onMouseDown={e => { if (!isConnected) handleTouchStart(e, item.id, 'left'); }}
                          onTouchStart={e => { if (!isConnected) handleTouchStart(e, item.id, 'left'); }}
                          onMouseUp={e => { if (!isConnected) handleTouchEnd(e, item.id, 'left'); }}
                          onTouchEnd={e => { if (!isConnected) handleTouchEnd(e, item.id, 'left'); }}
                        >
                          {item.imageUrl && <img src={item.imageUrl} alt="Matching" className="w-full h-full object-cover pointer-events-none" />}
                          <div className={`absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                        </div>
                      )
                    })}
                  </div>

                  {/* SVG Lines Layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                    {/* Drawn Connections */}
                    {connectedPairs.map((pairId, idx) => {
                      const fromNode = leftNodes.find(n => n.id === pairId);
                      const toNode = rightNodes.find(n => n.id === pairId);
                      if (!fromNode || !toNode) return null;
                      return (
                        <line
                          key={idx}
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke="#10B981"
                          strokeWidth="6"
                          strokeLinecap="round"
                          className="animate-fade-in"
                        />
                      );
                    })}
                    {/* Active Drawing Line */}
                    {isDrawing && currentLine && (
                      <line
                        x1={currentLine.x1}
                        y1={currentLine.y1}
                        x2={currentLine.x2}
                        y2={currentLine.y2}
                        stroke="#A855F7"
                        strokeWidth="6"
                        strokeDasharray="10, 10"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>

                  {/* Right Column (Texts) */}
                  <div className="flex flex-col gap-6 w-[150px] sm:w-[200px] relative z-20">
                    {scrambledRight.map((item) => {
                      const isConnected = connectedPairs.includes(item.id);
                      return (
                        <div
                          key={`right-${item.id}`}
                          id={`right-${item.id}`}
                          ref={el => updateNodePosition(item.id, 'right', el)}
                          className={`w-full h-[120px] sm:h-[150px] rounded-2xl border-4 ${isConnected ? 'border-emerald-400 bg-emerald-50 opacity-50' : 'border-slate-300 bg-white hover:border-purple-400 cursor-pointer'} shadow-sm flex items-center justify-center p-4 relative transition-all text-center select-none`}
                          onMouseDown={e => { if (!isConnected) handleTouchStart(e, item.id, 'right'); }}
                          onTouchStart={e => { if (!isConnected) handleTouchStart(e, item.id, 'right'); }}
                          onMouseUp={e => { if (!isConnected) handleTouchEnd(e, item.id, 'right'); }}
                          onTouchEnd={e => { if (!isConnected) handleTouchEnd(e, item.id, 'right'); }}
                        >
                          <div className={`absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                          <span className="font-black text-slate-800 pointer-events-none select-none text-sm sm:text-base md:text-xl leading-tight">
                            {item.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
