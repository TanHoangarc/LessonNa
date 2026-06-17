/**
 * Helper to play Vietnamese Text-to-Speech natively in the browser.
 * Adjusts rate and pitch to sound cute, slow, and easy to follow for children aged 4-6.
 */
export const playVietnameseText = (
  text: string, 
  accent: 'north' | 'south' = 'north', 
  onEnd?: () => void
) => {
  // Try to use a high-quality, native Vietnamese Google Translate TTS web driver first.
  // This guarantees an incredibly clear, 100% authentic native speaker accent on all platforms,
  // bypassing broken, robotic, or foreign-sounding default browser voice synthesis.
  try {
    const cleanText = text.trim();
    if (cleanText.length > 0) {
      // Standard stable Google Translate TTS service url
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      
      const audio = new Audio();
      audio.src = ttsUrl;
      // Kids need a slightly slower pace to follow syllables correctly
      audio.defaultPlaybackRate = 0.82;
      audio.playbackRate = 0.82;
      
      audio.onended = () => {
        if (onEnd) onEnd();
      };
      
      audio.onerror = (e) => {
        console.warn("Google TTS failed, falling back to Web Speech Synthesis", e);
        // Fallback to local speech synthesis if the URL is blocked or offline
        fallbackSpeechSynthesis(cleanText, accent, onEnd);
      };
      
      audio.play().catch(err => {
        console.warn("Direct audio play failed due to browser interaction policy, trying Web Speech Synthesis instead.", err);
        fallbackSpeechSynthesis(cleanText, accent, onEnd);
      });
      return;
    }
  } catch (err) {
    console.warn("Failed to play via custom native web audio driver:", err);
  }

  // Final fallback
  fallbackSpeechSynthesis(text, accent, onEnd);
};

// Extracted internal fallback for SpeechSynthesis
const fallbackSpeechSynthesis = (
  text: string,
  accent: 'north' | 'south' = 'north',
  onEnd?: () => void
) => {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.78; 
  utterance.pitch = 1.25;

  let voices = window.speechSynthesis.getVoices();

  const setVoiceAndSpeak = () => {
    const viVoices = voices.filter(v => v.lang.startsWith('vi') || v.lang === 'vi-VN');
    
    if (viVoices.length > 0) {
      if (accent === 'south') {
        const southVoice = viVoices.find(v => 
          v.name.toLowerCase().includes('south') || 
          v.name.toLowerCase().includes('hồ chí minh') || 
          v.name.toLowerCase().includes('hcm')
        );
        utterance.voice = southVoice || viVoices[0];
      } else {
        const northVoice = viVoices.find(v => 
          v.name.toLowerCase().includes('north') || 
          v.name.toLowerCase().includes('hà nội') || 
          v.name.toLowerCase().includes('hanoi')
        );
        utterance.voice = northVoice || viVoices[0];
      }
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = () => onEnd();
    }
    window.speechSynthesis.speak(utterance);
  };

  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      setVoiceAndSpeak();
    };
  } else {
    setVoiceAndSpeak();
  }
};

/**
 * Triggers a cute audio success or fail sound effect using standard Web Audio API synth
 * so we do not have to rely on external MP3 assets which might fail to fetch.
 */
export const playSoundEffect = (type: 'success' | 'click' | 'victory' | 'pop' | 'wrong') => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'success') {
      // Arpeggio up for correct matching
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'victory') {
      // High energetic success sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392.00, audioCtx.currentTime); // G4
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.1); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.4); // C6
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } else if (type === 'click') {
      // Simple pop bubble sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'pop') {
      // Wet popping sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'wrong') {
      // Clean cute warning sound - Double beep down-pitch
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
      osc.frequency.setValueAtTime(165, audioCtx.currentTime + 0.15); // E3
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    }
  } catch (err) {
    console.error("Audio Synthesis error:", err);
  }
};
