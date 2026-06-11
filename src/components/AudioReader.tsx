import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Square, Sparkles } from "lucide-react";

interface AudioReaderProps {
  textToRead: string;
  isDark: boolean;
}

export default function AudioReader({ textToRead, isDark }: AudioReaderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(0.85); // slightly slower by default for learning
  const [supported, setSupported] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      
      const updateVoices = () => {
        if (synthRef.current) {
          const loaded = synthRef.current.getVoices();
          setVoices(loaded);
        }
      };

      updateVoices();
      if (typeof window.speechSynthesis.addEventListener === "function") {
        window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      } else {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    } else {
      setSupported(false);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Cancel speech on unmount or text change
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [textToRead]);

  const speak = () => {
    if (!supported || !synthRef.current) return;

    if (isPaused) {
      synthRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    // Cancel current
    synthRef.current.cancel();

    // Clean text: strip speaker names if present in conversations
    const cleanText = textToRead
      .replace(/^[a-zA-Z\s]+:/gm, "") // remove "Jean:" style speakers
      .replace(/[«»"]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    // Set voice: prefer fr-FR (French)
    utterance.lang = "fr-FR";
    
    // Find a premium native French voice by scoring candidates
    const activeVoices = voices.length ? voices : (synthRef.current ? synthRef.current.getVoices() : []);
    
    let bestFrVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -1;

    for (const voice of activeVoices) {
      let score = 0;
      const langLower = voice.lang.toLowerCase();
      const nameLower = voice.name.toLowerCase();

      if (langLower === "fr-fr") {
        score += 100;
      } else if (langLower.startsWith("fr-")) {
        score += 50;
      } else if (langLower.startsWith("fr")) {
        score += 20;
      }

      if (nameLower.includes("french") || nameLower.includes("français") || nameLower.includes("francais")) {
        score += 30;
      }

      // Prefer premium or Google-generated high quality voices over basic ones
      if (nameLower.includes("premium") || nameLower.includes("natural") || nameLower.includes("neural") || nameLower.includes("google")) {
        score += 10;
      }

      if (score > bestScore && score > 0) {
        bestScore = score;
        bestFrVoice = voice;
      }
    }

    if (bestFrVoice) {
      utterance.voice = bestFrVoice;
      utterance.lang = bestFrVoice.lang;
    } else {
      utterance.lang = "fr-FR";
    }

    utterance.pitch = pitch;
    utterance.rate = rate;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      // Don't error out on clean up cancel
      if (e.error !== "interrupted") {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    setIsPlaying(true);
    setIsPaused(false);
    synthRef.current.speak(utterance);
  };

  const pause = () => {
    if (!supported || !synthRef.current) return;
    synthRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
  };

  const stop = () => {
    if (!supported || !synthRef.current) return;
    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!supported) return null;

  return (
    <div
      id="audio-reader-controls"
      className="flex flex-col gap-3 p-4 bg-[#faf8f5] dark:bg-[#161616] border border-[#e3dfd9] dark:border-[#2a2a2a] rounded-2xl transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#f27d26]" />
          <span className="text-xs font-serif italic font-semibold text-[#1c1c1a] dark:text-white">
            Audio Assistant de Lecture
          </span>
        </div>
        
        {/* Simple Audio Equalizer Animation */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="w-0.5 bg-[#f27d26] rounded-full animate-bounce"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDuration: `${0.4 + i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Core Controls */}
        <div className="flex items-center gap-1.5">
          {!isPlaying ? (
            <button
              id="speech-play-btn"
              onClick={speak}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-black dark:bg-white text-white dark:text-black py-1.5 px-3 rounded-lg hover:opacity-85 transition-opacity"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isPaused ? "Reprendre" : "Écouter"}</span>
            </button>
          ) : (
            <button
              id="speech-pause-btn"
              onClick={pause}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider border border-black dark:border-white text-black dark:text-white py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              id="speech-stop-btn"
              onClick={stop}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Arrêter"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>

        {/* Speed / Rate control */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider">
            Vitesse: {rate.toFixed(2)}x
          </label>
          <input
            id="speech-rate-slider"
            type="range"
            min="0.5"
            max="1.2"
            step="0.05"
            value={rate}
            onChange={(e) => {
              setRate(parseFloat(e.target.value));
              if (isPlaying) {
                // Restart with new rate instantly
                setTimeout(() => speak(), 50);
              }
            }}
            className="w-20 md:w-24 h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#f27d26]"
          />
        </div>
      </div>
    </div>
  );
}
