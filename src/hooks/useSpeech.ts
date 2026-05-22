import { useState, useCallback, useRef, useEffect } from 'react';
import { createTTS, type TTS } from 'react-native-sherpa-onnx';
import { fileModelPath } from 'react-native-sherpa-onnx';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

export type PlayMode = 'sequential' | 'random' | 'loop';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechVoice = 'host' | 'girl' | 'lady';

interface Note { id: string; title: string; content: string; }

const VOICE_IDS: Record<SpeechVoice, number> = { host: 50, girl: 45, lady: 52 };
const RATE_MAP: Record<SpeechRate, number> = { slow: 0.7, normal: 1.0, fast: 1.3 };

const MODEL_DIR = 'kokoro-int8-multi-lang-v1_1';
const MODEL_FILES = ['model.int8.onnx', 'voices.bin', 'tokens.txt', 'lexicon-zh.txt', 'espeak-ng-data'];

async function ensureModelReady(): Promise<string> {
  const destDir = `${FileSystem.documentDirectory}models/${MODEL_DIR}/`;
  const marker = `${destDir}.initialized`;

  // Check if model already copied
  const info = await FileSystem.getInfoAsync(marker).catch(() => null);
  if (info?.exists) return destDir;

  // Copy model files from assets to document directory
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });

  for (const file of MODEL_FILES) {
    const asset = Asset.fromModule(require(`../../assets/models/${MODEL_DIR}/${file}`));
    await asset.downloadAsync();
    const destFile = `${destDir}${file}`;
    await FileSystem.copyAsync({ from: asset.localUri!, to: destFile });
  }

  // Mark as initialized
  await FileSystem.writeAsStringAsync(marker, 'ok');
  return destDir;
}

export function useSpeech(notes: Note[]) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('sequential');
  const [rate, setRate] = useState<SpeechRate>('normal');
  const [voice, setVoice] = useState<SpeechVoice>('host');
  const ttsRef = useRef<TTS | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const modelDir = await ensureModelReady();
        ttsRef.current = await createTTS({
          modelConfig: fileModelPath(modelDir),
          modelType: 'kokoro',
        });
      } catch (err) { console.error('TTS init failed:', err); }
    })();
    return () => { soundRef.current?.unloadAsync(); ttsRef.current?.shutdown(); };
  }, []);

  const playNote = useCallback(async (index: number) => {
    if (index < 0 || index >= notes.length || !ttsRef.current) return;
    setCurrentIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const note = notes[index];
      const audio = await ttsRef.current.generate({
        text: `${note.title}。${note.content}`,
        sid: VOICE_IDS[voice],
        speed: RATE_MAP[rate],
      });
      const uri = `${FileSystem.cacheDirectory}tts_${note.id}.wav`;
      await FileSystem.writeAsStringAsync(uri, audio, { encoding: FileSystem.EncodingType.Base64 });
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.didJustFinish && isPlayingRef.current) {
          isPlayingRef.current = false; setIsPlaying(false);
          if (mode === 'loop') playNote(index);
          else if (mode === 'sequential' && index < notes.length - 1) playNote(index + 1);
          else if (mode === 'random') playNote(Math.floor(Math.random() * notes.length));
        }
      });
      await sound.playAsync();
    } catch (err) { console.error('TTS error:', err); setIsPlaying(false); isPlayingRef.current = false; }
  }, [notes, rate, mode, voice]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) { await soundRef.current?.pauseAsync(); setIsPlaying(false); isPlayingRef.current = false; }
    else playNote(currentIndex);
  }, [isPlaying, currentIndex, playNote]);

  const playAtIndex = useCallback((i: number) => { soundRef.current?.unloadAsync(); playNote(i); }, [playNote]);
  const playPrev = useCallback(() => { soundRef.current?.unloadAsync(); playNote(currentIndex > 0 ? currentIndex - 1 : notes.length - 1); }, [currentIndex, notes.length, playNote]);
  const playNext = useCallback(() => { soundRef.current?.unloadAsync(); playNote(currentIndex < notes.length - 1 ? currentIndex + 1 : 0); }, [currentIndex, notes.length, playNote]);
  const stop = useCallback(async () => { await soundRef.current?.unloadAsync(); setIsPlaying(false); isPlayingRef.current = false; setCurrentIndex(0); }, []);

  return { isPlaying, currentIndex, mode, rate, voice, setMode, setRate, setVoice, togglePlay, playAtIndex, playPrev, playNext, stop };
}
