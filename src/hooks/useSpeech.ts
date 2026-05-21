import { useState, useCallback, useRef, useEffect } from 'react';
import { createTTS, type TTS } from 'react-native-sherpa-onnx/tts';
import { assetModelPath } from 'react-native-sherpa-onnx';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechVoice = 'host' | 'girl' | 'lady';

interface Note {
  id: string;
  title: string;
  content: string;
}

// Kokoro multi-lang voice IDs for Chinese
// These are the speaker IDs in the kokoro-int8-multi-lang-v1_1 model
const VOICE_IDS: Record<SpeechVoice, number> = {
  host: 0,    // 男声（成熟）
  girl: 50,   // 女声（活泼）
  lady: 100,  // 女声（优雅）
};

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.3,
};

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const ttsRef = useRef<TTS | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);

  // Initialize TTS engine
  useEffect(() => {
    const initTTS = async () => {
      try {
        ttsRef.current = await createTTS({
          modelConfig: assetModelPath('models/kokoro-int8-multi-lang-v1_1'),
          modelType: 'kokoro',
        });
        console.log('TTS initialized successfully');
      } catch (err) {
        console.error('TTS init failed:', err);
      }
    };
    initTTS();

    return () => {
      soundRef.current?.unloadAsync();
      ttsRef.current?.shutdown();
    };
  }, []);

  const playNote = useCallback(async (index: number) => {
    if (index < 0 || index >= notes.length || !ttsRef.current) return;
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

      // Generate audio with sherpa-onnx
      const audio = await ttsRef.current.generate({
        text,
        sid: VOICE_IDS[voice],
        speed: RATE_MAP[rate],
      });

      // Save audio to temp file
      const audioUri = `${FileSystem.cacheDirectory}tts_${note.id}.wav`;
      await FileSystem.writeAsStringAsync(audioUri, audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Play the audio
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
      console.error('TTS play error:', err);
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
