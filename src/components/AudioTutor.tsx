import React, { useState, useRef, useEffect } from 'react';
import { LessonItem, SpeechAnalysisResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { playVietnameseText, playSoundEffect } from '../utils/audioHelper';
import * as LucideIcons from 'lucide-react';

interface AudioTutorProps {
  key?: React.Key;
  item: LessonItem;
  accent: 'north' | 'south';
  onCompletedLessons: (earnedStars: number, earnedCoins: number) => void;
  onBackToTopic: () => void;
  onBackToPuzzle: () => void;
}

export default function AudioTutor({
  item,
  accent,
  onCompletedLessons,
  onBackToTopic,
  onBackToPuzzle
}: AudioTutorProps) {
  // Sound states
  const [isPlayingTutor, setIsPlayingTutor] = useState<boolean>(false);
  const [isPlayingKid, setIsPlayingKid] = useState<boolean>(false);

  // Recording audio states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  // Analysis / Result states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<SpeechAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for audio media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Clean-up refs on unmount or item change
  useEffect(() => {
    // If we have an existing microphone stream, close it
    return () => {
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [micStream]);

  useEffect(() => {
    setTranscript('');
    setUserAudioUrl(null);
    setReviewResult(null);
    setErrorMessage(null);
    setIsRecording(false);
  }, [item]);

  // Play Native Teacher model voice or custom audio clip
  const handlePlayTutor = () => {
    setIsPlayingTutor(true);
    playSoundEffect('click');
    if (item.customAudio) {
      const audio = new Audio(item.customAudio);
      audio.onended = () => {
        setIsPlayingTutor(false);
      };
      audio.onerror = () => {
        // Fallback to text synthesis
        playVietnameseText(item.sentence, accent, () => {
          setIsPlayingTutor(false);
        });
      };
      audio.play().catch(e => {
        console.error("Custom tutor audio play error:", e);
        playVietnameseText(item.sentence, accent, () => {
          setIsPlayingTutor(false);
        });
      });
    } else {
      playVietnameseText(item.sentence, accent, () => {
        setIsPlayingTutor(false);
      });
    }
  };

  // Playback kid's audio recording side-by-side
  const handlePlayKidAudio = () => {
    if (!userAudioUrl) return;
    setIsPlayingKid(true);
    playSoundEffect('click');
    const audio = new Audio(userAudioUrl);
    audio.onended = () => {
      setIsPlayingKid(false);
    };
    audio.onerror = () => {
      setIsPlayingKid(false);
    };
    audio.play().catch(e => {
      console.error("Kid audio play error:", e);
      setIsPlayingKid(false);
    });
  };

  // Initialize Speech Recognition if supported
  const initSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("SpeechRecognition is not natively supported in this browser.");
      return null;
    }

    const rec = new SpeechRecognitionAPI();
    rec.lang = 'vi-VN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      console.log("Transcribed Vietnamese text:", speechToText);
      setTranscript(speechToText);
    };

    rec.onerror = (event: any) => {
      console.warn("SpeechRecognition error:", event.error);
      if (event.error === 'no-speech') {
        // Just silent, safe to ignore
      }
    };

    return rec;
  };

  // Start Mic Recording
  const startRecording = async () => {
    playSoundEffect('click');
    setTranscript('');
    setReviewResult(null);
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      // Create Media Recorder
      // Try to fallback if webm is not supported (e.g. on iOS/Safari)
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
        if (!MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: '' }; // Fallback to browser default
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setUserAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop()); // close microphone track immediately
      };

      // Set up and start Web Speech Recognition
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }

      // Start recording
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Recording Mic Permission Denied:", err);
      // Give a highly child-friendly warning message
      setErrorMessage("Bé ơi, điện thoại hoặc máy tính đang khóa micro của bé rồi nè. Nhờ ba mẹ nhấn cho phép sử dụng micro để Cô Chích Chòe nghe thấy giọng bé nhé! 🌸");
    }
  };

  // Stop Mic Recording & analyze spoken transcript with Gemini
  const stopRecording = () => {
    if (!isRecording) return;
    
    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    setIsRecording(false);
    playSoundEffect('pop');

    // Trigger processing (wait slightly for speech recognition onresult state to propagate)
    setTimeout(() => {
      handleSubmitSpeech();
    }, 1200);
  };

  // Analyze transcript with Backend Gemini Endpoint /api/speech-review
  const handleSubmitSpeech = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    // Read current transcript state or capture
    // Set a tiny fallback if SpeechRecognition was denied/failed, but they still recorded audio
    setTranscript(prevTranscript => {
      const activeTranscript = prevTranscript || "";
      
      // Call endpoint
      fetch('/api/speech-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSentence: item.sentence,
          spokenTranscript: activeTranscript
        })
      })
      .then(res => res.json())
      .then((data: any) => {
        setReviewResult({
          confidence: data.score / 100,
          transcript: activeTranscript || "(Chưa nhận dạng rõ được chữ)",
          isCorrect: data.isCorrect,
          score: data.score,
          matchedWords: data.matchedWords || [],
          missingWords: data.missingWords || [],
          aiFeedback: data.encouragingFeedback
        });

        if (data.isCorrect) {
          playSoundEffect('victory');
        } else {
          playSoundEffect('pop');
        }
      })
      .catch(err => {
        console.error("Error submitting speech comparison:", err);
        setErrorMessage("Ồ, có chút trục trặc nhỏ trên đường truyền rồi bé ơi. Hãy bấm thử lại hoặc nói lại lần nữa nhé con! 🧡");
      })
      .finally(() => {
        setIsProcessing(false);
      });

      return activeTranscript;
    });
  };

  // Safe reward claims
  const handleClaimReward = () => {
    if (!reviewResult) return;
    playSoundEffect('victory');
    // Calculate rewards
    const starCount = reviewResult.score >= 80 ? 3 : (reviewResult.score >= 50 ? 2 : 1);
    const coinCount = reviewResult.score >= 80 ? 15 : 5;
    onCompletedLessons(starCount, coinCount);
  };

  // Play audio of specific single Vietnamese word
  const playWordAudio = (word: string) => {
    playVietnameseText(word, accent);
  };

  return (
    <div className="bg-white rounded-[40px] border-l-2 border-r-2 border-t-2 border-gray-150 border-b-8 border-gray-200 p-6 md:p-8 max-w-2xl mx-auto shadow-sm" id="audio-tutor-block">
      {/* Step Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBackToPuzzle}
          className="flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-800 bg-white border-2 border-amber-200 border-b-4 border-b-amber-400 px-4 py-2 rounded-xl transition-all"
        >
          <LucideIcons.ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>Về phần ghép chữ</span>
        </button>

        <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest bg-rose-50 border-2 border-rose-200 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
          <LucideIcons.Mic className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>TRÒ CHƠI 2: BÉ TẬP PHÁT ÂM</span>
        </span>
      </div>

      {/* Target prompt */}
      <div className="text-center mb-6 bg-amber-50/40 p-6 rounded-3xl border-2 border-amber-100">
        {item.customImage ? (
          <div className="mb-4 flex justify-center">
            <img 
              src={item.customImage} 
              alt={item.sentence} 
              className="max-h-36 max-w-full rounded-2xl border-4 border-white shadow-md object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="text-5xl mb-2 filter drop-shadow-sm">{item.emoji}</div>
        )}
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-sans">
          Bé hãy phát âm thật to & rõ ràng nhé:
        </h4>
        
        {/* Large readable target text */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-900 mt-2 leading-tight tracking-tight font-sans selection:bg-teal-100">
          {item.sentence}
        </h2>

        {/* Phonetics / Sẵn chữ */}
        {item.phoneticsGuide && (
          <div className="bg-white text-amber-800 font-mono text-sm py-1.5 px-4 rounded-xl inline-flex items-center gap-1.5 mt-3 border-2 border-amber-200">
            <LucideIcons.VolumeX className="w-4 h-4 text-amber-500" />
            <span>Phát âm mẫu:</span>
            <strong>{item.phoneticsGuide}</strong>
          </div>
        )}
      </div>

      {/* Side-by-side comparison: Native Teacher vs Child recording */}
      <div className="grid grid-cols-2 gap-4 mb-6" id="audio-side-side-comparison">
        {/* Native Teacher Playback */}
        <motion.div 
          whileTap={{ scale: 0.97 }}
          onClick={handlePlayTutor}
          className={`border-2 border-l-2 border-r-2 border-t-2 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isPlayingTutor 
              ? 'bg-emerald-50 border-emerald-400 border-b-4 border-b-emerald-600 text-emerald-850' 
              : 'bg-white border-slate-200 border-b-4 border-b-slate-300 text-emerald-700 hover:bg-slate-50'
          }`}
          id="native-teacher-audio-box"
        >
          <div className={`p-3 bg-emerald-500 text-white rounded-full ${isPlayingTutor ? 'animate-pulse' : ''} border-b-2 border-emerald-700`}>
            {isPlayingTutor ? <LucideIcons.AudioLines className="w-6 h-6 stroke-[3]" /> : <LucideIcons.Volume2 className="w-6 h-6 stroke-[3]" />}
          </div>
          <span className="font-black text-sm mt-3 font-sans uppercase tracking-tight">1. Cô Giáo Đọc</span>
          <span className="text-[10px] text-emerald-600 font-extrabold italic mt-0.5">(Nghe giọng mẫu)</span>
        </motion.div>

        {/* Baby Voice Playback */}
        <motion.div 
          whileTap={{ scale: 0.97 }}
          onClick={handlePlayKidAudio}
          className={`border-2 border-l-2 border-r-2 border-t-2 rounded-2xl p-4 flex flex-col items-center justify-center transition-all ${
            userAudioUrl 
              ? isPlayingKid 
                ? 'bg-indigo-50 border-indigo-400 border-b-4 border-b-indigo-600 text-indigo-850 cursor-pointer' 
                : 'bg-white border-slate-200 border-b-4 border-b-slate-300 text-indigo-750 cursor-pointer hover:bg-slate-50'
              : 'bg-gray-50 border-gray-150 text-gray-300 cursor-not-allowed select-none'
          }`}
          id="baby-recorded-audio-box"
        >
          <div className={`p-3 rounded-full ${userAudioUrl ? 'bg-indigo-500 text-white border-b-2 border-indigo-700' : 'bg-gray-250 text-gray-400'}`}>
            {isPlayingKid ? <LucideIcons.AudioLines className="w-6 h-6 stroke-[3]" /> : <LucideIcons.Baby className="w-6 h-6 stroke-[3]" />}
          </div>
          <span className="font-black text-sm mt-3 font-sans uppercase tracking-tight">2. Bé Phát Âm</span>
          <span className="text-[10px] text-gray-400 font-extrabold italic mt-0.5">
            {userAudioUrl ? "(Nhấn để nghe lại)" : "(Chưa có ghi âm)"}
          </span>
        </motion.div>
      </div>

      {/* Main Microphone Button */}
      <div className="flex flex-col items-center justify-center mb-8 relative" id="mic-container-zone">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
          {isRecording ? "🔴 Thả tay để hoàn thành phát âm" : "🎤 Bấm để ghi âm và nói"}
        </label>

        <div className="relative flex items-center justify-center">
          {/* Pulsing wave animation during recording */}
          {isRecording && (
            <>
              <motion.div 
                animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0.1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute w-32 h-32 bg-green-200 rounded-full pointer-events-none"
              />
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.2, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
                className="absolute w-32 h-32 bg-green-300 rounded-full pointer-events-none"
              />
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-32 h-32 rounded-full flex items-center justify-center border-b-8 shadow-xl transition-all cursor-pointer active:translate-y-1 outline-none z-10 ${
              isRecording 
                ? 'bg-red-500 border-red-700 text-white' 
                : 'bg-green-500 border-green-700 text-white hover:brightness-105'
            }`}
          >
            {isRecording ? (
              <LucideIcons.Square className="w-12 h-12 fill-white text-white" />
            ) : (
              <span className="text-white text-5xl">🎤</span>
            )}
          </motion.button>
        </div>

        {isRecording && (
          <span className="text-rose-500 font-bold font-sans text-sm animate-pulse mt-4">
            Đang ghi âm giọng bé xinh... Cô đang nghe nè! 🎙️
          </span>
        )}
      </div>

      {/* Processing Animation */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-6 text-center flex flex-col items-center gap-3"
            id="processing-speech-card"
          >
            <LucideIcons.RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <div>
              <p className="text-indigo-800 font-bold text-sm">Cô Chích Chòe đang chấm giọng bé...</p>
              <p className="text-indigo-600 text-xs mt-1 italic">Con chờ một tẹo nhé, cô nghe rất kĩ lưỡng đấy! 🐤</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl p-4 mb-6">
          {errorMessage}
        </div>
      )}

      {/* Review Results */}
      {reviewResult && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`border-4 rounded-3xl p-5 mb-6 ${
            reviewResult.isCorrect 
              ? 'bg-emerald-50 border-emerald-300' 
              : 'bg-amber-50 border-amber-300'
          }`}
          id="speech-review-result-panel"
        >
          {/* Top Score Indicator */}
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-black/5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">
                {reviewResult.score >= 80 ? "🏆" : (reviewResult.score >= 50 ? "⭐️" : "💪")}
              </span>
              <div>
                <h5 className="font-bold text-gray-800 text-base">Điểm giọng nói của Bé</h5>
                <p className="text-xs text-gray-500">Giọng nói tự nhiên rành mạch</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/80 border border-black/5 px-4 py-1.5 rounded-2xl">
              <span className="text-xs font-semibold text-gray-400">Độ chuẩn:</span>
              <span className={`text-xl font-black ${reviewResult.isCorrect ? 'text-emerald-600' : 'text-amber-600'}`}>
                {reviewResult.score}/100
              </span>
            </div>
          </div>

          {/* Sửa từ vựng - Word feedback */}
          <div className="mb-4">
            <p className="text-xs font-bold text-gray-400 bg-white/40 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider mb-2">
              Từ bé phát âm (Nhấn từng chữ để nghe phát âm):
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.sentence.split(/\s+/).map((word, i) => {
                // Check if word is matched (ignoring punctuation & case)
                const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
                const isMatched = reviewResult.matchedWords.some(w => w.toLowerCase().includes(cleanWord) || cleanWord.includes(w.toLowerCase()));

                return (
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    onClick={() => playWordAudio(word)}
                    key={`${word}-${i}`}
                    className={`cursor-pointer px-3 py-1.5 rounded-xl font-bold text-sm border flex items-center gap-1 transition-all shadow-xs ${
                      isMatched
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-250 hover:bg-rose-100'
                    }`}
                  >
                    <span>{word}</span>
                    {isMatched ? (
                      <LucideIcons.Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <LucideIcons.HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </motion.span>
                );
              })}
            </div>
          </div>

          {/* AI encourages text */}
          <div className="bg-white/85 p-4 rounded-2xl border border-black/5 flex gap-3 relative">
            <div className="text-3xl text-sky-400 shrink-0 select-none">💬</div>
            <div className="text-left">
              <h6 className="font-extrabold text-indigo-900 text-sm mb-1 flex items-center gap-1.5">
                <span>Cô giáo Chích Chòe nhận xét:</span>
              </h6>
              <p className="text-gray-700 text-sm font-medium leading-relaxed font-sans whitespace-pre-line">
                {reviewResult.aiFeedback}
              </p>
            </div>
          </div>

          {/* Action to submit progress and finish lesson */}
          <div className="flex justify-center mt-5">
            <button
              onClick={handleClaimReward}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-md flex items-center gap-2 transform transition-all active:scale-95 border-b-4 border-orange-700 text-base animate-bounce-slow outline-none"
            >
              <span>Xong rồi! Nhận sao vàng ⭐️</span>
              <LucideIcons.ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
