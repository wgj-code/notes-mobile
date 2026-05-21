import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { createClient } from '../lib/supabase';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechVoice = 'host' | 'girl' | 'lady';

interface Note {
  id: string;
  title: string;
  content: string;
}

const RATE_MAP: Record<SpeechRate, string> = {
  slow: 'slow',
  normal: 'normal',
  fast: 'fast',
};

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playNote = useCallback(async (index: number) => {
    if (index < 0 || index >= notes.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;

    try {
      // Stop previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const note = notes[index];
      const text = `${note.title}。${note.content}`;

      // Call Edge Function to get audio
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('tts', {
        body: { text, voice, rate: RATE_MAP[rate] },
      });

      if (error) throw error;

      // Save audio to temp file and play
      const audioUri = `${FileSystem.cacheDirectory}tts_${note.id}.mp3`;
      const base64 = typeof data === 'string' ? data : await (data as Blob).text?.() ?? '';
      await FileSystem.writeAsStringAsync(audioUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && isPlayingRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          if (mode === 'loop') {
            playNote(index);
          } else if (mode === 'sequential' && index < notes.length - 1) {
            playNote(index + 1);
          } else if (mode === 'random') {
            const nextIndex = Math.floor(Math.random() * notes.length);
            playNote(nextIndex);
          }
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error('TTS error:', err);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [notes, rate, mode, voice]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      playNote(currentIndex);
    }
  }, [isPlaying, currentIndex, playNote]);

  const playPrev = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : notes.length - 1;
    playNote(prevIndex);
  }, [currentIndex, notes.length, playNote]);

  const playNext = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
    const nextIndex = currentIndex < notes.length - 1 ? currentIndex + 1 : 0;
    playNote(nextIndex);
  }, [currentIndex, notes.length, playNote]);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
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
    playPrev,
    playNext,
    stop,
  };
}
