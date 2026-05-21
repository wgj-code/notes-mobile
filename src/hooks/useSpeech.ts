import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechVoice = 'host' | 'girl' | 'lady';

interface Note {
  id: string;
  title: string;
  content: string;
}

// Voice config: pitch values to differentiate styles
const PITCH_MAP: Record<SpeechVoice, number> = {
  host: 0.7,   // 低沉成熟
  girl: 1.3,   // 活泼高音
  lady: 1.0,   // 正常
};

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.6,
  normal: 1.0,
  fast: 1.4,
};

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const playNote = useCallback((index: number) => {
    if (index < 0 || index >= notes.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
    isSpeakingRef.current = true;

    const note = notes[index];
    const text = `${note.title}。${note.content}`;

    Speech.speak(text, {
      rate: RATE_MAP[rate],
      pitch: PITCH_MAP[voice],
      language: 'zh-CN',
      onDone: () => {
        isSpeakingRef.current = false;
        setIsPlaying(false);
        if (mode === 'loop') {
          playNote(index);
        } else if (mode === 'sequential' && index < notes.length - 1) {
          playNote(index + 1);
        } else if (mode === 'random') {
          const nextIndex = Math.floor(Math.random() * notes.length);
          playNote(nextIndex);
        }
      },
    });
  }, [notes, rate, mode, voice]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      isSpeakingRef.current = false;
    } else {
      playNote(currentIndex);
    }
  }, [isPlaying, currentIndex, playNote]);

  const playAtIndex = useCallback((index: number) => {
    Speech.stop();
    playNote(index);
  }, [playNote]);

  const playPrev = useCallback(() => {
    Speech.stop();
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : notes.length - 1;
    playNote(prevIndex);
  }, [currentIndex, notes.length, playNote]);

  const playNext = useCallback(() => {
    Speech.stop();
    const nextIndex = currentIndex < notes.length - 1 ? currentIndex + 1 : 0;
    playNote(nextIndex);
  }, [currentIndex, notes.length, playNote]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsPlaying(false);
    isSpeakingRef.current = false;
    setCurrentIndex(0);
  }, []);

  return {
    isPlaying,
    currentIndex,
    mode,
    rate,
    voice,
    setMode,
    setRate,
    setVoice,
    togglePlay,
    playAtIndex,
    playPrev,
    playNext,
    stop,
  };
}
