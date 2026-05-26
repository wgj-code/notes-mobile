import { useState, useCallback, useRef, useEffect } from 'react';
import { createStreamingTTS, type StreamingTtsEngine } from 'react-native-sherpa-onnx/tts';
import { assetModelPath } from 'react-native-sherpa-onnx';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechVoice = 'host' | 'girl' | 'lady';

interface Note { id: string; title: string; content: string; }

// Kokoro multi-lang: 103 speakers (0-102). Selected from voice survey.
// 62: 成熟男主持 40: 东北老妹 48: 成熟御姐
const VOICE_IDS: Record<SpeechVoice, number> = { host: 62, girl: 40, lady: 48 };
const RATE_MAP: Record<SpeechRate, number> = { slow: 0.7, normal: 1.0, fast: 1.3 };

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const [ttsReady, setTtsReady] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const ttsRef = useRef<StreamingTtsEngine | null>(null);
  const controllerRef = useRef<{ cancel(): Promise<void> } | null>(null);
  const isPlayingRef = useRef(false);
  const currentNoteRef = useRef<{ index: number; mode: PlayMode; rate: SpeechRate; voice: SpeechVoice } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        ttsRef.current = await createStreamingTTS({
          modelPath: assetModelPath('models/kokoro-int8-multi-lang-v1_1'),
          modelType: 'kokoro',
          modelOptions: {
            kokoro: {
              noiseScale: 0.667,
              noiseScaleW: 0.8,
              lengthScale: 1.0,
            },
          },
        });
        setTtsReady(true);
      } catch (err: any) {
        const msg = err?.message || String(err);
        console.error('TTS init failed:', msg);
        setTtsError(msg);
      }
    })();
    return () => {
      ttsRef.current?.destroy();
    };
  }, []);

  const playNote = useCallback(async (index: number) => {
    if (index < 0 || index >= notes.length || !ttsRef.current) return;

    // Cancel any ongoing stream
    if (controllerRef.current) {
      await controllerRef.current.cancel();
      controllerRef.current = null;
    }
    await ttsRef.current.stopPcmPlayer();

    setCurrentIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;

    const note = notes[index];
    const text = `${note.title}。${note.content}`;
    const currentVoice = voice;
    const currentRate = rate;
    const currentMode = mode;

    // Save snapshot for the next-note callback (avoids stale closure)
    currentNoteRef.current = { index, mode: currentMode, rate: currentRate, voice: currentVoice };

    try {
      // Start native PCM player
      const sampleRate = await ttsRef.current.getSampleRate();
      await ttsRef.current.startPcmPlayer(sampleRate, 1);

      // Stream generation — audio plays as chunks arrive
      const controller = await ttsRef.current.generateSpeechStream(
        text,
        { sid: VOICE_IDS[currentVoice], speed: RATE_MAP[currentRate] },
        {
          onChunk: (chunk) => {
            if (isPlayingRef.current && chunk.samples.length > 0) {
              ttsRef.current?.writePcmChunk(chunk.samples);
            }
          },
          onEnd: () => {
            if (!isPlayingRef.current) return;
            isPlayingRef.current = false;
            setIsPlaying(false);
            ttsRef.current?.stopPcmPlayer();

            // Auto-advance to next note
            const snap = currentNoteRef.current;
            if (!snap) return;
            if (snap.mode === 'loop') playNote(snap.index);
            else if (snap.mode === 'sequential' && snap.index < notes.length - 1) playNote(snap.index + 1);
            else if (snap.mode === 'random') playNote(Math.floor(Math.random() * notes.length));
          },
          onError: (event) => {
            console.error('TTS stream error:', event.message);
            isPlayingRef.current = false;
            setIsPlaying(false);
            ttsRef.current?.stopPcmPlayer();
          },
        },
      );
      controllerRef.current = controller;
    } catch (err: any) {
      console.error('TTS error:', err?.message || err);
      isPlayingRef.current = false;
      setIsPlaying(false);
      ttsRef.current?.stopPcmPlayer();
    }
  }, [notes, rate, mode, voice]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      // Pause: cancel stream + stop player
      if (controllerRef.current) {
        await controllerRef.current.cancel();
        controllerRef.current = null;
      }
      await ttsRef.current?.stopPcmPlayer();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      playNote(currentIndex);
    }
  }, [isPlaying, currentIndex, playNote]);

  const playAtIndex = useCallback((i: number) => {
    playNote(i);
  }, [playNote]);

  const playPrev = useCallback(() => {
    playNote(currentIndex > 0 ? currentIndex - 1 : notes.length - 1);
  }, [currentIndex, notes.length, playNote]);

  const playNext = useCallback(() => {
    playNote(currentIndex < notes.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, notes.length, playNote]);

  const stop = useCallback(async () => {
    if (controllerRef.current) {
      await controllerRef.current.cancel();
      controllerRef.current = null;
    }
    await ttsRef.current?.stopPcmPlayer();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentIndex(0);
  }, []);

  return { isPlaying, currentIndex, mode, rate, voice, ttsReady, ttsError, setMode, setRate, setVoice, togglePlay, playAtIndex, playPrev, playNext, stop };
}
