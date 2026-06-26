import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Volume2,
  Mic,
  Square,
  Play,
  Pause,
  Image as ImageIcon,
  Music,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Info,
  PlusCircle,
  FileText,
  Cloud,
  Database,
  Copy,
  Download,
  FileJson,
  Sliders,
  LogOut,
  LogIn,
  Puzzle,
  ImagePlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { playSoundEffect } from "../utils/audioHelper";
import { Topic, LessonItem, AudioHotspot } from "../types";
import {
  MathLibraryItem,
  getMathIllustrations,
  saveMathIllustrations,
  compressImage,
  CustomSounds,
  getCustomSounds,
  saveCustomSounds,
} from "../utils/mathLibraryHelper";
import { auth } from "../firebase";
import {
  signInWithGoogle,
  logOut,
  listenToAuth,
} from "../utils/firebaseHelper";
import { User } from "firebase/auth";

const adjustSentenceForDifficulty = (
  sentence: string,
  difficulty: "dễ" | "trung bình" | "khó",
) => {
  let clean = sentence.trim();
  if (!clean) return "";

  // Strip all punctuation: . , ! ? ; : - _ ( ) " '
  let base = clean
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = base.split(/\s+/).filter(Boolean);

  if (difficulty === "dễ") {
    // dễ (3-4 từ)
    if (words.length > 4) {
      base = words.slice(0, 4).join(" ");
    }
  } else if (difficulty === "trung bình") {
    // trung bình (5-7 chữ)
    if (words.length > 7) {
      base = words.slice(0, 7).join(" ");
    }
  } else if (difficulty === "khó") {
    // khó trên 8 chữ - keep as is, no truncation
    base = words.join(" ");
  }

  // Double check and remove any punctuation that may still exist or be introduced
  base = base.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  return base;
};

interface TeacherPortalProps {
  topics: Topic[];
  onSaveTopics: (newTopics: Topic[]) => void;
  onResetSyllabus: () => void;
  overrides: Record<
    string,
    {
      customImage?: string;
      customAudio?: string;
      audioHotspots?: AudioHotspot[];
    }
  >;
  onSaveOverrides: (
    newOverrides: Record<
      string,
      {
        customImage?: string;
        customAudio?: string;
        audioHotspots?: AudioHotspot[];
      }
    >,
  ) => void;
  onBackToDashboard: () => void;
  showFunFact: boolean;
  onToggleFunFact: (val: boolean) => void;
  onFirebaseBackup?: () => Promise<boolean>;
  onFirebaseRestore?: () => Promise<boolean>;
}

export default function TeacherPortal({
  topics,
  onSaveTopics,
  onResetSyllabus,
  overrides,
  onSaveOverrides,
  onBackToDashboard,
  showFunFact,
  onToggleFunFact,
  onFirebaseBackup,
  onFirebaseRestore,
}: TeacherPortalProps) {
  // Navigation: selected topic to edit
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topics[0]?.id || "",
  );

  // Active Tab state for Teacher Portal
  const [activePortalTab, setActivePortalTab] = useState<
    "sentence" | "spelling" | "math" | "cloud" | "settings" | "jigsaw" | "matching"
  >("sentence");

  // Local state for key updates
  const [editingSyncKey, setEditingSyncKey] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Form states for adding a new lesson
  const [newLessonName, setNewLessonName] = useState<string>("");
  const [newTopicType, setNewTopicType] = useState<
    "sentence" | "spelling" | "math"
  >("sentence");

  // Auto-sync selectedTopicId and newTopicType on tab switch
  useEffect(() => {
    // Reset all form fields to prevent leaking between different tabs
    setNewSentence("");
    setNewSpellingFormula("");
    setScrambledWordsInput("");
    setNewQuestion("");
    setNewFunFact("");
    setNewPhoneticsGuide("");
    setNewCustomImage("");
    setNewCustomAudio("");
    setNewCustomImageName("");
    setNewCustomAudioName("");
    setNewLessonHotspots([]);

    if (activePortalTab === "sentence") {
      const sentenceTopics = topics.filter(
        (t) =>
          !t.isSpelling && t.id !== "danh-van" && !t.isMath && t.id !== "toan",
      );
      setSelectedTopicId(sentenceTopics[0]?.id || "");
      setNewTopicType("sentence");
    } else if (activePortalTab === "spelling") {
      const spellingTopics = topics.filter(
        (t) => t.isSpelling || t.id === "danh-van",
      );
      setSelectedTopicId(spellingTopics[0]?.id || "");
      setNewTopicType("spelling");
    } else if (activePortalTab === "math") {
      const mathTopics = topics.filter((t) => t.isMath || t.id === "toan");
      setSelectedTopicId(mathTopics[0]?.id || "");
      setNewTopicType("math");
    } else {
      setSelectedTopicId("");
    }
  }, [activePortalTab]);

  // Edit active topic name/emoji state
  const [topicNameInput, setTopicNameInput] = useState<string>("");
  const [topicEmojiInput, setTopicEmojiInput] = useState<string>("");

  // Auto-sync newLessonName on selectedTopicId shift
  useEffect(() => {
    const activeTopic = topics.find((t) => t.id === selectedTopicId);
    if (activeTopic) {
      if (activePortalTab === "sentence" || activePortalTab === "math") {
        setNewLessonName(`Lesson ${activeTopic.items.length + 1}`);
      } else if (activePortalTab === "spelling") {
        setNewLessonName("");
      }
    } else {
      setNewLessonName("");
    }
  }, [selectedTopicId, activePortalTab, topics]);

  // Create new topic states
  const [isCreatingTopic, setIsCreatingTopic] = useState<boolean>(false);
  const [isCreatingSpelling, setIsCreatingSpelling] = useState<boolean>(false);
  const [isCreatingMathTopic, setIsCreatingMathTopic] =
    useState<boolean>(false);
  const [newTopicName, setNewTopicName] = useState<string>("");
  const [newTopicEmoji, setNewTopicEmoji] = useState<string>("⭐");
  const [newTopicDescription, setNewTopicDescription] = useState<string>("");

  // Jigsaw Management State
  const [customPuzzles, setCustomPuzzles] = useState<any[]>([]);
  const [hiddenPuzzles, setHiddenPuzzles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customCols, setCustomCols] = useState<number>(3);
  const [customRows, setCustomRows] = useState<number>(3);

  // Matching Game Management State
  const [matchingGames, setMatchingGames] = useState<any[]>([]);
  const [editingMatchingGame, setEditingMatchingGame] = useState<any | null>(null);
  const [newMatchingGameName, setNewMatchingGameName] = useState<string>("Bài nối hình 1");
  const [newMatchingPairs, setNewMatchingPairs] = useState<any[]>([{ id: 'pair-1', imageUrl: '', text: '', audioUrl: '' }]);
  const matchingFileInputRef = useRef<HTMLInputElement>(null);
  const matchingAudioFileInputRef = useRef<HTMLInputElement>(null);
  const [activeMatchingPairId, setActiveMatchingPairId] = useState<string>('');
  const [activeMatchingAudioPairId, setActiveMatchingAudioPairId] = useState<string>('');

  // Load puzzles and matching games on mount
  useEffect(() => {
    const saved = localStorage.getItem("be_hoc_tieng_viet_custom_puzzles");
    const savedHidden = localStorage.getItem(
      "be_hoc_tieng_viet_hidden_puzzles",
    );
    const savedMatching = localStorage.getItem("be_hoc_tieng_viet_matching_games");
    if (saved) {
      try {
        setCustomPuzzles(JSON.parse(saved));
      } catch (e) {}
    }
    if (savedHidden) {
      try {
        setHiddenPuzzles(JSON.parse(savedHidden));
      } catch (e) {}
    }
    if (savedMatching) {
      try {
        setMatchingGames(JSON.parse(savedMatching));
      } catch (e) {}
    }
  }, []);

  const saveMatchingGames = (games: any[]) => {
    try {
      localStorage.setItem("be_hoc_tieng_viet_matching_games", JSON.stringify(games));
      setMatchingGames(games);
    } catch (e) {
      console.error(e);
      alert("Bộ nhớ đã đầy, không thể lưu thêm trò chơi nối hình. Vui lòng xóa bớt.");
    }
  };

  const saveCustomPuzzles = (puzzles: any[]) => {
    try {
      localStorage.setItem(
        "be_hoc_tieng_viet_custom_puzzles",
        JSON.stringify(puzzles),
      );
      setCustomPuzzles(puzzles);
    } catch (e) {
      console.error(e);
      alert("Bộ nhớ đã đầy, không thể lưu thêm ảnh. Vui lòng xóa bớt ảnh cũ.");
    }
  };

  const saveHiddenPuzzles = (puzzles: string[]) => {
    try {
      localStorage.setItem(
        "be_hoc_tieng_viet_hidden_puzzles",
        JSON.stringify(puzzles),
      );
      setHiddenPuzzles(puzzles);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
          
          const newPuzzle = {
            id: `custom-${Date.now()}`,
            name: file.name.substring(0, 20) + "...",
            imageUrl: compressedBase64,
            cols: customCols,
            rows: customRows,
            isCustom: true,
          };
          saveCustomPuzzles([...customPuzzles, newPuzzle]);
          playSoundEffect("success");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMatchingImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
          
          setNewMatchingPairs(prev => prev.map(p => p.id === activeMatchingPairId ? { ...p, imageUrl: compressedBase64 } : p));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (matchingFileInputRef.current) matchingFileInputRef.current.value = "";
  };

  const handleMatchingAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const audioDataUrl = event.target?.result as string;
      setNewMatchingPairs(prev => prev.map(p => p.id === activeMatchingAudioPairId ? { ...p, audioUrl: audioDataUrl } : p));
    };
    reader.readAsDataURL(file);
    if (matchingAudioFileInputRef.current) matchingAudioFileInputRef.current.value = "";
  };

  const handleSaveMatchingGame = () => {
    if (!newMatchingGameName.trim()) {
      alert("Vui lòng nhập tên bài nối hình!");
      return;
    }
    const validPairs = newMatchingPairs.filter(p => p.imageUrl && p.text.trim());
    if (validPairs.length < 2) {
      alert("Vui lòng nhập ít nhất 2 cặp hình và tên hợp lệ!");
      return;
    }

    if (editingMatchingGame) {
      const updatedGames = matchingGames.map(g => g.id === editingMatchingGame.id ? {
        ...g,
        name: newMatchingGameName,
        pairs: validPairs
      } : g);
      saveMatchingGames(updatedGames);
      setEditingMatchingGame(null);
    } else {
      const newGame = {
        id: `matching-${Date.now()}`,
        name: newMatchingGameName,
        pairs: validPairs
      };
      saveMatchingGames([...matchingGames, newGame]);
    }
    
    setNewMatchingGameName("Bài nối hình " + (matchingGames.length + 2));
    setNewMatchingPairs([{ id: `pair-${Date.now()}-1`, imageUrl: '', text: '', audioUrl: '' }]);
    playSoundEffect("success");
  };

  const handleDeleteMatchingGame = (id: string) => {
    if (window.confirm("Thầy cô/Ba mẹ có chắc muốn xóa bài nối hình này không?")) {
      saveMatchingGames(matchingGames.filter(g => g.id !== id));
      playSoundEffect("wrong");
    }
  };

  const handleDeleteCustomPuzzle = (id: string) => {
    if (
      window.confirm("Thầy cô/Ba mẹ có muốn xóa ảnh ghép tùy chỉnh này không?")
    ) {
      const updated = customPuzzles.filter((p) => p.id !== id);
      saveCustomPuzzles(updated);
      playSoundEffect("wrong");
    }
  };

  const toggleHiddenPuzzle = (id: string) => {
    if (hiddenPuzzles.includes(id)) {
      saveHiddenPuzzles(hiddenPuzzles.filter((pid) => pid !== id));
      playSoundEffect("pop");
    } else {
      if (
        window.confirm(
          "Thầy cô/Ba mẹ có muốn ẩn trò chơi ghép hình này khỏi danh sách của bé không?",
        )
      ) {
        saveHiddenPuzzles([...hiddenPuzzles, id]);
        playSoundEffect("wrong");
      }
    }
  };

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = listenToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const active = topics.find((t) => t.id === selectedTopicId);
    if (active) {
      setTopicNameInput(active.name);
      setTopicEmojiInput(active.emoji);
    }
  }, [selectedTopicId, topics]);

  const handleMathImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      playSoundEffect("click");
      const compressedBase64 = await compressImage(file);
      setNewMathImageRaw(compressedBase64);
      const rawName = file.name.split(".")[0] || "";
      const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      setNewMathImageName(cleanName);
    } catch (err) {
      console.error("Math image file upload failed", err);
    }
  };

  const handleSaveMathImage = () => {
    if (!newMathImageRaw) return;
    const nameToUse = newMathImageName.trim() || "Hình vẽ mới";
    const newItem: MathLibraryItem = {
      id: `custom-math-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: nameToUse,
      image: newMathImageRaw,
      isPreset: false,
    };
    const updated = [...mathIllustrations, newItem];
    setMathIllustrations(updated);
    saveMathIllustrations(updated);

    // Clear form
    setNewMathImageRaw("");
    setNewMathImageName("");
    playSoundEffect("success");
  };

  const handleDeleteMathImage = (idToDelete: string) => {
    const updated = mathIllustrations.filter((item) => item.id !== idToDelete);
    setMathIllustrations(updated);
    saveMathIllustrations(updated);
    playSoundEffect("wrong");
  };

  const handleResetMathIllustrations = () => {
    localStorage.removeItem("be_hoc_tieng_viet_math_library");
    const presets = getMathIllustrations();
    setMathIllustrations(presets);
    saveMathIllustrations(presets);
    playSoundEffect("success");
  };

  const handleCustomSoundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    role: "clapping" | "wrong" | "victory",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert(
        "⚠️ File âm thanh quá lớn! Ba mẹ thầy cô vui lòng chọn file ngắn dưới 1MB để tránh đầy bộ nhớ nha!",
      );
      return;
    }

    try {
      playSoundEffect("success");
      const base64 = await fileToBase64(file);
      const updated = {
        ...customSounds,
        [role]: base64,
      };
      setCustomSounds(updated);
      saveCustomSounds(updated);
      alert("🎉 Đã lưu âm thanh tự chọn thành công!");
    } catch (err) {
      console.error("Custom sound upload failed", err);
      alert(
        "❌ Có lỗi xảy ra khi tải âm thanh lên, ba mẹ vui lòng thử file khác nha!",
      );
    }
  };

  const handleClearCustomSound = (role: "clapping" | "wrong" | "victory") => {
    playSoundEffect("wrong");
    const updated = { ...customSounds };
    delete updated[role];
    setCustomSounds(updated);
    saveCustomSounds(updated);
  };

  const handleTestPlaySound = (role: "clapping" | "wrong" | "victory") => {
    try {
      if (customSounds[role]) {
        const audio = new Audio(customSounds[role]);
        audio.play().catch((e) => {
          console.warn(
            "Custom sound playback aborted, trying synth fallback",
            e,
          );
          triggerDefaultPlay(role);
        });
      } else {
        triggerDefaultPlay(role);
      }
    } catch (err) {
      console.error("Test play sound error:", err);
    }
  };

  const triggerDefaultPlay = (role: "clapping" | "wrong" | "victory") => {
    // Professional Web Audio synth generator fallback identical to child tutoring games
    try {
      const context = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      if (role === "clapping") {
        for (let i = 0; i < 6; i++) {
          const delay = i * 0.08 + Math.random() * 0.03;
          const osc = context.createOscillator();
          const gainNode = context.createGain();
          osc.connect(gainNode);
          gainNode.connect(context.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(
            320 + Math.random() * 280,
            context.currentTime + delay,
          );
          gainNode.gain.setValueAtTime(0, context.currentTime + delay);
          gainNode.gain.linearRampToValueAtTime(
            0.2,
            context.currentTime + delay + 0.01,
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            context.currentTime + delay + 0.05,
          );
          osc.start(context.currentTime + delay);
          osc.stop(context.currentTime + delay + 0.06);
        }
      } else if (role === "wrong") {
        const osc = context.createOscillator();
        const gainNode = context.createGain();
        osc.connect(gainNode);
        gainNode.connect(context.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(135, context.currentTime);
        osc.frequency.linearRampToValueAtTime(95, context.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.35, context.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          context.currentTime + 0.4,
        );
        osc.start();
        osc.stop(context.currentTime + 0.4);
      } else if (role === "victory") {
        const playD = (freq: number, delay: number, dur: number) => {
          const osc = context.createOscillator();
          const gainNode = context.createGain();
          osc.connect(gainNode);
          gainNode.connect(context.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, context.currentTime + delay);
          gainNode.gain.setValueAtTime(0, context.currentTime + delay);
          gainNode.gain.linearRampToValueAtTime(
            0.18,
            context.currentTime + delay + 0.02,
          );
          gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + delay + dur,
          );
          osc.start(context.currentTime + delay);
          osc.stop(context.currentTime + delay + dur);
        };
        playD(392, 0, 0.3);
        playD(523, 0.1, 0.3);
        playD(659, 0.2, 0.3);
        playD(783, 0.3, 0.3);
        playD(1046, 0.4, 0.6);
      }
    } catch (_) {}
  };

  const handleRenameTopic = () => {
    if (!selectedTopicId) return;
    if (!topicNameInput.trim()) {
      alert("Tên chủ đề không được để trống nha ba mẹ/thầy cô!");
      return;
    }
    playSoundEffect("success");
    const updatedTopics = topics.map((topic) => {
      if (topic.id === selectedTopicId) {
        return {
          ...topic,
          name: topicNameInput.trim(),
          emoji: topicEmojiInput.trim() || topic.emoji,
        };
      }
      return topic;
    });
    onSaveTopics(updatedTopics);
    alert("🎉 Đã cập nhật thông tin chủ đề thành công!");
  };

  const handleCreateNewTopic = () => {
    if (!newTopicName.trim()) {
      alert("Tên chủ đề/bài mới không được để trống nha ba mẹ/thầy cô!");
      return;
    }
    const slug =
      (newTopicType === "math"
        ? "toan-"
        : newTopicType === "spelling"
          ? "danh-van-"
          : "chu-de-") + Date.now();

    let icon = "Sparkles";
    let color = "from-indigo-400 to-purple-500";
    let borderColor = "border-indigo-200";
    let description =
      newTopicDescription.trim() || "Chủ đề ghép câu mới lập cho bé";

    if (newTopicType === "spelling") {
      icon = "PenTool";
      color = "from-amber-400 to-orange-500";
      borderColor = "border-orange-200";
      description =
        newTopicDescription.trim() || "Chủ đề đánh vần mới lập cho bé";
    } else if (newTopicType === "math") {
      icon = "Calculator";
      color = "from-emerald-400 to-teal-500";
      borderColor = "border-teal-200";
      description =
        newTopicDescription.trim() ||
        "Chủ đề hình thành tư duy toán học cho bé";
    }

    const newTopic: Topic = {
      id: slug,
      name: newTopicName.trim(),
      emoji: newTopicEmoji.trim() || "⭐",
      icon: icon,
      color: color,
      borderColor: borderColor,
      description: description,
      items: [],
      isSpelling: newTopicType === "spelling",
      isMath: newTopicType === "math",
    };

    onSaveTopics([...topics, newTopic]);
    setSelectedTopicId(newTopic.id);

    // reset form
    setNewTopicName("");
    setNewTopicEmoji("⭐");
    setNewTopicType("sentence");
    setNewTopicDescription("");
    setIsCreatingTopic(false);
    setIsCreatingSpelling(false);
    setIsCreatingMathTopic(false);
    playSoundEffect("success");
    alert(
      "🎉 Đã tạo chủ đề mới thành công! Bây giờ ba mẹ hãy thêm các bài học vào chủ đề này bên dưới nha.",
    );
  };

  const handleDeleteTopic = () => {
    if (!selectedTopicId) return;
    const topicToDelete = topics.find((t) => t.id === selectedTopicId);
    if (!topicToDelete) return;

    if (
      window.confirm(
        `⚠️ CHÚ Ý: Cực kỳ cẩn thận nha ba mẹ! Có thực sự muốn XÓA hoàn toàn chủ đề "${topicToDelete.name}" cùng tất cả các bài học trong đó không?`,
      )
    ) {
      playSoundEffect("pop");
      const updatedTopics = topics.filter((t) => t.id !== selectedTopicId);
      onSaveTopics(updatedTopics);
      if (updatedTopics.length > 0) {
        setSelectedTopicId(updatedTopics[0].id);
      } else {
        setSelectedTopicId("");
      }
      alert("Đã xóa chủ đề thành công!");
    }
  };

  // Form states for adding a new lesson
  const [newSentence, setNewSentence] = useState<string>("");
  const [newSpellingFormula, setNewSpellingFormula] = useState<string>("");
  const [newMathOp, setNewMathOp] = useState<"+" | "-" | "*" | "/">("+");
  const [newQuestion, setNewQuestion] = useState<string>("");
  const [newDifficulty, setNewDifficulty] = useState<
    "dễ" | "trung bình" | "khó"
  >("dễ");
  const [scrambledWordsInput, setScrambledWordsInput] = useState<string>("");
  const [newEmoji, setNewEmoji] = useState<string>("🎒");
  const [newFunFact, setNewFunFact] = useState<string>("");
  const [newPhoneticsGuide, setNewPhoneticsGuide] = useState<string>("");
  const [newCustomImage, setNewCustomImage] = useState<string>("");
  const [newCustomAudio, setNewCustomAudio] = useState<string>("");
  const [newCustomImageName, setNewCustomImageName] = useState<string>("");
  const [newCustomAudioName, setNewCustomAudioName] = useState<string>("");
  const [creationAudPlayback, setCreationAudPlayback] =
    useState<boolean>(false);
  const [selectedMathIllustrationId, setSelectedMathIllustrationId] =
    useState<string>("preset-chick");

  // Local track of editing state for each item in the selected topic
  const [localOverrides, setLocalOverrides] = useState<
    Record<
      string,
      {
        customImage?: string;
        customAudio?: string;
        audioHotspots?: AudioHotspot[];
      }
    >
  >({});

  // Hotspots creation/edition state
  const [newLessonHotspots, setNewLessonHotspots] = useState<AudioHotspot[]>(
    [],
  );
  const [selectedNewHotspotId, setSelectedNewHotspotId] = useState<
    string | null
  >(null);
  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(
    null,
  );

  // Existing lesson hotspot administration
  const [editingHotspotsItemId, setEditingHotspotsItemId] = useState<
    string | null
  >(null);
  const [selectedExistingHotspotId, setSelectedExistingHotspotId] = useState<
    string | null
  >(null);
  const [activeHpPlaybackId, setActiveHpPlaybackId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setLocalOverrides({ ...overrides });
  }, [overrides]);

  // Audio testing states
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [testAudioObj, setTestAudioObj] = useState<HTMLAudioElement | null>(
    null,
  );

  // Recording voice state
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);
  const [recDuration, setRecDuration] = useState<number>(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recIntervalRef = useRef<any>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Drag-and-drop flags
  const [dragOverInputId, setDragOverInputId] = useState<string | null>(null);

  // Math illustration library states
  const [mathIllustrations, setMathIllustrations] = useState<MathLibraryItem[]>(
    [],
  );
  const [newMathImageRaw, setNewMathImageRaw] = useState<string>("");
  const [newMathImageName, setNewMathImageName] = useState<string>("");

  const [customSounds, setCustomSounds] = useState<CustomSounds>({});

  useEffect(() => {
    setCustomSounds(getCustomSounds());
    const handleSyncSounds = () => {
      setCustomSounds(getCustomSounds());
    };
    window.addEventListener("custom-sounds-updated", handleSyncSounds);
    return () => {
      window.removeEventListener("custom-sounds-updated", handleSyncSounds);
    };
  }, []);

  useEffect(() => {
    const list = getMathIllustrations();
    setMathIllustrations(list);
    if (list.length > 0) {
      setSelectedMathIllustrationId(list[0].id);
    }

    const handleSync = () => {
      const refreshed = getMathIllustrations();
      setMathIllustrations(refreshed);
      if (refreshed.length > 0) {
        setSelectedMathIllustrationId((prev) =>
          refreshed.some((i) => i.id === prev) ? prev : refreshed[0].id,
        );
      }
    };
    window.addEventListener("math-library-updated", handleSync);
    return () => {
      window.removeEventListener("math-library-updated", handleSync);
    };
  }, []);

  useEffect(() => {
    return () => {
      // Clean up audio playback & recorders on unmount
      if (testAudioObj) {
        testAudioObj.pause();
      }
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
      }
      if (recIntervalRef.current) {
        clearInterval(recIntervalRef.current);
      }
    };
  }, [testAudioObj, micStream]);

  const activeTopic = topics.find((t) => t.id === selectedTopicId);
  const isSpellingTopic = activeTopic
    ? !!(activeTopic.isSpelling || activeTopic.id === "danh-van")
    : false;

  // Helper: File to Base64 convertor
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  };

  // Image upload processor
  const handleUploadImage = async (itemId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert(
        "Ấy gụ! Vui lòng chọn tệp hình ảnh (.png, .jpg, .jpeg, .webp, .gif) nha ba mẹ!",
      );
      return;
    }

    try {
      playSoundEffect("click");
      const compressedStr = await compressImage(file, 300, 300);
      const updated = {
        ...localOverrides,
        [itemId]: {
          ...localOverrides[itemId],
          customImage: compressedStr,
        },
      };
      setLocalOverrides(updated);
      onSaveOverrides(updated);
      playSoundEffect("success");
    } catch (e) {
      console.error("Base64 converting and compressing image failed", e);
    }
  };

  // Audio file upload processor
  const handleUploadAudio = async (itemId: string, file: File) => {
    if (!file.type.startsWith("audio/")) {
      alert("Vui lòng tải tệp âm thanh hợp lệ (.mp3, .wav, .m4a, .webm)!");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert(
        "Tệp âm thanh quá lớn! Ba mẹ hãy chọn hoặc ghi âm đoạn ngắn dưới 2 MB.",
      );
      return;
    }

    try {
      const base64Str = await fileToBase64(file);
      const updated = {
        ...localOverrides,
        [itemId]: {
          ...localOverrides[itemId],
          customAudio: base64Str,
        },
      };
      setLocalOverrides(updated);
      onSaveOverrides(updated);
      playSoundEffect("success");
    } catch (e) {
      console.error("Base64 converting audio failed", e);
    }
  };

  // Mic recording starter
  const startRecording = async (itemId: string) => {
    playSoundEffect("click");
    setRecordedChunks([]);
    setRecDuration(0);
    setRecordingItemId(itemId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      let options: MediaRecorderOptions = {
        mimeType: "audio/webm",
        audioBitsPerSecond: 16000,
      };
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/mp4", audioBitsPerSecond: 16000 };
        if (!MediaRecorder.isTypeSupported("audio/mp4")) {
          options = { mimeType: "", audioBitsPerSecond: 16000 }; // fallback to default browser format
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      let tempChunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          tempChunks.push(event.data);
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(tempChunks, {
          type: options.mimeType || "audio/webm",
        });
        try {
          const base64Str = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
          });

          const updated = {
            ...localOverrides,
            [itemId]: {
              ...localOverrides[itemId],
              customAudio: base64Str,
            },
          };
          setLocalOverrides(updated);
          onSaveOverrides(updated);
          playSoundEffect("victory");
        } catch (e) {
          console.error("Failed recording base64 conversion", e);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);

      recIntervalRef.current = setInterval(() => {
        setRecDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Access microphone blocked", err);
      alert(
        "Hệ thống chưa được cấp quyền micro. Ba mẹ hoặc Thầy cô vui lòng nhấn 'Cho phép' (Allow) dùng micro trên dòng trình duyệt nhé!",
      );
      setRecordingItemId(null);
    }
  };

  // Mic recording stopper
  const stopRecording = () => {
    if (!recordingItemId || !mediaRecorderRef.current) return;
    clearInterval(recIntervalRef.current);
    mediaRecorderRef.current.stop();
    setRecordingItemId(null);
    playSoundEffect("pop");
  };

  // Custom audio preview listening
  const playCustomAudio = (itemId: string, audioDataUrl: string) => {
    if (activePlaybackId === itemId && testAudioObj) {
      testAudioObj.pause();
      setActivePlaybackId(null);
      return;
    }

    playSoundEffect("click");
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

    audio.play().catch((err) => {
      console.error(err);
      setActivePlaybackId(null);
    });
  };

  // Remove overrides for a specific item
  const handleRemoveImageOverride = (itemId: string) => {
    playSoundEffect("pop");
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
    playSoundEffect("pop");
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
    if (
      window.confirm(
        "Thầy cô/Ba mẹ có chắc muốn xóa TẤT CẢ các bài học tự thêm/xóa và các tệp hình ảnh, tọng mẫu tự ghi âm không? Giáo án sẽ khôi phục về trạng thái mặc định ban đầu.",
      )
    ) {
      playSoundEffect("pop");
      onResetSyllabus();
      alert("Đã hoàn tác toàn bộ giáo trình gốc thành công!");
    }
  };

  const handleAddNewLessonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId) return;

    const isSpellingTopic = !!(
      activeTopic &&
      (activeTopic.isSpelling || activeTopic.id === "danh-van")
    );
    const isMathTopic = !!(
      activeTopic &&
      (activeTopic.isMath || activeTopic.id === "toan")
    );

    if (isSpellingTopic && !newSpellingFormula.trim()) {
      alert("Vui lòng nhập công thức ghép từ!");
      return;
    }

    if (!isSpellingTopic && !isMathTopic && !newSentence.trim()) {
      alert("Vui lòng nhập nội dung bài học!");
      return;
    }

    if (isMathTopic) {
      // Generate 5 random math operations based on newDifficulty (dễ = 10, trung bình = 50, khó = 100)
      const maxVal =
        newDifficulty === "dễ" ? 10 : newDifficulty === "trung bình" ? 50 : 100;
      const mathOperations: any[] = [];
      const seenExpressions = new Set<string>();
      let attempts = 0;

      while (mathOperations.length < 5 && attempts < 1000) {
        attempts++;
        let a = 0,
          b = 0,
          answer = 0;
        if (newMathOp === "+") {
          // Exclude 0: a and b must be >= 1, and a + b <= maxVal
          const adjustedMax = Math.max(2, maxVal);
          a = Math.floor(Math.random() * (adjustedMax - 1)) + 1;
          b = Math.floor(Math.random() * (adjustedMax - a)) + 1;
          answer = a + b;
        } else if (newMathOp === "-") {
          // Exclude 0: a >= 2, b >= 1, a > b, so answer (a - b) >= 1
          const adjustedMax = Math.max(2, maxVal);
          a = Math.floor(Math.random() * (adjustedMax - 1)) + 2;
          b = Math.floor(Math.random() * (a - 1)) + 1;
          answer = a - b;
        } else if (newMathOp === "*") {
          // Exclude 0: a and b >= 1
          const limit = maxVal === 10 ? 5 : maxVal === 50 ? 10 : 20;
          const adjustedLimit = Math.max(2, limit);
          a = Math.floor(Math.random() * (adjustedLimit - 1)) + 1;
          b = Math.floor(Math.random() * (adjustedLimit - 1)) + 1;
          answer = a * b;
        } else {
          // Exclude 0: divisor >= 1, answer >= 1
          b = Math.floor(Math.random() * 9) + 1; // 1 to 9
          const limit = maxVal === 10 ? 5 : maxVal === 50 ? 10 : 20;
          const adjustedLimit = Math.max(2, limit);
          answer = Math.floor(Math.random() * (adjustedLimit - 1)) + 1;
          a = b * answer;
        }

        const expr = `${a} ${newMathOp} ${b}`;
        if (seenExpressions.has(expr)) {
          continue; // skip duplicate expression
        }
        seenExpressions.add(expr);

        // generate options (4 options total for balanced 2x2 or 4-col grid layout)
        let options = [answer];
        while (options.length < 4) {
          const offset = Math.floor(Math.random() * 15) - 7;
          const fake = Math.max(1, answer + (offset === 0 ? 3 : offset));
          if (!options.includes(fake)) options.push(fake);
        }
        options.sort(() => Math.random() - 0.5);

        mathOperations.push({
          id: `op-${Date.now()}-${mathOperations.length}`,
          expression: expr,
          correctAnswer: answer,
          options,
        });
      }

      const chosenIllustration = mathIllustrations.find(
        (ill) => ill.id === selectedMathIllustrationId,
      );
      const finalMathName =
        newLessonName.trim() || `Lesson ${activeTopic.items.length + 1}`;
      const finalMathSentence = `${finalMathName}: Rèn phép ${newMathOp === "+" ? "cộng" : newMathOp === "-" ? "trừ" : newMathOp === "*" ? "nhân" : "chia"} (${newDifficulty})`;

      const newItem: LessonItem = {
        id: `custom-lesson-${Date.now()}`,
        sentence: finalMathSentence,
        lessonName: finalMathName,
        type: "math",
        topic: selectedTopicId,
        scrambledWords: [],
        difficulty: newDifficulty,
        emoji: "🔢",
        customImage: chosenIllustration?.image || undefined,
        mathOperations,
      };

      const updatedTopics = topics.map((topic) => {
        if (topic.id === selectedTopicId) {
          return {
            ...topic,
            items: [...topic.items, newItem],
          };
        }
        return topic;
      });

      onSaveTopics(updatedTopics);
      setNewSentence("");
      setNewQuestion("");
      playSoundEffect("success");
      alert("🎉 Đã tạo bài học toán chứa 5 phép tính trực quan thành công!");
      return;
    }

    let finalWords: string[] = [];
    if (isSpellingTopic) {
      // Split by whitespace to yield B, +, a, =, Ba pieces
      finalWords = newSpellingFormula.trim().split(/\s+/).filter(Boolean);
    } else {
      if (!scrambledWordsInput.trim()) {
        alert("Vui lòng nhập các mảnh từ ghép!");
        return;
      }
      finalWords = scrambledWordsInput
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
    }

    if (finalWords.length === 0) {
      if (isSpellingTopic) {
        alert("Vui lòng nhập công thức ghép vần!");
      } else {
        alert(
          "Vui lòng phân nhỏ các mảnh từ ghép cách nhau bằng dấu phẩy (Ví dụ: mẹ, yêu, bé lắm)!",
        );
      }
      return;
    }

    let sentenceToSave = isSpellingTopic
      ? newSpellingFormula.trim()
      : newSentence.trim();
    let wordsToSave = finalWords;

    if (!isSpellingTopic && !isMathTopic) {
      // Strip any punctuation from the sentence
      sentenceToSave = sentenceToSave
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      // Strip punctuation from individual scrambled words
      wordsToSave = wordsToSave
        .map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim())
        .filter(Boolean);
    }

    const computedQuestion = isSpellingTopic
      ? newQuestion.trim() ||
        `Bé hãy ráp chữ ghép vần để có từ: ${newSpellingFormula.split("=").pop()?.trim() || newSpellingFormula.trim()}`
      : newQuestion.trim() || undefined;

    const newItem: LessonItem = {
      id: `custom-lesson-${Date.now()}`,
      sentence: sentenceToSave,
      lessonName:
        newLessonName.trim() || `Lesson ${activeTopic.items.length + 1}`,
      question: computedQuestion,
      type: "sentence",
      topic: selectedTopicId,
      scrambledWords: wordsToSave,
      difficulty: isSpellingTopic ? "dễ" : newDifficulty,
      emoji: newEmoji.trim(),
      guideVoiceText: sentenceToSave,
      funFact: newFunFact.trim() || undefined,
      phoneticsGuide: newPhoneticsGuide.trim() || undefined,
      customImage: newCustomImage || undefined,
      customAudio: newCustomAudio || undefined,
      audioHotspots:
        newLessonHotspots.length > 0 ? newLessonHotspots : undefined,
    };

    // Update custom topics
    const updatedTopics = topics.map((topic) => {
      if (topic.id === selectedTopicId) {
        return {
          ...topic,
          items: [...topic.items, newItem],
        };
      }
      return topic;
    });

    onSaveTopics(updatedTopics);

    // If custom media was loaded during creation, save it as overrides too
    if (newCustomImage || newCustomAudio || newLessonHotspots.length > 0) {
      const updatedOver = {
        ...localOverrides,
        [newItem.id]: {
          customImage: newCustomImage || undefined,
          customAudio: newCustomAudio || undefined,
          audioHotspots:
            newLessonHotspots.length > 0 ? newLessonHotspots : undefined,
        },
      };
      setLocalOverrides(updatedOver);
      onSaveOverrides(updatedOver);
    }

    // Clear form
    setNewSentence("");
    setNewSpellingFormula("");
    setNewQuestion("");
    setNewDifficulty("dễ");
    setScrambledWordsInput("");
    setNewEmoji("🎒");
    setNewFunFact("");
    setNewPhoneticsGuide("");
    setNewCustomImage("");
    setNewCustomAudio("");
    setNewCustomImageName("");
    setNewCustomAudioName("");
    setNewLessonHotspots([]);
    setSelectedNewHotspotId(null);
    setNewCustomAudioName("");

    playSoundEffect("success");
    alert("🎉 Đã thêm bài học mới thành công!");
  };

  const handleDeleteLessonItem = (itemId: string) => {
    if (!selectedTopicId) return;
    const targetItem = activeTopic?.items.find((i) => i.id === itemId);
    if (!targetItem) return;

    if (
      window.confirm(
        `Thầy cô/Ba mẹ có muốn XÓA bài học "${targetItem.sentence}" khỏi chủ đề này không?`,
      )
    ) {
      playSoundEffect("pop");

      // Update custom topics list
      const updatedTopics = topics.map((topic) => {
        if (topic.id === selectedTopicId) {
          return {
            ...topic,
            items: topic.items.filter((item) => item.id !== itemId),
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
    <div
      className="w-full max-w-4xl mx-auto px-4 py-2"
      id="teacher-portal-container"
    >
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
              tự soạn tệp hình ảnh thực tế & thu âm giọng mẫu địa phương của gia
              đình
            </p>
          </div>
        </div>

        {/* Tip memo block */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex items-start gap-3 mb-8">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 font-medium leading-relaxed font-sans">
            <strong>💡 Cách hoạt động:</strong> Khi thầy cô tải lên một bức ảnh
            hoặc thu âm một tệp phát âm tùy chỉnh cho một câu nói, hệ thống sẽ{" "}
            <strong>tự động thay thế</strong> hình emoji cũ bằng hình ảnh thực
            tế, và phát tệp âm thanh nói chuẩn Bắc/Nam do chính Thầy Cô/Ba mẹ
            ghi âm khi bé chơi ghép câu và luyện phát âm. Giúp bé gắn kết hình
            ảnh đời thực và giọng đọc thân ruột nhất!
          </div>
        </div>

        {/* Navigation Tab Ribbon (4 Mục) */}
        <div className="flex flex-wrap p-1.5 bg-slate-100 rounded-[24px] border-2 border-slate-200/60 font-sans gap-1 mb-8 shadow-inner">
          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("sentence");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "sentence"
                ? "bg-indigo-600 text-white shadow-md border-b-2 border-indigo-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="text-sm">💬</span>
            <span className="uppercase">1. Ghép câu</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("spelling");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "spelling"
                ? "bg-orange-600 text-white shadow-md border-b-2 border-orange-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="text-sm">🎒</span>
            <span className="uppercase">2. Ghép từ</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("math");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "math"
                ? "bg-teal-600 text-white shadow-md border-b-2 border-teal-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="text-sm">🧮</span>
            <span className="uppercase">3. Học Toán</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("jigsaw");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "jigsaw"
                ? "bg-pink-600 text-white shadow-md border-b-2 border-pink-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Puzzle className="w-4 h-4" />
            <span className="uppercase">4. Trò chơi ghép hình</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("matching");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "matching"
                ? "bg-purple-600 text-white shadow-md border-b-2 border-purple-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="text-sm">🔗</span>
            <span className="uppercase">5. Nối hình</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("cloud");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "cloud"
                ? "bg-amber-500 text-white shadow-md border-b-2 border-amber-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Database className="w-4 h-4" />
            <span className="uppercase">6. Sao lưu & Khôi phục</span>
          </button>

          <button
            onClick={() => {
              playSoundEffect("click");
              setActivePortalTab("settings");
              setIsCreatingTopic(false);
              setIsCreatingSpelling(false);
              setIsCreatingMathTopic(false);
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer outline-none ${
              activePortalTab === "settings"
                ? "bg-amber-600 text-white shadow-md border-b-2 border-amber-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="uppercase">7. Thiết lập</span>
          </button>
        </div>

        {/* Topic Navigator Tabstrip */}
        {activePortalTab !== "cloud" &&
          activePortalTab !== "settings" &&
          activePortalTab !== "jigsaw" && (
            <div className="mb-8">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 font-sans">
                1. Chọn chủ đề{" "}
                {activePortalTab === "sentence"
                  ? "ghép câu"
                  : activePortalTab === "spelling"
                    ? "ghép từ / đánh vần"
                    : "toán"}{" "}
                cần chỉnh sửa:
              </label>
              <div className="flex flex-wrap gap-2">
                {topics
                  .filter((topic) => {
                    if (activePortalTab === "sentence")
                      return (
                        !topic.isSpelling &&
                        topic.id !== "danh-van" &&
                        !topic.isMath &&
                        topic.id !== "toan"
                      );
                    if (activePortalTab === "spelling")
                      return topic.isSpelling || topic.id === "danh-van";
                    if (activePortalTab === "math")
                      return topic.isMath || topic.id === "toan";
                    return false;
                  })
                  .map((topic) => {
                    const countCustomized = topic.items.filter(
                      (item) =>
                        localOverrides[item.id]?.customImage ||
                        localOverrides[item.id]?.customAudio,
                    ).length;

                    return (
                      <button
                        key={topic.id}
                        onClick={() => {
                          playSoundEffect("click");
                          setSelectedTopicId(topic.id);
                          setIsCreatingTopic(false);
                          setIsCreatingSpelling(false);
                          setIsCreatingMathTopic(false);
                        }}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all border-b-4 cursor-pointer outline-none ${
                          selectedTopicId === topic.id
                            ? activePortalTab === "sentence"
                              ? "bg-indigo-600 text-white border-indigo-800"
                              : activePortalTab === "spelling"
                                ? "bg-orange-600 text-white border-orange-850"
                                : "bg-teal-600 text-white border-teal-850"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800"
                        }`}
                      >
                        {topic.emoji &&
                        (topic.emoji.startsWith("http://") ||
                          topic.emoji.startsWith("https://") ||
                          topic.emoji.startsWith("/") ||
                          topic.emoji.startsWith("data:")) ? (
                          <img
                            src={topic.emoji}
                            className="w-5 h-5 object-contain rounded-sm inline-block shrink-0"
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-base">{topic.emoji}</span>
                        )}
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

              <div className="mt-4 flex flex-wrap gap-3 justify-end">
                {activePortalTab === "sentence" && (
                  <button
                    onClick={() => {
                      playSoundEffect("click");
                      const nextState = !isCreatingTopic;
                      setIsCreatingTopic(nextState);
                      setIsCreatingSpelling(false);
                      setIsCreatingMathTopic(false);
                      setNewTopicType("sentence");
                      setNewTopicEmoji("💬");
                      setActivePortalTab("sentence");
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer outline-none ${
                      isCreatingTopic
                        ? "bg-indigo-600 border-indigo-800 border-b-4 text-white"
                        : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-b-4 border-b-indigo-800"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ TẠO BÀI GHÉP CÂU / CHỦ ĐỀ MỚI</span>
                  </button>
                )}

                {activePortalTab === "spelling" && (
                  <button
                    onClick={() => {
                      playSoundEffect("click");
                      const nextState = !isCreatingSpelling;
                      setIsCreatingSpelling(nextState);
                      setIsCreatingTopic(false);
                      setIsCreatingMathTopic(false);
                      setNewTopicType("spelling");
                      setNewTopicEmoji("🎒");
                      setActivePortalTab("spelling");
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer outline-none ${
                      isCreatingSpelling
                        ? "bg-orange-600 border-orange-850 border-b-4 text-white"
                        : "bg-gradient-to-r from-orange-400 to-orange-550 hover:from-orange-500 hover:to-orange-600 text-white border-b-4 border-b-orange-850"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ TẠO BÀI TẬP ĐÁNH VẦN MỚI</span>
                  </button>
                )}

                {activePortalTab === "math" && (
                  <button
                    onClick={() => {
                      playSoundEffect("click");
                      const nextState = !isCreatingMathTopic;
                      setIsCreatingMathTopic(nextState);
                      setIsCreatingTopic(false);
                      setIsCreatingSpelling(false);
                      setNewTopicType("math");
                      setNewTopicEmoji("🔢");
                      setActivePortalTab("math");
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer outline-none ${
                      isCreatingMathTopic
                        ? "bg-teal-600 border-teal-800 border-b-4 text-white"
                        : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white border-b-4 border-b-teal-850"
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ TẠO BÀI TẬP TOÁN MỚI</span>
                  </button>
                )}
              </div>
            </div>
          )}

        {/* NEW TOPIC CREATION PANE - SENTENCE MATCHING */}
        {isCreatingTopic && (
          <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50/70 to-indigo-100/40 border-2 border-indigo-200 rounded-[28px] space-y-4 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>💬 Tạo Chủ Đề Học Ghép Câu Mới</span>
                </h4>
                <p className="text-[10px] text-indigo-800 font-extrabold mt-0.5 uppercase tracking-wider">
                  Tự tay soạn các chủ đề giao tiếp, thế giới quan để con rèn
                  phản xạ ghép câu đầy đủ!
                </p>
              </div>
              <button
                onClick={() => {
                  playSoundEffect("pop");
                  setIsCreatingTopic(false);
                }}
                className="text-xs font-black text-indigo-800 hover:text-indigo-950 px-2.5 py-1.5 rounded-xl border border-indigo-200 hover:bg-indigo-100/50 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-6">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Tên chủ đề ghép câu mới: *
                </label>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:border-indigo-400 p-2.5 rounded-xl outline-none font-sans"
                  placeholder="Ví dụ: Hoa quả bé thích, Chào hỏi lễ phép..."
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Biểu tượng Emoji hoặc Link Icon:
                </label>
                <input
                  type="text"
                  value={newTopicEmoji}
                  onChange={(e) => setNewTopicEmoji(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-indigo-200 focus:border-indigo-400 p-2.5 rounded-xl outline-none"
                  placeholder="Nhập Emoji hoặc link ảnh biểu tượng..."
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTopicType("sentence");
                    setTimeout(() => {
                      handleCreateNewTopic();
                    }, 50);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl border-b-4 border-b-indigo-800 transition-all flex items-center justify-center gap-1 cursor-pointer outline-none"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>XÁC NHẬN</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW TOPIC CREATION PANE - SPELLING LESSON */}
        {isCreatingSpelling && (
          <div className="mb-8 p-6 bg-gradient-to-r from-orange-50/70 to-orange-100/40 border-2 border-orange-200 rounded-[28px] space-y-4 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-orange-950 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>🎒 Tạo Bài Học Đánh Vần Chữ Cái Mới</span>
                </h4>
                <p className="text-[10px] text-orange-850 font-extrabold mt-0.5 uppercase tracking-wider">
                  Cập nhật các bài học ghép vần (Ví dụ: vần a, ô, e) kết hợp
                  thanh dấu cho bé đọc trơn!
                </p>
              </div>
              <button
                onClick={() => {
                  playSoundEffect("pop");
                  setIsCreatingSpelling(false);
                }}
                className="text-xs font-black text-orange-850 hover:text-orange-950 px-2.5 py-1.5 rounded-xl border border-orange-200 hover:bg-orange-100/50 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-10">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Tên bài học đánh vần mới: *
                </label>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:border-orange-400 p-2.5 rounded-xl outline-none font-sans"
                  placeholder="Ví dụ: Bé ghép vần Bê, Bé rèn âm O..."
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTopicType("spelling");
                    setNewTopicEmoji("🎒");
                    setTimeout(() => {
                      handleCreateNewTopic();
                    }, 50);
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-3 rounded-xl border-b-4 border-b-orange-800 transition-all flex items-center justify-center gap-1 cursor-pointer outline-none"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>XÁC NHẬN</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW TOPIC CREATION PANE - MATH LESSON */}
        {isCreatingMathTopic && (
          <div className="mb-8 p-6 bg-gradient-to-r from-teal-50/70 to-teal-100/40 border-2 border-teal-200 rounded-[28px] space-y-4 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-teal-950 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>🔢 Tạo Bài Tập Toán Mới cho Bé</span>
                </h4>
                <p className="text-[10px] text-teal-850 font-extrabold mt-0.5 uppercase tracking-wider">
                  Tạo các bài toán đơn giản (cộng, trừ, nhân, chia) rèn luyện tư
                  duy cho bé nhé!
                </p>
              </div>
              <button
                onClick={() => {
                  playSoundEffect("pop");
                  setIsCreatingMathTopic(false);
                }}
                className="text-xs font-black text-teal-800 hover:text-teal-950 px-2.5 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-100/50 cursor-pointer"
              >
                Đóng ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-10">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Tên chủ đề bài tập toán mới: *
                </label>
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:border-teal-400 p-2.5 rounded-xl outline-none font-sans"
                  placeholder="Ví dụ: Bé học phép cộng phạm vi 10, Tập làm quen số đếm..."
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTopicType("math");
                    setNewTopicEmoji("🔢");
                    setTimeout(() => {
                      handleCreateNewTopic();
                    }, 50);
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-3 rounded-xl border-b-4 border-b-teal-800 transition-all flex items-center justify-center gap-1 cursor-pointer outline-none"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>XÁC NHẬN</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TRÒ CHƠI GHÉP HÌNH WORKSPACE */}
        {activePortalTab === "jigsaw" && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-[32px] p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-100 pb-5">
                <div>
                  <h3 className="text-lg font-black text-pink-950 uppercase tracking-tight flex items-center gap-2">
                    <Puzzle className="w-5 h-5 text-pink-600 animate-pulse" />
                    <span>QUẢN LÝ TRÒ CHƠI GHÉP HÌNH</span>
                  </h3>
                  <p className="text-xs text-pink-900 font-medium mt-1">
                    Ba mẹ có thể tạo ảnh ghép từ ảnh gia đình, hoặc ẩn/xóa các
                    mức chơi cũ.
                  </p>
                </div>
              </div>

              {/* Add Custom Puzzle */}
              <div className="bg-white border-2 border-pink-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                  <ImagePlus className="w-4 h-4 text-pink-500" />
                  Thêm ảnh ghép tùy chỉnh mới
                </h4>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-black text-slate-600">
                      ĐỘ KHÓ:
                    </span>
                    <div className="flex gap-2">
                      {[3, 4, 5].map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setCustomCols(size);
                            setCustomRows(size);
                          }}
                          className={`w-10 h-10 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                            customCols === size
                              ? "bg-emerald-500 text-white shadow-sm border-b-4 border-emerald-700"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {size}x{size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 w-full sm:w-auto text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 py-3.5 px-6 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 outline-none border-dashed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>+ TẢI ẢNH LÊN</span>
                  </button>
                </div>
              </div>

              {/* List Puzzles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                {[
                  {
                    id: "1",
                    name: "Khởi đầu vui vẻ (3x3)",
                    emoji: "🐥",
                    isCustom: false,
                    imageUrl:
                      "https://images.unsplash.com/photo-1548247661-3d7905940716?auto=format&fit=crop&q=80&w=600&h=600",
                  },
                  {
                    id: "2",
                    name: "Thử thách khéo tay (4x4)",
                    emoji: "🦁",
                    isCustom: false,
                    imageUrl:
                      "https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?auto=format&fit=crop&q=80&w=800&h=800",
                  },
                  {
                    id: "3",
                    name: "Siêu trí tuệ nhí (32 mảnh)",
                    emoji: "🚀",
                    isCustom: false,
                    imageUrl:
                      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800&h=400",
                  },
                  ...customPuzzles.map((p) => ({ ...p, isCustom: true })),
                ].map((lvl) => {
                  const isHidden = hiddenPuzzles.includes(lvl.id);
                  return (
                    <div
                      key={lvl.id}
                      className={`relative group bg-white rounded-2xl p-4 border-2 border-slate-200 flex flex-col items-center justify-center text-center ${isHidden ? "opacity-50 grayscale" : ""}`}
                    >
                      {lvl.isCustom ? (
                        <img
                          src={lvl.imageUrl}
                          alt="Custom Puzzle"
                          className="w-16 h-16 object-cover rounded-lg mb-2 shadow-sm border border-slate-200"
                        />
                      ) : (
                        <span className="text-4xl filter drop-shadow-sm mb-2">
                          {lvl.emoji}
                        </span>
                      )}
                      <span className="block text-xs font-black text-slate-800 leading-tight mb-3">
                        {lvl.name} {lvl.isCustom && `(${lvl.cols}x${lvl.rows})`}
                      </span>

                      <button
                        onClick={() => {
                          if (lvl.isCustom) {
                            handleDeleteCustomPuzzle(lvl.id);
                          } else {
                            toggleHiddenPuzzle(lvl.id);
                          }
                        }}
                        className={`w-full text-[10px] font-black uppercase py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
                          lvl.isCustom
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                            : isHidden
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {lvl.isCustom ? (
                          <>
                            <Trash2 className="w-3 h-3" /> Xóa ảnh
                          </>
                        ) : isHidden ? (
                          <>
                            <Eye className="w-3 h-3" /> Hiện lại
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Ẩn đi
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MATCHING GAME WORKSPACE */}
        {activePortalTab === "matching" && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-[32px] p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100 pb-5">
                <div>
                  <h3 className="text-lg font-black text-purple-950 uppercase tracking-tight flex items-center gap-2">
                    <span className="text-xl">🔗</span>
                    <span>QUẢN LÝ TRÒ CHƠI NỐI HÌNH</span>
                  </h3>
                  <p className="text-xs text-purple-900 font-medium mt-1">
                    Ba mẹ có thể tạo bài nối hình với nhiều cặp hình và từ. Bé sẽ vẽ đường nối để khớp.
                  </p>
                </div>
              </div>

              {/* Add / Edit Matching Game */}
              <div className="bg-white border-2 border-purple-200 rounded-2xl p-6 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 mb-4">
                  {editingMatchingGame ? "Chỉnh sửa trò chơi nối hình" : "Thêm trò chơi nối hình mới"}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2">TÊN BÀI HỌC:</label>
                    <input
                      type="text"
                      value={newMatchingGameName}
                      onChange={e => setNewMatchingGameName(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-500">CÁC CẶP HÌNH & TỪ:</label>
                    {newMatchingPairs.map((pair, index) => (
                      <div key={pair.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 relative">
                        <div className="w-16 h-16 shrink-0 bg-white border-2 border-slate-200 border-dashed rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors"
                             onClick={() => {
                               setActiveMatchingPairId(pair.id);
                               matchingFileInputRef.current?.click();
                             }}>
                          {pair.imageUrl ? (
                            <img src={pair.imageUrl} alt="Pair" className="w-full h-full object-cover" />
                          ) : (
                            <ImagePlus className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Từ tương ứng (VD: Quả Táo)"
                          value={pair.text}
                          onChange={e => setNewMatchingPairs(prev => prev.map(p => p.id === pair.id ? { ...p, text: e.target.value } : p))}
                          className="flex-1 min-w-[150px] border-2 border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none"
                        />
                        <button
                          onClick={() => {
                            setActiveMatchingAudioPairId(pair.id);
                            matchingAudioFileInputRef.current?.click();
                          }}
                          className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border-2 transition-colors ${
                            pair.audioUrl
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                          title="Thêm âm thanh phát âm"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        {newMatchingPairs.length > 1 && (
                          <button
                            onClick={() => setNewMatchingPairs(prev => prev.filter(p => p.id !== pair.id))}
                            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setNewMatchingPairs(prev => [...prev, { id: `pair-${Date.now()}-${prev.length}`, imageUrl: '', text: '', audioUrl: '' }])}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-black text-xs hover:bg-purple-50 transition-colors"
                    >
                      + THÊM CẶP TỪ
                    </button>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={matchingFileInputRef}
                    onChange={handleMatchingImageUpload}
                  />

                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    ref={matchingAudioFileInputRef}
                    onChange={handleMatchingAudioUpload}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveMatchingGame}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-3.5 rounded-xl shadow-md transition-colors"
                    >
                      {editingMatchingGame ? "CẬP NHẬT TRÒ CHƠI" : "LƯU TRÒ CHƠI MỚI"}
                    </button>
                    {editingMatchingGame && (
                      <button
                        onClick={() => {
                          setEditingMatchingGame(null);
                          setNewMatchingGameName("Bài nối hình " + (matchingGames.length + 1));
                          setNewMatchingPairs([{ id: `pair-${Date.now()}-1`, imageUrl: '', text: '', audioUrl: '' }]);
                        }}
                        className="w-32 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-sm py-3.5 rounded-xl transition-colors"
                      >
                        HỦY
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* List Matching Games */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {matchingGames.map((game) => (
                  <div key={game.id} className="bg-white rounded-2xl p-4 border-2 border-slate-200 flex flex-col items-center text-center shadow-sm relative group">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                      <span className="text-2xl">🔗</span>
                    </div>
                    <span className="block text-sm font-black text-slate-800 mb-1">
                      {game.name}
                    </span>
                    <span className="text-xs text-slate-500 mb-4">{game.pairs.length} cặp hình & chữ</span>
                    
                    <div className="flex w-full gap-2 mt-auto">
                      <button
                        onClick={() => {
                          setEditingMatchingGame(game);
                          setNewMatchingGameName(game.name);
                          setNewMatchingPairs(game.pairs);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 text-[10px] font-black uppercase py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center gap-1 transition-colors"
                      >
                        SỬA
                      </button>
                      <button
                        onClick={() => handleDeleteMatchingGame(game.id)}
                        className="flex-1 text-[10px] font-black uppercase py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center gap-1 transition-colors"
                      >
                        XÓA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CLOUD DB SYNCHRONIZATION WORKSPACE */}
        {activePortalTab === "cloud" && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-[32px] p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-5">
                <div>
                  <h3 className="text-lg font-black text-amber-950 uppercase tracking-tight flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>HỆ THỐNG SAO LƯU & PHỤC HỒI DỮ LIỆU</span>
                  </h3>
                  <p className="text-xs text-amber-900 font-medium mt-1">
                    Lưu trữ tất cả giáo án tự soạn, giọng nói ba mẹ ghi âm, hình
                    ảnh con chụp, và học toán của bé trực tiếp thành file dữ
                    liệu của riêng gia đình.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentUser ? "bg-blue-500" : "bg-emerald-500"}`}
                    ></span>
                  </span>
                  <span
                    className={`border text-[10px] font-black px-3 py-1 rounded-full uppercase ${currentUser ? "bg-blue-50 text-blue-800 border-blue-250" : "bg-emerald-50 text-emerald-800 border-emerald-250"}`}
                  >
                    {currentUser
                      ? "Đã kết nối Firebase Cloud"
                      : "Chế độ an toàn ngoại tuyến (Local)"}
                  </span>
                </div>
              </div>

              {/* Firebase Cloud Sync Section */}
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-blue-600" />
                      ĐỒNG BỘ ĐÁM MÂY (FIREBASE)
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Đồng bộ dữ liệu của bé qua lại giữa các thiết bị bằng tài
                      khoản Google.
                    </p>
                  </div>
                  {!currentUser ? (
                    <button
                      onClick={() => signInWithGoogle()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      ĐĂNG NHẬP GOOGLE ĐỂ ĐỒNG BỘ
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-medium text-slate-600">
                        Xin chào,{" "}
                        <span className="font-bold text-slate-800">
                          {currentUser.displayName || currentUser.email}
                        </span>
                      </div>
                      <button
                        onClick={() => logOut()}
                        className="p-2.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Đăng xuất"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {currentUser && (
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <button
                      onClick={async () => {
                        if (!onFirebaseBackup) {
                          alert(
                            "Tính năng chưa được cung cấp từ ứng dụng chính!",
                          );
                          return;
                        }
                        setIsSyncing(true);
                        const success = await onFirebaseBackup();
                        setIsSyncing(false);
                        if (success) {
                          alert(
                            "✅ Đã sao lưu dữ liệu lên đám mây thành công!",
                          );
                        } else {
                          alert(
                            "❌ Có lỗi xảy ra khi sao lưu. Vui lòng thử lại.",
                          );
                        }
                      }}
                      disabled={isSyncing}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-black uppercase outline-none disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 stroke-[2.5]" />
                      {isSyncing
                        ? "ĐANG ĐẨY LÊN..."
                        : "ĐẨY DỮ LIỆU LÊN ĐÁM MÂY"}
                    </button>

                    <button
                      onClick={async () => {
                        if (!onFirebaseRestore) {
                          alert(
                            "Tính năng chưa được cung cấp từ ứng dụng chính!",
                          );
                          return;
                        }
                        const confirmOverwrite = window.confirm(
                          `⚠️ CẢNH BÁO OVERWRITE:\n\nHành động này sẽ tải dữ liệu từ đám mây và GHI ĐÈ toàn bộ giáo án hiện tại trên máy này.\n\nBa mẹ có chắc chắn không?`,
                        );
                        if (confirmOverwrite) {
                          setIsSyncing(true);
                          const success = await onFirebaseRestore();
                          setIsSyncing(false);
                          if (success) {
                            alert(
                              "✅ Đã tải và khôi phục dữ liệu từ đám mây thành công!",
                            );
                          } else {
                            alert(
                              "❌ Có lỗi xảy ra hoặc chưa có dữ liệu nào được lưu trên đám mây!",
                            );
                          }
                        }
                      }}
                      disabled={isSyncing}
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-2 border-emerald-200 py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-black uppercase outline-none disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      {isSyncing
                        ? "ĐANG TẢI VỀ..."
                        : "TẢI DỮ LIỆU TỪ ĐÁM MÂY VỀ MÁY"}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  HOẶC LƯU FILE TRỰC TIẾP (KHÔNG DÙNG MẠNG)
                </div>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Panel: Local backup download */}
                <div className="md:col-span-6 bg-white border border-amber-200/60 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#2C3E50] uppercase tracking-wider">
                      <Download className="w-4 h-4 text-amber-600" />
                      <span>XUẤT GIÁO ÁN & DOWNLOAD VỀ MÁY</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Tải file dạng `.json` chứa tất cả dữ liệu tùy chỉnh hiện
                      tại để cất trữ trong máy tính/điện thoại hoặc chuyển qua
                      máy khác học tiếp nhé!
                    </p>

                    {/* Visual indicators of current data package */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-[11px] text-slate-600 font-medium">
                      <div className="flex justify-between items-center mr-1">
                        <span>📚 Tổng chủ đề hiện có:</span>
                        <span className="font-extrabold text-slate-800">
                          {topics.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mr-1">
                        <span>🎙️ Bài ghi âm phát âm riêng:</span>
                        <span className="font-extrabold text-slate-800">
                          {
                            Object.values(overrides).filter(
                              (o) => o.customAudio,
                            ).length
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center mr-1">
                        <span>🖼️ Ảnh chụp bài học tùy chỉnh:</span>
                        <span className="font-extrabold text-slate-800">
                          {
                            Object.values(overrides).filter(
                              (o) => o.customImage,
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        try {
                          const mathLibrary = getMathIllustrations();
                          const backupObj = {
                            giaoAnTiengVietBackup: true,
                            version: 2,
                            timestamp: new Date().toISOString(),
                            topics,
                            overrides,
                            mathLibrary,
                          };
                          const dataStr = JSON.stringify(backupObj, null, 2);
                          const dataBlob = new Blob([dataStr], {
                            type: "application/json",
                          });
                          const url = URL.createObjectURL(dataBlob);

                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `be_hoc_tieng_viet_backup_${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          playSoundEffect("success");

                          setCopyFeedback(true);
                          setTimeout(() => setCopyFeedback(false), 2000);
                        } catch (err) {
                          alert("Không thể tạo file sao lưu lúc này!");
                        }
                      }}
                      className="w-full bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-200 py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 text-xs font-black uppercase outline-none"
                    >
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        {copyFeedback
                          ? "ĐÃ TẢI XUỐNG THÀNH CÔNG!"
                          : "TẢI FILE SAO LƯU (.JSON)"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right Panel: Upload backup file */}
                <div className="md:col-span-6 bg-white border border-amber-200/60 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#2C3E50] uppercase tracking-wider">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>NHẬP FILE SAO LƯU TỪ MÁY CHỮA/LÀM MỚI</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-3">
                      Chọn tệp sao lưu `.json` đã tải trước đây để hồi phục và
                      ghi đè toàn bộ lộ trình, điểm số cùng ghi âm giọng phát âm
                      tùy chỉnh của em bé.
                    </p>

                    {/* Hidden Native File Input on beautiful dashed-border trigger block */}
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const parsed = JSON.parse(
                                event.target?.result as string,
                              );
                              if (!parsed || !parsed.giaoAnTiengVietBackup) {
                                alert(
                                  "File không hợp lệ! Vui lòng chọn đúng tệp tin JSON được tạo từ ứng dụng.",
                                );
                                return;
                              }

                              const confirmOverwrite = window.confirm(
                                `⚠️ CẢNH BÁO OVERWRITE:\n\nHành động này sẽ xóa và thay đổi toàn bộ nội dung giáo án đang có trên thiết bị để khớp với file sao lưu.\n\nBa mẹ xác nhận Khôi Phục Dữ Liệu?`,
                              );

                              if (confirmOverwrite) {
                                playSoundEffect("success");
                                if (Array.isArray(parsed.topics)) {
                                  onSaveTopics(parsed.topics);
                                }
                                if (
                                  parsed.overrides &&
                                  typeof parsed.overrides === "object"
                                ) {
                                  onSaveOverrides(parsed.overrides);
                                }
                                if (Array.isArray(parsed.mathLibrary)) {
                                  saveMathIllustrations(parsed.mathLibrary);
                                  window.dispatchEvent(
                                    new Event("math-library-updated"),
                                  );
                                }
                                alert(
                                  "🎉 Đã nhập file sao lưu thành công! Dữ liệu mới đã được áp dụng toàn diện trên thiết bị của bé.",
                                );
                              }
                            } catch (err) {
                              alert(
                                "Không thể đọc tệp tin này, định dạng file JSON gặp lỗi!",
                              );
                            }
                          };
                          reader.readAsText(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />

                      <div className="border-2 border-dashed border-slate-200 hover:border-emerald-400 focus:border-emerald-500 bg-slate-50 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer relative z-10">
                        <FileJson className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-[11px] font-extrabold text-slate-700">
                          CHỌN TỆP TIN SAO LƯU (.JSON)
                        </span>
                        <span className="text-[9px] text-slate-400">
                          Click hoặc kéo thả file của ba mẹ vào đây
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium italic">
                    💡 Lưu ý: Tránh tự sửa đổi các ký tự bên trong file JSON để
                    tránh xảy ra lỗi phân tích cú pháp dữ liệu.
                  </div>
                </div>
              </div>

              {/* Tips for parents / teacher */}
              <div className="bg-amber-100/40 border border-amber-200/50 p-4 rounded-2xl text-xs text-amber-900 space-y-2 leading-relaxed">
                <div className="font-bold flex items-center gap-1 text-[13px]">
                  <span>
                    💡 Hướng dẫn ba mẹ cách chuyển giao án cực đơn giản:
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans">
                  <div>
                    <span className="font-extrabold text-amber-950">
                      1. Soạn bài và Xuất File:
                    </span>{" "}
                    Ba mẹ dùng điện thoại để ghi âm phát âm chuẩn, chụp ảnh các
                    đồ chơi con thích, rồi nhấn nút{" "}
                    <span className="font-bold text-amber-900">
                      "Tải file sao lưu"
                    </span>{" "}
                    ở khung bên trái về điện thoại của mình.
                  </div>
                  <div>
                    <span className="font-extrabold text-amber-950">
                      2. Nhập File trên máy em bé:
                    </span>{" "}
                    Gửi file JSON này sang máy của bé (iPad, máy tính bảng). Mở
                    trang này lên và nhấn{" "}
                    <span className="font-bold text-emerald-800">
                      "Chọn tệp tin"
                    </span>{" "}
                    để nạp dữ liệu. Bé sẽ học tức thì trên bài giảng ba mẹ tự
                    soạn!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS / DYNAMIC GAME AUDIO CONFIGURATION CENTER */}
        {activePortalTab === "settings" && (
          <div className="space-y-6 animate-fade-in font-sans">
            <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/60 border-2 border-amber-200 rounded-[32px] p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-200 pb-5">
                <div>
                  <h3 className="text-lg font-black text-amber-950 uppercase tracking-tight flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span>
                      THIẾT LẬP ÂM THANH DÙNG CHUNG TRÊN TOÀN HỆ THỐNG
                    </span>
                  </h3>
                  <p className="text-xs text-amber-900 font-medium mt-1">
                    Ba mẹ & Thầy cô có thể tải lên các file âm thanh ngộ nghĩnh
                    (.mp3, .wav) để tùy ý thay thế cho các phần **Ghép câu**,
                    **Ghép từ** và **Học toán**. 👏⭐
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSoundEffect("click");
                    localStorage.removeItem("be_hoc_tieng_viet_custom_sounds");
                    setCustomSounds({});
                    alert(
                      "🎉 Đã khôi phục toàn bộ âm thanh trò chơi về mặc định!",
                    );
                  }}
                  className="self-start md:self-center text-[10px] font-black text-amber-800 hover:text-white bg-white hover:bg-amber-600 border border-amber-300 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>KHÔI PHỤC TOÀN BỘ MẶC ĐỊNH</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Clapping Card */}
                <div className="bg-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>👏 TIẾNG VỖ TAY CHÚC MỪNG (BÉ CHỌN ĐÚNG)</span>
                      {customSounds.clapping ? (
                        <span className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase">
                          Đã cá nhân hóa
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                          Mặc định
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                      Âm thanh vang lên ngay lập tức khi trẻ chọn đúng đáp án
                      toán học, ghép chính xác hàng từ hoặc câu nói.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestPlaySound("clapping")}
                      className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-amber-200 outline-none"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-700" />
                      <span>NGHE THỬ</span>
                    </button>

                    <label className="bg-slate-100 hover:bg-slate-200 border border-slate-250 px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer transition-all flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-300">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>TẢI FILE (.MP3/.WAV)</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
                        onChange={(e) => handleCustomSoundUpload(e, "clapping")}
                        className="hidden"
                      />
                    </label>

                    {customSounds.clapping && (
                      <button
                        type="button"
                        onClick={() => handleClearCustomSound("clapping")}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-95 outline-none"
                        title="Xóa âm thanh này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Wrong Buzz Card */}
                <div className="bg-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>⚠️ TIẾNG CÒI "TÈ" BÁO SAI (BÉ CHỌN CHƯA ĐÚNG)</span>
                      {customSounds.wrong ? (
                        <span className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase">
                          Đã cá nhân hóa
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                          Mặc định
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                      Tiếng còi nốt trầm báo hiệu hóm hỉnh và an thần khi con lỡ
                      tay ghép chưa đúng khối.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestPlaySound("wrong")}
                      className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-amber-200 outline-none"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-700" />
                      <span>NGHE THỬ</span>
                    </button>

                    <label className="bg-slate-100 hover:bg-slate-200 border border-slate-250 px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer transition-all flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-300">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>TẢI FILE (.MP3/.WAV)</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
                        onChange={(e) => handleCustomSoundUpload(e, "wrong")}
                        className="hidden"
                      />
                    </label>

                    {customSounds.wrong && (
                      <button
                        type="button"
                        onClick={() => handleClearCustomSound("wrong")}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-200 transition-all flex items-center justify-center cursor-pointer active:scale-95 outline-none"
                        title="Xóa âm thanh này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Victory Card */}
                <div className="bg-white border-2 border-amber-100 hover:border-amber-350 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>
                        🏆 NHẠC CHIẾN THẮNG HÀO HÙNG (HOÀN THÀNH CẢ BÀI HỌC)
                      </span>
                      {customSounds.victory ? (
                        <span className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase">
                          Đã cá nhân hóa
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full uppercase">
                          Mặc định
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed font-sans">
                      Giai điệu hoành tráng phát lên chúc mừng khi em bé xuất
                      sắc chiến thắng hoàn thành toàn bộ bài học lớn.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestPlaySound("victory")}
                      className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-amber-200 outline-none"
                    >
                      <Play className="w-3.5 h-3.5 fill-amber-700" />
                      <span>NGHE THỬ</span>
                    </button>

                    <label className="bg-slate-100 hover:bg-slate-200 border border-slate-250 px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer transition-all flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-amber-300">
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>TẢI FILE (.MP3/.WAV)</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
                        onChange={(e) => handleCustomSoundUpload(e, "victory")}
                        className="hidden"
                      />
                    </label>

                    {customSounds.victory && (
                      <button
                        type="button"
                        onClick={() => handleClearCustomSound("victory")}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-250 transition-all flex items-center justify-center cursor-pointer active:scale-95 outline-none"
                        title="Xóa âm thanh này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDITING / MANAGEMENT PANELS - ENABLING DYNAMIC REVEALING */}
        {(() => {
          if (!activeTopic) return null;
          const isSpellingTopic = !!(
            activeTopic.isSpelling || activeTopic.id === "danh-van"
          );
          const isMathTopic = !!(
            activeTopic.isMath || activeTopic.id === "toan"
          );
          const isSentenceTopic = !isSpellingTopic && !isMathTopic;

          return (
            <>
              {/* OPTION: TOGGLE FUN FACT ("LỜI GẮM THÊM CHO BÉ") */}
              {isSentenceTopic && (
                <div className="mb-6 p-4 bg-indigo-50/50 border-2 border-indigo-200/50 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Hiển thị Lời gắm thêm / Sự thật thú vị cho bé (tùy chọn)
                        💡
                      </span>
                    </h4>
                    <p className="text-[10px] text-indigo-800 font-extrabold mt-1">
                      Bật hoặc tắt toàn bộ dòng gợi ý phụ (💡 Fun Fact) trong
                      trò chơi sắp xếp ghép câu nói.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => {
                        playSoundEffect("click");
                        onToggleFunFact(!showFunFact);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black border-2 border-b-4 transition-all cursor-pointer outline-none ${
                        showFunFact
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-600 border-slate-400 border-b-slate-550"
                      }`}
                    >
                      {showFunFact ? "ĐANG BẬT ✅" : "ĐANG TẮT ❌"}
                    </button>
                  </div>
                </div>
              )}

              {/* EDIT SELECTED TOPIC DETAIL */}
              {activeTopic && (
                <div className="mb-8 p-5 bg-[#FAFBFD] border-2 border-indigo-150/60 rounded-[28px] space-y-4 animate-fade-in animate-duration-300">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <span>
                        ✏️ CHỈNH SỬA TÊN VÀ BIỂU TƯỢNG CHỦ ĐỀ SỐ{" "}
                        {topics.indexOf(activeTopic) + 1}:
                      </span>
                      <span className="text-indigo-600 lowercase font-extrabold">
                        {activeTopic.name}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-extrabold mt-0.5 uppercase tracking-wide">
                      Ba mẹ có thể tự đặt lại tên mới hoàn toàn cho chủ đề này
                      để phù hợp với giáo án riêng
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Tên chủ đề tiếng Việt mới: *
                      </label>
                      <input
                        type="text"
                        value={topicNameInput}
                        onChange={(e) => setTopicNameInput(e.target.value)}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-2.5 rounded-xl outline-none transition-all font-sans"
                        placeholder="Ví dụ: Đồ ăn khoái khẩu, Gia đình thân thương"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                        Biểu tượng (Emoji/Link): *
                      </label>
                      <input
                        type="text"
                        value={topicEmojiInput}
                        onChange={(e) => setTopicEmojiInput(e.target.value)}
                        className="w-full text-center text-[10px] font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-2 rounded-xl outline-none transition-all truncate"
                        placeholder="Emoji hoặc link icon..."
                      />
                    </div>

                    <div className="sm:col-span-4 flex gap-2">
                      <button
                        type="button"
                        onClick={handleRenameTopic}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl border-b-4 border-b-emerald-800 transition-all flex items-center justify-center gap-1 cursor-pointer outline-none"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>CẬP NHẬT TÊN</span>
                      </button>

                      {![
                        "dong-vat",
                        "do-an",
                        "do-choi",
                        "truong-hoc",
                        "ban-than",
                        "gia-dinh",
                        "danh-van",
                      ].includes(activeTopic.id) && (
                        <button
                          type="button"
                          onClick={handleDeleteTopic}
                          className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-4 py-3 rounded-xl border-b-4 border-b-rose-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
                          title="Xóa vĩnh viễn chủ đề này"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>XÓA</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MATH ILLUSTRATION LIBRARY COMPONENT */}
              {activeTopic && isMathTopic && (
                <div className="mb-10 bg-teal-50 border-4 border-teal-200 rounded-[32px] p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-teal-950 uppercase tracking-tight flex items-center gap-2 font-sans">
                        <span>🎨 THƯ VIỆN HÌNH MINH HỌA TOÁN HỌC</span>
                        <span className="text-[10px] bg-teal-200 text-teal-850 font-black px-2.5 py-0.5 rounded-full uppercase shrink-0">
                          Chỉ dùng cho toán học
                        </span>
                      </h3>
                      <p className="text-xs text-teal-850 font-medium mt-1 leading-relaxed">
                        Thầy cô tải sẵn các hình đồ vật, hoa quả, đồ chơi cụ thể
                        làm ảnh mẫu đếm số cho bé. Trò chơi toán học sẽ{" "}
                        <strong>
                          tự động bốc ngẫu nhiên & cam kết không bị lặp lại ảnh
                        </strong>{" "}
                        trong cùng một bài học nhé! 🧸🚀
                      </p>
                    </div>
                    <button
                      onClick={handleResetMathIllustrations}
                      className="self-start md:self-center text-[10px] font-black text-teal-800 hover:text-white bg-white hover:bg-teal-600 border border-teal-300 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>NẠP LẠI PRESETS GỐC</span>
                    </button>
                  </div>

                  {/* List of current illustration library items */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {mathIllustrations.map((illustrationItem) => (
                      <div
                        key={illustrationItem.id}
                        className="bg-white border-2 border-teal-150 hover:border-teal-400 rounded-2xl p-3 flex flex-col items-center justify-center relative shadow-3xs group transition-all"
                      >
                        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1.5 overflow-hidden shrink-0 relative">
                          <img
                            src={illustrationItem.image}
                            alt={illustrationItem.name}
                            className="w-full h-full object-contain hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[11px] font-black text-slate-700 text-center mt-2 font-sans truncate w-full px-1">
                          {illustrationItem.name}
                        </span>

                        {/* All items can be deleted */}
                        <button
                          onClick={() =>
                            handleDeleteMathImage(illustrationItem.id)
                          }
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 border-2 border-white text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-sm opacity-90 hover:opacity-100 outline-none"
                          title="Xóa hình này"
                        >
                          <Trash2 className="w-3 h-3 stroke-[2.5]" />
                        </button>

                        {illustrationItem.isPreset && (
                          <span className="absolute bottom-1 right-1 text-[7px] font-black text-teal-650 bg-teal-50 border border-teal-150 px-1 py-0.2 rounded-md scale-95 uppercase leading-none select-none">
                            Gốc
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Load new image manually box */}
                  <div className="bg-white/95 border-2 border-dashed border-teal-300 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-teal-600" />
                      <span>CHỌN TẮT TIẾP HÌNH MỚI LÊN THỂ THAO:</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                          1. Đặt tên hình minh họa (Ví dụ: "Quả khế", "Mèo
                          con"): *
                        </label>
                        <input
                          type="text"
                          value={newMathImageName}
                          onChange={(e) => setNewMathImageName(e.target.value)}
                          placeholder="Tên đồ vật..."
                          className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:border-teal-400 p-2.5 rounded-xl outline-none transition-all font-sans"
                        />
                      </div>

                      <div className="md:col-span-5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 font-sans">
                          2. Chọn tệp ảnh từ máy tính / điện thoại: *
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 px-3 py-2.5 rounded-xl text-center text-xs font-black text-teal-850 cursor-pointer transition-all truncate">
                            <span>
                              {newMathImageRaw
                                ? "ĐÃ CHỌN 🟢 XĂNG SÀNG"
                                : "CHỌN FILE 📁"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleMathImageUpload}
                              className="hidden"
                            />
                          </label>
                          {newMathImageRaw && (
                            <div className="w-10 h-10 border border-teal-200 bg-white rounded-lg p-1 overflow-hidden shrink-0">
                              <img
                                src={newMathImageRaw}
                                alt=""
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <button
                          type="button"
                          disabled={!newMathImageRaw}
                          onClick={handleSaveMathImage}
                          className={`w-full font-black text-xs py-3 rounded-xl border-b-4 transition-all flex items-center justify-center gap-1.5 outline-none ${
                            newMathImageRaw
                              ? "bg-teal-600 hover:bg-teal-700 active:scale-95 text-white border-b-teal-800 hover:border-b-teal-900 cursor-pointer shadow-sm"
                              : "bg-slate-100 text-slate-300 border-b-slate-200 cursor-not-allowed border-t border-r border-l"
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span>NẠP VÀO THƯ VIỆN</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thêm bài học mới block */}
              {activeTopic &&
                activePortalTab !== "cloud" &&
                activePortalTab !== "settings" &&
                activePortalTab !== "jigsaw" && (
                  <div className="mb-10 bg-indigo-50/40 border-2 border-indigo-100 rounded-[32px] p-6">
                    <h4 className="text-xs font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2 mb-4 font-sans">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span>
                        {isSpellingTopic
                          ? "Thêm bài học mới"
                          : `Thêm Bài Học Mới Vào Chủ Đề "${activeTopic.name}"`}
                      </span>
                    </h4>

                    <form
                      onSubmit={handleAddNewLessonSubmit}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-indigo-950 uppercase mb-1">
                            {isSpellingTopic
                              ? "Tên bài học (Nhập thủ công): *"
                              : "Tên bài học (Mặc định hoặc chỉnh sửa): *"}
                          </label>
                          <input
                            type="text"
                            required
                            value={newLessonName}
                            onChange={(e) => setNewLessonName(e.target.value)}
                            placeholder={
                              isSpellingTopic
                                ? "Ví dụ: Bài học Ba, Vần bé..."
                                : `Lesson ${activeTopic.items.length + 1}`
                            }
                            className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                          />
                        </div>
                      </div>

                      {isMathTopic ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-6 font-sans">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                              Chọn phép tính: *
                            </label>
                            <select
                              value={newMathOp}
                              onChange={(e) =>
                                setNewMathOp(e.target.value as any)
                              }
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-teal-400 p-3 rounded-xl outline-none transition-all font-sans"
                            >
                              <option value="+">Phép Cộng (+)</option>
                              <option value="-">Phép Trừ (-)</option>
                              <option value="*">Phép Nhân (*)</option>
                              <option value="/">Phép Chia (/)</option>
                            </select>
                          </div>

                          <div className="md:col-span-6 font-sans">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                              Mức độ khó (Phạm vi): *
                            </label>
                            <select
                              value={newDifficulty}
                              onChange={(e) =>
                                setNewDifficulty(e.target.value as any)
                              }
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-teal-400 p-3 rounded-xl outline-none transition-all font-sans"
                            >
                              <option value="dễ">Dễ (Phạm vi 10)</option>
                              <option value="trung bình">
                                Trung bình (Phạm vi 50)
                              </option>
                              <option value="khó">Khó (Phạm vi 100)</option>
                            </select>
                          </div>

                          {/* Chọn ảnh minh họa từ thư viện */}
                          <div className="md:col-span-12 space-y-2">
                            <label className="block text-[10px] font-black text-teal-950 uppercase mb-1 font-sans">
                              🖼️ Chọn ảnh minh họa đếm số từ thư viện toán học:
                              *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-3 bg-teal-50/50 rounded-2xl border-2 border-teal-100 max-h-[220px] overflow-y-auto">
                              {mathIllustrations.map((ill) => (
                                <button
                                  key={ill.id}
                                  type="button"
                                  onClick={() => {
                                    playSoundEffect("click");
                                    setSelectedMathIllustrationId(ill.id);
                                  }}
                                  className={`p-2.5 rounded-xl border-2 bg-white flex flex-col items-center justify-center transition-all cursor-pointer outline-none ${
                                    selectedMathIllustrationId === ill.id
                                      ? "border-teal-500 bg-teal-50 shadow-md ring-2 ring-teal-200"
                                      : "border-slate-100 hover:border-slate-350"
                                  }`}
                                >
                                  <img
                                    src={ill.image}
                                    className="w-10 h-10 object-contain"
                                    alt=""
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-[9px] font-extrabold text-slate-700 text-center truncate w-full mt-1.5">
                                    {ill.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                            <p className="text-[10px] text-teal-850/80 italic font-sans">
                              Hệ thống sẽ dùng ảnh minh hoạ bé vừa chọn để xây
                              dựng 5 câu đố phép tính trực quan phía trên nhé!
                            </p>
                          </div>
                        </div>
                      ) : isSpellingTopic ? (
                        /* SPELLING-SPECIFIC FIELD */
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                              Công thức đánh vần chữ cái mới (Nhập có dấu cách,
                              ví dụ: "B + a = Ba"): *
                            </label>
                            <input
                              type="text"
                              required
                              value={newSpellingFormula}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewSpellingFormula(val);
                              }}
                              placeholder="Ví dụ: B + a = Ba"
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                            />
                          </div>
                        </div>
                      ) : (
                        /* SENTENCE-SPECIFIC ORIGINAL FIELDS */
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                                Câu chuẩn tiếng Việt (nhập câu chuẩn, ví dụ: "Bé
                                đi học"): *
                              </label>
                              <input
                                type="text"
                                required
                                value={newSentence}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewSentence(val);
                                  // Pre-populate scrambled words by splitting on space & strip punctuation
                                  const cleanWords = val
                                    .replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "")
                                    .split(/\s+/)
                                    .filter(Boolean);
                                  setScrambledWordsInput(cleanWords.join(", "));
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
                            <div className="md:col-span-4">
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                                Độ khó:
                              </label>
                              <select
                                value={newDifficulty}
                                onChange={(e: any) => {
                                  const difficultyValue = e.target.value;
                                  setNewDifficulty(difficultyValue);
                                  if (newSentence.trim()) {
                                    const adjusted =
                                      adjustSentenceForDifficulty(
                                        newSentence,
                                        difficultyValue,
                                      );
                                    setNewSentence(adjusted);
                                    const cleanWords = adjusted
                                      .replace(
                                        /[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,
                                        "",
                                      )
                                      .split(/\s+/)
                                      .filter(Boolean);
                                    setScrambledWordsInput(
                                      cleanWords.join(", "),
                                    );
                                  }
                                }}
                                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all cursor-pointer font-sans"
                              >
                                <option value="dễ">Dễ (3-4 từ)</option>
                                <option value="trung bình">
                                  Trung bình (5-7 chữ)
                                </option>
                                <option value="khó">Khó (trên 8 chữ)</option>
                              </select>
                            </div>

                            <div className="md:col-span-8">
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center justify-between">
                                <span>
                                  Mảnh từ ghép (ngăn cách bằng dấu phẩy): *
                                </span>
                                <span className="text-[9px] text-indigo-500 font-black lowercase italic">
                                  Mặc định phân tích theo chữ
                                </span>
                              </label>
                              <input
                                type="text"
                                required
                                value={scrambledWordsInput}
                                onChange={(e) =>
                                  setScrambledWordsInput(e.target.value)
                                }
                                placeholder="Con, yêu, bố mẹ, nhiều"
                                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-250 focus:border-indigo-400 p-3 rounded-xl outline-none transition-all placeholder:text-slate-400 font-sans"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* 📷 🎙️ MEDIA MANUAL LOADING (Hình ảnh minh họa & Cách phát âm MP3) */}
                      {!isMathTopic && (
                        <div className="p-4 bg-slate-50 border-2 border-indigo-100 rounded-[24px] space-y-4 shadow-3xs">
                          <span className="text-[10px] font-black text-slate-650 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-505" />
                            <span>
                              CÀI ĐẶT HÌNH ẢNH & FILE PHÁT ÂM (Tùy chọn tải thủ
                              công) 🎨 🎙️
                            </span>
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 1. Illustration Image Manual Load */}
                            <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                              <div>
                                <label className="block text-[10px] font-black text-sky-900 uppercase mb-1 flex items-center gap-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-sky-505" />
                                  <span>
                                    Ảnh minh họa (.png, .jpg, hoặc dán URL):
                                  </span>
                                </label>
                                <p className="text-[8px] text-slate-400 font-bold mb-2">
                                  Thêm hình ảnh kích thích giác quan giúp bé
                                  nhận mặt chữ/âm
                                </p>
                              </div>

                              {newCustomImage ? (
                                <div className="p-2 bg-sky-50/40 border border-sky-100 rounded-xl flex items-center gap-3">
                                  <img
                                    src={newCustomImage}
                                    alt="Manual preview"
                                    className="w-12 h-12 rounded-lg object-cover border border-white shadow-xs"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="overflow-hidden flex-1 leading-tight">
                                    <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">
                                      Đã nạp thành công ✅
                                    </span>
                                    <p className="text-[9px] text-slate-550 truncate font-mono mt-1">
                                      {newCustomImageName ||
                                        "Ảnh từ liên kết dán"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSoundEffect("pop");
                                      setNewCustomImage("");
                                      setNewCustomImageName("");
                                    }}
                                    className="p-1.5 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-rose-400 transition-all shrink-0 cursor-pointer"
                                    title="Xóa hình ảnh"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Drag and Drop/Upload Container */}
                                  <div
                                    onClick={() => {
                                      const inp = document.getElementById(
                                        "creation-img-uploader",
                                      );
                                      if (inp) inp.click();
                                    }}
                                    className="border-2 border-dashed border-slate-300 hover:border-sky-400 hover:bg-sky-50/30 p-2 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[56px]"
                                  >
                                    <Upload className="w-4 h-4 text-sky-400 mb-0.5" />
                                    <span className="text-[10px] font-black text-slate-600">
                                      Bấm tải ảnh lên
                                    </span>
                                    <span className="text-[7px] text-slate-400 font-extrabold uppercase">
                                      PNG, JPG dưới 1.5MB
                                    </span>
                                  </div>
                                  <input
                                    id="creation-img-uploader"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        if (file.size > 1.5 * 1024 * 1024) {
                                          alert(
                                            "Kích thước tệp lớn hơn 1.5 MB rồi ạ!",
                                          );
                                          return;
                                        }
                                        try {
                                          const base64Str = await compressImage(
                                            file,
                                            400,
                                            400,
                                          );
                                          setNewCustomImage(base64Str);
                                          setNewCustomImageName(file.name);
                                          playSoundEffect("success");
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }
                                    }}
                                  />

                                  {/* URL Paste */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={newCustomImage}
                                      onChange={(e) => {
                                        setNewCustomImage(e.target.value);
                                        if (
                                          e.target.value &&
                                          !e.target.value.startsWith("data:")
                                        ) {
                                          setNewCustomImageName(
                                            "Liên kết trực tuyến (URL)",
                                          );
                                        } else if (!e.target.value) {
                                          setNewCustomImageName("");
                                        }
                                      }}
                                      placeholder="Hoặc dán link URL ảnh trực tuyến..."
                                      className="w-full text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-sky-400 p-2 rounded-lg outline-none transition-all placeholder:text-slate-400"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* 2. Audio Pronunciation Manual Load */}
                            <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3">
                              <div>
                                <label className="block text-[10px] font-black text-emerald-950 uppercase mb-1 flex items-center gap-1">
                                  <Music className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>
                                    Giọng phát âm MP3 (.mp3, .wav, hoặc dán
                                    URL):
                                  </span>
                                </label>
                                <p className="text-[8px] text-slate-400 font-bold mb-2">
                                  Lời đọc chậm từng vần giúp con rèn thanh dấu
                                  chính xác
                                </p>
                              </div>

                              {newCustomAudio ? (
                                <div className="p-2 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (
                                          creationAudPlayback &&
                                          testAudioObj
                                        ) {
                                          testAudioObj.pause();
                                          setCreationAudPlayback(false);
                                        } else {
                                          playSoundEffect("click");
                                          const audio = new Audio(
                                            newCustomAudio,
                                          );
                                          setTestAudioObj(audio);
                                          setCreationAudPlayback(true);
                                          audio.onended = () =>
                                            setCreationAudPlayback(false);
                                          audio.onerror = () => {
                                            setCreationAudPlayback(false);
                                            alert(
                                              "Lỗi không thể phát tệp âm thanh này!",
                                            );
                                          };
                                          audio.play().catch((e) => {
                                            console.error(e);
                                            setCreationAudPlayback(false);
                                          });
                                        }
                                      }}
                                      className={`p-2 rounded-full text-white cursor-pointer transition-all ${
                                        creationAudPlayback
                                          ? "bg-indigo-500 animate-pulse"
                                          : "bg-emerald-555 hover:bg-emerald-600"
                                      }`}
                                      title={
                                        creationAudPlayback
                                          ? "Dừng"
                                          : "Phát thử"
                                      }
                                    >
                                      {creationAudPlayback ? (
                                        <Square className="w-3.5 h-3.5 fill-white" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                      )}
                                    </button>
                                    <div className="overflow-hidden leading-tight">
                                      <span className="text-[8px] font-black text-emerald-800 bg-emerald-50 px-1 rounded uppercase">
                                        Sẵn sàng 🎙️
                                      </span>
                                      <p className="text-[9px] text-slate-500 truncate font-mono max-w-[124px] mt-0.5">
                                        {newCustomAudioName ||
                                          "Âm dán từ liên kết"}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSoundEffect("pop");
                                      setNewCustomAudio("");
                                      setNewCustomAudioName("");
                                      if (creationAudPlayback && testAudioObj) {
                                        testAudioObj.pause();
                                        setCreationAudPlayback(false);
                                      }
                                    }}
                                    className="p-1.5 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-rose-400 transition-all shrink-0 cursor-pointer"
                                    title="Xóa âm phát"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Audio Upload Controller */}
                                  <div
                                    onClick={() => {
                                      const inp = document.getElementById(
                                        "creation-aud-uploader",
                                      );
                                      if (inp) inp.click();
                                    }}
                                    className="border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 p-2 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[56px]"
                                  >
                                    <Upload className="w-4 h-4 text-emerald-400 mb-0.5" />
                                    <span className="text-[10px] font-black text-slate-655">
                                      Nhập file ghi âm hướng dẫn
                                    </span>
                                    <span className="text-[7px] text-slate-400 font-extrabold uppercase">
                                      MP3, M4A, WAV dưới 2MB
                                    </span>
                                  </div>
                                  <input
                                    id="creation-aud-uploader"
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        if (file.size > 2 * 1024 * 1024) {
                                          alert("Tệp quá giới hạn 2 MB rồi!");
                                          return;
                                        }
                                        try {
                                          const base64Str =
                                            await fileToBase64(file);
                                          setNewCustomAudio(base64Str);
                                          setNewCustomAudioName(file.name);
                                          playSoundEffect("success");
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }
                                    }}
                                  />

                                  {/* Audio URL Paste */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={newCustomAudio}
                                      onChange={(e) => {
                                        setNewCustomAudio(e.target.value);
                                        if (
                                          e.target.value &&
                                          !e.target.value.startsWith("data:")
                                        ) {
                                          setNewCustomAudioName(
                                            "Liên kết trực tuyến (URL)",
                                          );
                                        } else if (!e.target.value) {
                                          setNewCustomAudioName("");
                                        }
                                      }}
                                      placeholder="Hoặc dán URL âm thanh MP3..."
                                      className="w-full text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-emerald-400 p-2 rounded-lg outline-none transition-all placeholder:text-slate-400"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 🎯 SƠ ĐỒ ĐIỂM GÁN PHÁT ÂM CHI TIẾT */}
                          {newCustomImage && (
                            <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span>
                                      Thiết kế Sơ Đồ Phát Âm trên Ảnh (
                                      {newLessonHotspots.length} điểm) 📍
                                    </span>
                                  </span>
                                  <p className="text-[9px] text-slate-500 font-bold">
                                    Bấm trực tiếp vào ảnh để đặt điểm phát âm
                                    mới, hoặc chỉnh sửa tệp Mp3 cho từng điểm
                                    ghim dưới ảnh.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    playSoundEffect("click");
                                    const newHp: AudioHotspot = {
                                      id: `hp-${Date.now()}`,
                                      x: 50,
                                      y: 50,
                                    };
                                    setNewLessonHotspots([
                                      ...newLessonHotspots,
                                      newHp,
                                    ]);
                                    setSelectedNewHotspotId(newHp.id);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg border-b-2 border-b-indigo-800 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>📍 GÁN THÊM ÂM THANH CHỮ</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Left: Interactive Canvas */}
                                <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-900/5 p-2 rounded-2xl border border-slate-200">
                                  <div
                                    className="relative max-w-full cursor-crosshair overflow-hidden rounded-xl border border-white shadow-md select-none bg-slate-900"
                                    onMouseMove={(e) => {
                                      if (!draggingHotspotId) return;
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const x =
                                        ((e.clientX - rect.left) / rect.width) *
                                        100;
                                      const y =
                                        ((e.clientY - rect.top) / rect.height) *
                                        100;
                                      const clampedX = Math.max(
                                        0,
                                        Math.min(100, Math.round(x * 10) / 10),
                                      );
                                      const clampedY = Math.max(
                                        0,
                                        Math.min(100, Math.round(y * 10) / 10),
                                      );
                                      setNewLessonHotspots((prev) =>
                                        prev.map((h) => {
                                          if (h.id === draggingHotspotId) {
                                            return {
                                              ...h,
                                              x: clampedX,
                                              y: clampedY,
                                            };
                                          }
                                          return h;
                                        }),
                                      );
                                    }}
                                    onTouchMove={(e) => {
                                      if (!draggingHotspotId) return;
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const touch = e.touches[0];
                                      if (!touch) return;
                                      const x =
                                        ((touch.clientX - rect.left) /
                                          rect.width) *
                                        100;
                                      const y =
                                        ((touch.clientY - rect.top) /
                                          rect.height) *
                                        100;
                                      const clampedX = Math.max(
                                        0,
                                        Math.min(100, Math.round(x * 10) / 10),
                                      );
                                      const clampedY = Math.max(
                                        0,
                                        Math.min(100, Math.round(y * 10) / 10),
                                      );
                                      setNewLessonHotspots((prev) =>
                                        prev.map((h) => {
                                          if (h.id === draggingHotspotId) {
                                            return {
                                              ...h,
                                              x: clampedX,
                                              y: clampedY,
                                            };
                                          }
                                          return h;
                                        }),
                                      );
                                    }}
                                    onMouseUp={() => setDraggingHotspotId(null)}
                                    onMouseLeave={() =>
                                      setDraggingHotspotId(null)
                                    }
                                    onTouchEnd={() =>
                                      setDraggingHotspotId(null)
                                    }
                                    onTouchCancel={() =>
                                      setDraggingHotspotId(null)
                                    }
                                    onClick={(e) => {
                                      if (draggingHotspotId) {
                                        setDraggingHotspotId(null);
                                        return;
                                      }
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const x =
                                        ((e.clientX - rect.left) / rect.width) *
                                        100;
                                      const y =
                                        ((e.clientY - rect.top) / rect.height) *
                                        100;
                                      const newHp: AudioHotspot = {
                                        id: `hp-${Date.now()}`,
                                        x: Math.round(x * 10) / 10,
                                        y: Math.round(y * 10) / 10,
                                      };
                                      setNewLessonHotspots([
                                        ...newLessonHotspots,
                                        newHp,
                                      ]);
                                      setSelectedNewHotspotId(newHp.id);
                                      playSoundEffect("pop");
                                    }}
                                  >
                                    <img
                                      src={newCustomImage}
                                      alt="Phần đặt điểm phát âm"
                                      className="max-h-64 object-contain mx-auto select-none pointer-events-none opacity-90"
                                      referrerPolicy="no-referrer"
                                    />

                                    {newLessonHotspots.map((hp, index) => {
                                      const isSelected =
                                        selectedNewHotspotId === hp.id;
                                      const isDraggingThis =
                                        draggingHotspotId === hp.id;
                                      return (
                                        <button
                                          key={hp.id}
                                          type="button"
                                          style={{
                                            left: `${hp.x}%`,
                                            top: `${hp.y}%`,
                                          }}
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingHotspotId(hp.id);
                                            setSelectedNewHotspotId(hp.id);
                                          }}
                                          onTouchStart={(e) => {
                                            e.stopPropagation();
                                            setDraggingHotspotId(hp.id);
                                            setSelectedNewHotspotId(hp.id);
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedNewHotspotId(hp.id);
                                            playSoundEffect("click");
                                            if (hp.audioData) {
                                              const audio = new Audio(
                                                hp.audioData,
                                              );
                                              audio
                                                .play()
                                                .catch((er) =>
                                                  console.error(er),
                                                );
                                            }
                                          }}
                                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 text-white shadow-lg flex items-center justify-center transition-all ${
                                            isDraggingThis
                                              ? "cursor-grabbing scale-135 ring-4 ring-amber-400 z-40 bg-amber-400"
                                              : isSelected
                                                ? "bg-amber-500 scale-125 ring-4 ring-amber-300 z-30 cursor-grab"
                                                : "bg-indigo-600 hover:bg-indigo-500 scale-100 z-20 cursor-grab"
                                          } border-2 border-white`}
                                          title={`Ghim ${index + 1}: ${hp.audioName || "Chất nạp âm thanh"}`}
                                        >
                                          <Volume2 className="w-3.5 h-3.5 text-white" />
                                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-black px-1 rounded whitespace-nowrap shadow-xs">
                                            {isSpellingTopic
                                              ? `Loa ${index + 1}`
                                              : `Nút ${index + 1}`}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">
                                    💡 Mẹo: Nhấn trực tiếp lên ảnh để ghim; nhấp
                                    nốt loa để nghe thử
                                  </span>
                                </div>

                                {/* Right: selected hotspot details */}
                                <div className="md:col-span-5 flex flex-col justify-between p-3.5 bg-white border border-slate-200 rounded-2xl min-h-[180px]">
                                  {selectedNewHotspotId ? (
                                    (() => {
                                      const activeHpIndex =
                                        newLessonHotspots.findIndex(
                                          (h) => h.id === selectedNewHotspotId,
                                        );
                                      const activeHp =
                                        newLessonHotspots[activeHpIndex];
                                      if (!activeHp)
                                        return (
                                          <div className="text-center font-bold text-slate-400 text-[10px] my-auto">
                                            Vui lòng chọn hoặc gán điểm ghim
                                          </div>
                                        );

                                      return (
                                        <div className="space-y-3 flex-1 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between border-b pb-1.5">
                                              <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                ⚙️ CÀI ĐẶT NÚT ÂM THANH SỐ{" "}
                                                {activeHpIndex + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  playSoundEffect("pop");
                                                  setNewLessonHotspots((prev) =>
                                                    prev.filter(
                                                      (h) =>
                                                        h.id !==
                                                        selectedNewHotspotId,
                                                    ),
                                                  );
                                                  setSelectedNewHotspotId(null);
                                                }}
                                                className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-md transition-all"
                                                title="Xóa điểm ghim này"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">
                                              Tọa độ: X: {activeHp.x}%, Y:{" "}
                                              {activeHp.y}%
                                            </p>
                                          </div>

                                          <div className="space-y-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                            <label className="block text-[9px] font-black text-slate-650 uppercase">
                                              🎤 Nạp file phát âm cho ĐIỂM{" "}
                                              {activeHpIndex + 1}:
                                            </label>

                                            {activeHp.audioData ? (
                                              <div className="flex items-center justify-between gap-2 p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      playSoundEffect("click");
                                                      const audio = new Audio(
                                                        activeHp.audioData,
                                                      );
                                                      audio
                                                        .play()
                                                        .catch((er) =>
                                                          console.error(er),
                                                        );
                                                    }}
                                                    className="p-1 bg-emerald-505 rounded-full hover:bg-emerald-600 text-white shrink-0"
                                                  >
                                                    <Play className="w-3 h-3 fill-white" />
                                                  </button>
                                                  <span className="text-[9px] text-emerald-800 truncate font-mono font-bold">
                                                    {activeHp.audioName ||
                                                      "Ghi âm đã sẵn sàng"}
                                                  </span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    playSoundEffect("pop");
                                                    setNewLessonHotspots(
                                                      (prev) =>
                                                        prev.map((h) => {
                                                          if (
                                                            h.id ===
                                                            selectedNewHotspotId
                                                          ) {
                                                            return {
                                                              ...h,
                                                              audioData:
                                                                undefined,
                                                              audioName:
                                                                undefined,
                                                            };
                                                          }
                                                          return h;
                                                        }),
                                                    );
                                                  }}
                                                  className="text-[9px] text-rose-500 hover:bg-rose-100 p-1 rounded font-bold"
                                                  title="Xóa audio"
                                                >
                                                  Gỡ âm
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                <div
                                                  onClick={() => {
                                                    const inp =
                                                      document.getElementById(
                                                        `hp-uploader-${activeHp.id}`,
                                                      );
                                                    if (inp) inp.click();
                                                  }}
                                                  className="border border-dashed border-slate-300 hover:border-indigo-400 p-2 rounded-lg text-center cursor-pointer bg-white transition-all text-[9.5px] font-bold"
                                                >
                                                  📤 Nhấn tải âm và liên kết
                                                </div>
                                                <input
                                                  id={`hp-uploader-${activeHp.id}`}
                                                  type="file"
                                                  accept="audio/*"
                                                  className="hidden"
                                                  onChange={async (e) => {
                                                    if (
                                                      e.target.files &&
                                                      e.target.files[0]
                                                    ) {
                                                      const file =
                                                        e.target.files[0];
                                                      try {
                                                        const b64 =
                                                          await fileToBase64(
                                                            file,
                                                          );
                                                        setNewLessonHotspots(
                                                          (prev) =>
                                                            prev.map((h) => {
                                                              if (
                                                                h.id ===
                                                                selectedNewHotspotId
                                                              ) {
                                                                return {
                                                                  ...h,
                                                                  audioData:
                                                                    b64,
                                                                  audioName:
                                                                    file.name,
                                                                };
                                                              }
                                                              return h;
                                                            }),
                                                        );
                                                        playSoundEffect(
                                                          "success",
                                                        );
                                                      } catch (er) {
                                                        console.error(er);
                                                      }
                                                    }
                                                  }}
                                                />

                                                <input
                                                  type="text"
                                                  value={
                                                    activeHp.audioData || ""
                                                  }
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNewLessonHotspots(
                                                      (prev) =>
                                                        prev.map((h) => {
                                                          if (
                                                            h.id ===
                                                            selectedNewHotspotId
                                                          ) {
                                                            return {
                                                              ...h,
                                                              audioData:
                                                                val ||
                                                                undefined,
                                                              audioName: val
                                                                ? "Liên kết dán"
                                                                : undefined,
                                                            };
                                                          }
                                                          return h;
                                                        }),
                                                    );
                                                  }}
                                                  placeholder="Paster URL audio mp3..."
                                                  className="w-full text-[8.5px] p-1.5 border rounded-lg"
                                                />
                                              </div>
                                            )}
                                          </div>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              setSelectedNewHotspotId(null)
                                            }
                                            className="w-full bg-slate-100 border border-slate-250 py-1 rounded-xl text-[9px] font-black text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                                          >
                                            ĐÓNG THIẾT KẾ ĐIỂM NÀY
                                          </button>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <div className="my-auto text-center font-bold text-slate-400 text-[10px] space-y-1.5">
                                      <Volume2 className="w-6 h-6 text-indigo-300 mx-auto animate-pulse" />
                                      <p>
                                        Nhấn vào Loa bất kỳ trên hình ảnh hoặc
                                        nút màu tím để thiết kế phát âm cho điểm
                                        đó con nhé! 🌟
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isSpellingTopic
                        ? newSpellingFormula.trim() && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-1.5 shadow-2xs">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-2 font-sans">
                                Các khối chữ bé sẽ xếp:
                              </span>
                              {newSpellingFormula
                                .trim()
                                .split(/\s+/)
                                .filter(Boolean)
                                .map((word, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-black bg-orange-50 border border-orange-200 text-orange-850 px-2.5 py-1 rounded-lg"
                                  >
                                    {word}
                                  </span>
                                ))}
                            </div>
                          )
                        : scrambledWordsInput.trim() && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-1.5 shadow-2xs">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-2 font-sans">
                                Các khối từ bé sẽ xếp:
                              </span>
                              {scrambledWordsInput
                                .split(",")
                                .map((w) => w.trim())
                                .filter(Boolean)
                                .map((word, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-black bg-indigo-50 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-lg"
                                  >
                                    {word}
                                  </span>
                                ))}
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
              {activeTopic &&
                activePortalTab !== "cloud" &&
                activePortalTab !== "settings" &&
                activePortalTab !== "jigsaw" && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
                      <span>
                        Danh Sách Câu Hỏi ({activeTopic.items.length} phần):
                      </span>
                      <span className="text-xs text-indigo-600 lowercase font-extrabold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                        nhóm: {activeTopic.name}
                      </span>
                    </h3>

                    <div className="space-y-6" id="teacher-items-scroller">
                      {activeTopic.items.map((item, idx) => {
                        const itemOverride = localOverrides[item.id] || {};
                        const currentImg = itemOverride.customImage;
                        const currentAud = itemOverride.customAudio;

                        if (item.type === "math") {
                          return (
                            <div key={item.id} className="space-y-3">
                              <div className="p-5 bg-teal-50/70 border-2 border-teal-200 rounded-[28px] transition-all">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-teal-200 text-teal-800 font-black px-2 py-0.5 rounded-md">
                                      Bài {idx + 1}
                                    </span>
                                    <h4 className="font-sans font-black text-teal-900 leading-snug text-base flex items-center gap-2">
                                      <span>{item.emoji}</span>
                                      {item.sentence}
                                    </h4>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteLessonItem(item.id)
                                    }
                                    className="text-[10px] font-black text-rose-600 hover:bg-rose-50 border border-slate-250 hover:border-rose-300 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                    title="Xóa bài học này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Xóa Bài</span>
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wide">
                                    {item.mathOperations?.length || 0} Phép tính
                                    tương ứng:
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                                    {item.mathOperations?.map((op, opIdx) => (
                                      <div
                                        key={op.id}
                                        className="bg-white border border-teal-100 rounded-xl p-3 text-center shadow-xs"
                                      >
                                        <div className="text-sm font-black text-slate-800 tracking-wider bg-slate-50 py-2 rounded-lg mb-2">
                                          {op.expression} = ?
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                          {op.options.map((opt, optIdx) => (
                                            <span
                                              key={optIdx}
                                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                                opt === op.correctAnswer
                                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                                              }`}
                                            >
                                              {opt}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={item.id} className="space-y-3">
                            <div className="p-5 bg-slate-50/70 hover:bg-slate-50 border-2 border-slate-200 rounded-[28px] grid grid-cols-1 md:grid-cols-12 gap-5 transition-all">
                              {/* Sentence basic profile info */}
                              <div className="md:col-span-4 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] bg-slate-200 text-slate-600 font-black px-2 py-0.5 rounded-md">
                                        Bài {idx + 1}
                                      </span>
                                      <span className="text-xl">
                                        {item.emoji}
                                      </span>
                                    </div>

                                    {/* DELETE LESSON ITEM BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteLessonItem(item.id)
                                      }
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
                                  <div className="space-y-2 w-full">
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
                                        onClick={() =>
                                          handleRemoveImageOverride(item.id)
                                        }
                                        className="p-1.5 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg border border-transparent hover:border-rose-400 transition-all shrink-0 cursor-pointer"
                                        title="Xóa hình ảnh tự tải"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        playSoundEffect("click");
                                        setEditingHotspotsItemId(
                                          editingHotspotsItemId === item.id
                                            ? null
                                            : item.id,
                                        );
                                        setSelectedExistingHotspotId(null);
                                      }}
                                      className={`w-full py-1.5 rounded-xl text-[9px] font-black border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                        editingHotspotsItemId === item.id
                                          ? "bg-amber-500 text-white border-amber-600 shadow-inner"
                                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                                      }`}
                                    >
                                      <span>
                                        📍 Đặt điểm phát âm trên ảnh (
                                        {itemOverride.audioHotspots?.length ||
                                          item.audioHotspots?.length ||
                                          0}
                                        )
                                      </span>
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
                                      if (
                                        e.dataTransfer.files &&
                                        e.dataTransfer.files[0]
                                      ) {
                                        handleUploadImage(
                                          item.id,
                                          e.dataTransfer.files[0],
                                        );
                                      }
                                    }}
                                    onClick={() => {
                                      const input = document.getElementById(
                                        `img-file-${item.id}`,
                                      );
                                      if (input) input.click();
                                    }}
                                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[60px] ${
                                      dragOverInputId === `img-${item.id}`
                                        ? "border-sky-500 bg-sky-50/50"
                                        : "border-slate-350 hover:border-sky-450 hover:bg-sky-50/20"
                                    }`}
                                  >
                                    <Upload className="w-5 h-5 text-sky-400 mb-1" />
                                    <span className="text-[10px] font-black text-sky-900 leading-none">
                                      Tải Ảnh (.png,.jpg)
                                    </span>
                                    <span className="text-[8px] text-gray-400 font-extrabold uppercase mt-0.5">
                                      Kéo thả hoặc nhấn
                                    </span>

                                    <input
                                      id={`img-file-${item.id}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files[0]
                                        ) {
                                          handleUploadImage(
                                            item.id,
                                            e.target.files[0],
                                          );
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
                                        onClick={() =>
                                          playCustomAudio(item.id, currentAud)
                                        }
                                        className={`p-2 rounded-full text-white cursor-pointer transition-all ${
                                          activePlaybackId === item.id
                                            ? "bg-indigo-500"
                                            : "bg-emerald-500 hover:bg-emerald-600"
                                        }`}
                                        title={
                                          activePlaybackId === item.id
                                            ? "Dừng"
                                            : "Phát thử"
                                        }
                                      >
                                        {activePlaybackId === item.id ? (
                                          <Square className="w-3.5 h-3.5 fill-white" />
                                        ) : (
                                          <Play className="w-3.5 h-3.5 fill-white" />
                                        )}
                                      </button>
                                      <span className="text-[9px] font-black text-slate-500">
                                        Giọng riêng
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveAudioOverride(item.id)
                                      }
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
                                          ? "border-red-500 bg-red-50 text-red-600 animate-pulse"
                                          : "border-slate-350 hover:border-emerald-450 hover:bg-emerald-50/10 text-emerald-800"
                                      }`}
                                    >
                                      {recordingItemId === item.id ? (
                                        <>
                                          <Square className="w-4 h-4 fill-current mb-0.5" />
                                          <span className="text-[9px] font-black uppercase">
                                            Click Dừng
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Mic className="w-4 h-4 text-emerald-500 mb-0.5" />
                                          <span className="text-[9px] font-black">
                                            Nói Ghi Âm
                                          </span>
                                        </>
                                      )}
                                    </button>

                                    {/* Option upload audio */}
                                    <div
                                      onClick={() => {
                                        const input = document.getElementById(
                                          `aud-file-${item.id}`,
                                        );
                                        if (input) input.click();
                                      }}
                                      className="border-2 border-dashed border-slate-350 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-2xl p-2 flex flex-col items-center justify-center text-indigo-700 cursor-pointer min-h-[56px] text-center"
                                    >
                                      <Upload className="w-4 h-4 text-indigo-400 mb-0.5" />
                                      <span className="text-[9px] font-black">
                                        Tải File
                                      </span>
                                      <span className="text-[7px] text-gray-400 uppercase">
                                        MP3/WAV/M4A
                                      </span>

                                      <input
                                        id={`aud-file-${item.id}`}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (
                                            e.target.files &&
                                            e.target.files[0]
                                          ) {
                                            handleUploadAudio(
                                              item.id,
                                              e.target.files[0],
                                            );
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* INTERACTIVE COORDINATE HOTSPOTS MANAGER FOR EXISTING ITEM */}
                            {editingHotspotsItemId === item.id && (
                              <div className="p-4 bg-amber-50/50 border-2 border-amber-200 rounded-[24px] space-y-3 animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                      <span>
                                        Sơ đồ phát âm: &ldquo;{item.sentence}
                                        &rdquo; 📍
                                      </span>
                                    </span>
                                    <p className="text-[9px] text-slate-500 font-bold">
                                      Nhấn trực tiếp lên ảnh để ghim loa phát
                                      âm; nhấp nốt loa để nghe thử/sửa âm thanh.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      playSoundEffect("click");
                                      const currentHpList =
                                        itemOverride.audioHotspots ||
                                        item.audioHotspots ||
                                        [];
                                      const newHp: AudioHotspot = {
                                        id: `hp-${Date.now()}`,
                                        x: 50,
                                        y: 50,
                                      };
                                      const updatedHpList = [
                                        ...currentHpList,
                                        newHp,
                                      ];

                                      const updatedOver = {
                                        ...localOverrides,
                                        [item.id]: {
                                          ...itemOverride,
                                          audioHotspots: updatedHpList,
                                        },
                                      };
                                      setLocalOverrides(updatedOver);
                                      onSaveOverrides(updatedOver);
                                      setSelectedExistingHotspotId(newHp.id);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg border-b-2 border-b-indigo-800 transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    <span>📍 GÁN THÊM ÂM THANH</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                  {/* Left: Interactive design canvas */}
                                  <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-900/5 p-2 rounded-xl border border-slate-200">
                                    <div
                                      className="relative max-w-full cursor-crosshair overflow-hidden rounded-lg bg-slate-900"
                                      onMouseMove={(e) => {
                                        if (!draggingHotspotId) return;
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const x =
                                          ((e.clientX - rect.left) /
                                            rect.width) *
                                          100;
                                        const y =
                                          ((e.clientY - rect.top) /
                                            rect.height) *
                                          100;
                                        const clampedX = Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            Math.round(x * 10) / 10,
                                          ),
                                        );
                                        const clampedY = Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            Math.round(y * 10) / 10,
                                          ),
                                        );

                                        const currentHpList =
                                          itemOverride.audioHotspots ||
                                          item.audioHotspots ||
                                          [];
                                        const updatedHpList = currentHpList.map(
                                          (h) => {
                                            if (h.id === draggingHotspotId) {
                                              return {
                                                ...h,
                                                x: clampedX,
                                                y: clampedY,
                                              };
                                            }
                                            return h;
                                          },
                                        );

                                        const updatedOver = {
                                          ...localOverrides,
                                          [item.id]: {
                                            ...itemOverride,
                                            audioHotspots: updatedHpList,
                                          },
                                        };
                                        setLocalOverrides(updatedOver);
                                        onSaveOverrides(updatedOver);
                                      }}
                                      onTouchMove={(e) => {
                                        if (!draggingHotspotId) return;
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const touch = e.touches[0];
                                        if (!touch) return;
                                        const x =
                                          ((touch.clientX - rect.left) /
                                            rect.width) *
                                          100;
                                        const y =
                                          ((touch.clientY - rect.top) /
                                            rect.height) *
                                          100;
                                        const clampedX = Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            Math.round(x * 10) / 10,
                                          ),
                                        );
                                        const clampedY = Math.max(
                                          0,
                                          Math.min(
                                            100,
                                            Math.round(y * 10) / 10,
                                          ),
                                        );

                                        const currentHpList =
                                          itemOverride.audioHotspots ||
                                          item.audioHotspots ||
                                          [];
                                        const updatedHpList = currentHpList.map(
                                          (h) => {
                                            if (h.id === draggingHotspotId) {
                                              return {
                                                ...h,
                                                x: clampedX,
                                                y: clampedY,
                                              };
                                            }
                                            return h;
                                          },
                                        );

                                        const updatedOver = {
                                          ...localOverrides,
                                          [item.id]: {
                                            ...itemOverride,
                                            audioHotspots: updatedHpList,
                                          },
                                        };
                                        setLocalOverrides(updatedOver);
                                        onSaveOverrides(updatedOver);
                                      }}
                                      onMouseUp={() =>
                                        setDraggingHotspotId(null)
                                      }
                                      onMouseLeave={() =>
                                        setDraggingHotspotId(null)
                                      }
                                      onTouchEnd={() =>
                                        setDraggingHotspotId(null)
                                      }
                                      onTouchCancel={() =>
                                        setDraggingHotspotId(null)
                                      }
                                      onClick={(e) => {
                                        if (draggingHotspotId) {
                                          setDraggingHotspotId(null);
                                          return;
                                        }
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const x =
                                          ((e.clientX - rect.left) /
                                            rect.width) *
                                          100;
                                        const y =
                                          ((e.clientY - rect.top) /
                                            rect.height) *
                                          100;

                                        const currentHpList =
                                          itemOverride.audioHotspots ||
                                          item.audioHotspots ||
                                          [];
                                        const newHp: AudioHotspot = {
                                          id: `hp-${Date.now()}`,
                                          x: Math.round(x * 10) / 10,
                                          y: Math.round(y * 10) / 10,
                                        };
                                        const updatedHpList = [
                                          ...currentHpList,
                                          newHp,
                                        ];

                                        const updatedOver = {
                                          ...localOverrides,
                                          [item.id]: {
                                            ...itemOverride,
                                            audioHotspots: updatedHpList,
                                          },
                                        };
                                        setLocalOverrides(updatedOver);
                                        onSaveOverrides(updatedOver);
                                        setSelectedExistingHotspotId(newHp.id);
                                        playSoundEffect("pop");
                                      }}
                                    >
                                      <img
                                        src={currentImg}
                                        alt="Placement existing"
                                        className="max-h-60 object-contain mx-auto select-none pointer-events-none opacity-90"
                                        referrerPolicy="no-referrer"
                                      />

                                      {(
                                        itemOverride.audioHotspots ||
                                        item.audioHotspots ||
                                        []
                                      ).map((hp, hIdx) => {
                                        const isSelected =
                                          selectedExistingHotspotId === hp.id;
                                        const isDraggingThis =
                                          draggingHotspotId === hp.id;
                                        return (
                                          <button
                                            key={hp.id}
                                            type="button"
                                            style={{
                                              left: `${hp.x}%`,
                                              top: `${hp.y}%`,
                                            }}
                                            onMouseDown={(e) => {
                                              e.stopPropagation();
                                              setDraggingHotspotId(hp.id);
                                              setSelectedExistingHotspotId(
                                                hp.id,
                                              );
                                            }}
                                            onTouchStart={(e) => {
                                              e.stopPropagation();
                                              setDraggingHotspotId(hp.id);
                                              setSelectedExistingHotspotId(
                                                hp.id,
                                              );
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedExistingHotspotId(
                                                hp.id,
                                              );
                                              playSoundEffect("click");
                                              if (hp.audioData) {
                                                const aud = new Audio(
                                                  hp.audioData,
                                                );
                                                aud
                                                  .play()
                                                  .catch((er) =>
                                                    console.error(er),
                                                  );
                                              }
                                            }}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-2 shadow-md flex items-center justify-center transition-all ${
                                              isDraggingThis
                                                ? "cursor-grabbing scale-135 ring-4 ring-amber-400 z-40 bg-amber-400 text-white"
                                                : isSelected
                                                  ? "bg-amber-500 scale-125 ring-4 ring-amber-300 z-30 cursor-grab text-white"
                                                  : "bg-indigo-600 hover:bg-indigo-500 scale-100 z-20 cursor-grab text-white"
                                            } border border-white`}
                                            title={`Ghim ${hIdx + 1}`}
                                          >
                                            <Volume2 className="w-3 h-3 text-white" />
                                            <span className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[7px] font-black px-1 rounded whitespace-nowrap">
                                              {isSpellingTopic
                                                ? `Loa ${hIdx + 1}`
                                                : `Nốt ${hIdx + 1}`}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <span className="text-[7.5px] font-bold text-slate-400 mt-1 uppercase">
                                      Bấm trực tiếp lên hình để ghim loa phát âm
                                    </span>
                                  </div>

                                  {/* Right: Audio detail manager */}
                                  <div className="md:col-span-5 flex flex-col justify-between p-3 bg-white border border-slate-200 rounded-xl min-h-[140px]">
                                    {selectedExistingHotspotId ? (
                                      (() => {
                                        const currentHpList =
                                          itemOverride.audioHotspots ||
                                          item.audioHotspots ||
                                          [];
                                        const activeHpIndex =
                                          currentHpList.findIndex(
                                            (h) =>
                                              h.id ===
                                              selectedExistingHotspotId,
                                          );
                                        const activeHp =
                                          currentHpList[activeHpIndex];
                                        if (!activeHp)
                                          return (
                                            <div className="text-center text-slate-400 font-bold text-[9px] my-auto">
                                              Chọn một ghim...
                                            </div>
                                          );

                                        return (
                                          <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                                            <div>
                                              <div className="flex items-center justify-between border-b pb-1">
                                                <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                  LOA GHIM SỐ{" "}
                                                  {activeHpIndex + 1}
                                                </span>

                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    playSoundEffect("pop");
                                                    const filteredHpList =
                                                      currentHpList.filter(
                                                        (h) =>
                                                          h.id !==
                                                          selectedExistingHotspotId,
                                                      );
                                                    const updatedOver = {
                                                      ...localOverrides,
                                                      [item.id]: {
                                                        ...itemOverride,
                                                        audioHotspots:
                                                          filteredHpList,
                                                      },
                                                    };
                                                    setLocalOverrides(
                                                      updatedOver,
                                                    );
                                                    onSaveOverrides(
                                                      updatedOver,
                                                    );
                                                    setSelectedExistingHotspotId(
                                                      null,
                                                    );
                                                  }}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition-all rounded cursor-pointer"
                                                  title="Xóa nút ghim này"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                              <p className="text-[7.5px] font-extrabold text-slate-400 mt-1 uppercase">
                                                Tọa độ: X {activeHp.x}%, Y{" "}
                                                {activeHp.y}%
                                              </p>
                                            </div>

                                            <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                              <span className="text-[8px] font-extrabold text-slate-500 uppercase">
                                                🎤 Chọn tệp giọng mẫu:
                                              </span>

                                              {activeHp.audioData ? (
                                                <div className="flex items-center justify-between gap-1.5 bg-emerald-50 border border-emerald-100 p-1 rounded">
                                                  <div className="flex items-center gap-1 overflow-hidden">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        playSoundEffect(
                                                          "click",
                                                        );
                                                        const sound = new Audio(
                                                          activeHp.audioData,
                                                        );
                                                        sound
                                                          .play()
                                                          .catch((er) =>
                                                            console.error(er),
                                                          );
                                                      }}
                                                      className="p-1 bg-emerald-555 hover:bg-emerald-600 text-white rounded-full shrink-0"
                                                    >
                                                      <Play className="w-2.5 h-2.5 fill-white" />
                                                    </button>
                                                    <span className="text-[8.5px] text-emerald-800 font-mono truncate font-extrabold">
                                                      {activeHp.audioName ||
                                                        "Ghi âm đã liên kết"}
                                                    </span>
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      playSoundEffect("pop");
                                                      const updatedHpList =
                                                        currentHpList.map(
                                                          (h) => {
                                                            if (
                                                              h.id ===
                                                              selectedExistingHotspotId
                                                            ) {
                                                              return {
                                                                ...h,
                                                                audioData:
                                                                  undefined,
                                                                audioName:
                                                                  undefined,
                                                              };
                                                            }
                                                            return h;
                                                          },
                                                        );
                                                      const updatedOver = {
                                                        ...localOverrides,
                                                        [item.id]: {
                                                          ...itemOverride,
                                                          audioHotspots:
                                                            updatedHpList,
                                                        },
                                                      };
                                                      setLocalOverrides(
                                                        updatedOver,
                                                      );
                                                      onSaveOverrides(
                                                        updatedOver,
                                                      );
                                                    }}
                                                    className="text-[8px] text-rose-500 font-bold hover:bg-rose-50 px-1 rounded cursor-pointer"
                                                  >
                                                    Xóa âm
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="space-y-1.5">
                                                  <div
                                                    onClick={() => {
                                                      const inp =
                                                        document.getElementById(
                                                          `existing-hp-uploader-${activeHp.id}`,
                                                        );
                                                      if (inp) inp.click();
                                                    }}
                                                    className="border border-dashed border-slate-300 hover:border-indigo-400 bg-white p-1 rounded-md text-[8.5px] font-black text-slate-600 text-center cursor-pointer transition-all"
                                                  >
                                                    📤 Chọn file ghi âm mới
                                                    (.mp3)
                                                  </div>

                                                  <input
                                                    id={`existing-hp-uploader-${activeHp.id}`}
                                                    type="file"
                                                    accept="audio/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                      if (
                                                        e.target.files &&
                                                        e.target.files[0]
                                                      ) {
                                                        const file =
                                                          e.target.files[0];
                                                        try {
                                                          const b64 =
                                                            await fileToBase64(
                                                              file,
                                                            );
                                                          const updatedHpList =
                                                            currentHpList.map(
                                                              (h) => {
                                                                if (
                                                                  h.id ===
                                                                  selectedExistingHotspotId
                                                                ) {
                                                                  return {
                                                                    ...h,
                                                                    audioData:
                                                                      b64,
                                                                    audioName:
                                                                      file.name,
                                                                  };
                                                                }
                                                                return h;
                                                              },
                                                            );
                                                          const updatedOver = {
                                                            ...localOverrides,
                                                            [item.id]: {
                                                              ...itemOverride,
                                                              audioHotspots:
                                                                updatedHpList,
                                                            },
                                                          };
                                                          setLocalOverrides(
                                                            updatedOver,
                                                          );
                                                          onSaveOverrides(
                                                            updatedOver,
                                                          );
                                                          playSoundEffect(
                                                            "success",
                                                          );
                                                        } catch (ex) {
                                                          console.error(ex);
                                                        }
                                                      }
                                                    }}
                                                  />

                                                  <input
                                                    type="text"
                                                    value={
                                                      activeHp.audioData || ""
                                                    }
                                                    onChange={(e) => {
                                                      const val =
                                                        e.target.value;
                                                      const updatedHpList =
                                                        currentHpList.map(
                                                          (h) => {
                                                            if (
                                                              h.id ===
                                                              selectedExistingHotspotId
                                                            ) {
                                                              return {
                                                                ...h,
                                                                audioData:
                                                                  val ||
                                                                  undefined,
                                                                audioName: val
                                                                  ? "Liên kết dán"
                                                                  : undefined,
                                                              };
                                                            }
                                                            return h;
                                                          },
                                                        );
                                                      const updatedOver = {
                                                        ...localOverrides,
                                                        [item.id]: {
                                                          ...itemOverride,
                                                          audioHotspots:
                                                            updatedHpList,
                                                        },
                                                      };
                                                      setLocalOverrides(
                                                        updatedOver,
                                                      );
                                                      onSaveOverrides(
                                                        updatedOver,
                                                      );
                                                    }}
                                                    placeholder="Nhập URL file ghi âm..."
                                                    className="w-full text-[8.5px] p-1.5 border rounded"
                                                  />
                                                </div>
                                              )}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedExistingHotspotId(
                                                  null,
                                                )
                                              }
                                              className="w-full bg-slate-100 border text-[8.5px] font-black text-slate-550 hover:bg-slate-200 py-1.5 rounded-lg cursor-pointer"
                                            >
                                              XONG ĐIỂM NÀY
                                            </button>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div className="my-auto text-center font-bold text-slate-400 text-[9px] space-y-1">
                                        <Volume2 className="w-5 h-5 text-indigo-300 mx-auto" />
                                        <p>
                                          Cấu hình Audio cho điểm ghim đang
                                          chọn.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
