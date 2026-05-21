import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.5,
  normal: 1.0,
  fast: 1.5,
};

interface Note {
  id: string;
  title: string;
  content: string;
}

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
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
    const text = `${note.title}. ${note.content}`;

    Speech.speak(text, {
      rate: RATE_MAP[rate],
      language: 'zh-CN',
      onDone: () => {
        isSpeakingRef.current = false;
        setIsPlaying(false);
        // Auto-advance based on mode
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
  }, [notes, rate, mode]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      Speech.stop();
      setIsPlaying(false);
      isSpeakingRef.current = false;
    } else {
      playNote(currentIndex);
    }
  }, [isPlaying, currentIndex, playNote]);

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
    setMode,
    setRate,
    togglePlay,
    playPrev,
    playNext,
    stop,
  };
}
