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

// Chinese voice name patterns to match for each style
const VOICE_KEYWORDS: Record<SpeechVoice, string[]> = {
  host: ['Yunxi', 'yunxi', 'male', '男'],
  girl: ['Xiaoxiao', 'xiaoxiao', 'female', '女'],
  lady: ['Xiaohan', 'xiaohan', 'female', '女'],
};

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.6,
  normal: 1.0,
  fast: 1.4,
};

const PITCH_MAP: Record<SpeechVoice, number> = {
  host: 0.8,
  girl: 1.2,
  lady: 1.0,
};

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const isSpeakingRef = useRef(false);
  const availableVoicesRef = useRef<any[]>([]);

  // Enumerate available voices on mount
  useEffect(() => {
    Speech.getAvailableVoicesAsync().then((voices) => {
      availableVoicesRef.current = voices;
      console.log('Available voices:', voices.map((v) => `${v.identifier} (${v.name})`).join(', '));
    });
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const findBestVoice = useCallback((style: SpeechVoice): string | undefined => {
    const keywords = VOICE_KEYWORDS[style];
    const voices = availableVoicesRef.current;
    // Try to find a matching Chinese voice by name or identifier
    for (const kw of keywords) {
      const match = voices.find((v) => {
        const lang = v.language || '';
        const id = v.identifier || '';
        const name = v.name || '';
        return lang.startsWith('zh') && (id.toLowerCase().includes(kw.toLowerCase()) || name.toLowerCase().includes(kw.toLowerCase()));
      });
      if (match) return match.identifier;
    }
    // Fallback: any Chinese voice
    const chinese = voices.find((v) => (v.language || '').startsWith('zh'));
    return chinese?.identifier;
  }, []);

  const playNote = useCallback((index: number) => {
    if (index < 0 || index >= notes.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
    isSpeakingRef.current = true;

    const note = notes[index];
    const text = `${note.title}。${note.content}`;

    const voiceId = findBestVoice(voice);

    Speech.speak(text, {
      rate: RATE_MAP[rate],
      pitch: PITCH_MAP[voice],
      language: 'zh-CN',
      voice: voiceId,
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
  }, [notes, rate, mode, voice, findBestVoice]);

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
