#!/usr/bin/env python3
"""
Survey Kokoro multi-lang speaker IDs: generate a WAV for each sampled ID.
Usage: python3 scripts/voice-survey.py
Output: voice-survey/sid_XXXX.wav
"""
import os
import struct
import wave

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'models', 'kokoro-int8-multi-lang-v1_1')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'voice-survey')
TEXT = '你好，我是迪迪笔记的语音助手。今天天气不错。'

# Model has only 103 speakers (0-102), generate ALL of them
MAX_SID = 103


def write_wav(path, samples, sample_rate):
    """Write float32 samples to a 16-bit WAV file."""
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for s in samples:
            val = max(-1.0, min(1.0, s))
            wf.writeframes(struct.pack('<h', int(val * 32767)))


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    import sherpa_onnx

    tts_config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=os.path.join(MODEL_DIR, 'model.int8.onnx'),
                voices=os.path.join(MODEL_DIR, 'voices.bin'),
                tokens=os.path.join(MODEL_DIR, 'tokens.txt'),
                lexicon=os.path.join(MODEL_DIR, 'lexicon.txt'),
                data_dir=os.path.join(MODEL_DIR, 'espeak-ng-data'),
            ),
            provider='cpu',
        ),
    )

    tts = sherpa_onnx.OfflineTts(tts_config)
    print(f'Model loaded. num_speakers={tts.num_speakers}')

    sids = list(range(0, MAX_SID))
    for i, sid in enumerate(sids):
        out_path = os.path.join(OUTPUT_DIR, f'sid_{sid:03d}.wav')
        if os.path.exists(out_path):
            continue
        try:
            audio = tts.generate(TEXT, sid=sid, speed=1.0)
            write_wav(out_path, audio.samples, audio.sample_rate)
            print(f'  [{i+1}/{len(sids)}] sid={sid} -> {out_path}')
        except Exception as e:
            print(f'  [{i+1}/{len(sids)}] sid={sid} FAILED: {e}')

    print(f'\nDone! Files in {OUTPUT_DIR}')
    print(f'Windows: \\\\wsl.localhost\\Ubuntu1\\home\\wgj\\6a-demo-notes\\repos\\notes-mobile\\voice-survey\\')

if __name__ == '__main__':
    main()
