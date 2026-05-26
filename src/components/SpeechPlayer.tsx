import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useSpeech, type PlayMode, type SpeechRate, type SpeechVoice } from '../hooks/useSpeech';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';
import { useNotesStore } from '../stores/notesStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MODES: { key: PlayMode; labelKey: string }[] = [
  { key: 'sequential', labelKey: 'speech.sequential' },
  { key: 'random', labelKey: 'speech.random' },
  { key: 'loop', labelKey: 'speech.loop' },
];

const RATES: { key: SpeechRate; labelKey: string }[] = [
  { key: 'slow', labelKey: 'speech.slow' },
  { key: 'normal', labelKey: 'speech.normal' },
  { key: 'fast', labelKey: 'speech.fast' },
];

const VOICES: { key: SpeechVoice; labelKey: string }[] = [
  { key: 'host', labelKey: 'speech.voiceHost' },
  { key: 'girl', labelKey: 'speech.voiceGirl' },
  { key: 'lady', labelKey: 'speech.voiceLady' },
];

export default function SpeechPlayer({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const { notes } = useNotesStore();
  const speech = useSpeech(notes);
  const styles = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.panel} activeOpacity={1}>
          <View style={styles.handle} />

          {/* TTS status */}
          {!speech.ttsReady && !speech.ttsError && (
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Loading voice engine...
            </Text>
          )}
          {speech.ttsError && (
            <Text style={[styles.statusText, { color: colors.danger }]}>
              Voice error: {speech.ttsError}
            </Text>
          )}
          {speech.ttsReady && speech.playStatus !== 'idle' && speech.playStatus !== 'finished' && (
            <Text style={[styles.statusText, { color: colors.textSecondary, fontSize: 10 }]}>
              {speech.playStatus}
            </Text>
          )}

          {/* Note list */}
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            style={styles.noteList}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[styles.noteItem, index === speech.currentIndex && styles.noteItemActive]}
                onPress={() => speech.playAtIndex(index)}
              >
                <Text style={[styles.noteItemText, index === speech.currentIndex && styles.noteItemTextActive]} numberOfLines={1}>
                  {index === speech.currentIndex && speech.isPlaying ? '▶ ' : '   '}{item.title}
                </Text>
              </TouchableOpacity>
            )}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.y / 50);
              if (index !== speech.currentIndex) {
                // User scrolled to a different note — play it
                speech.stop();
                // We need to trigger play via a ref or state change
              }
            }}
          />

          {/* Playback controls */}
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlBtn} onPress={speech.playPrev}>
              <Text style={styles.controlBtnText}>◀◀</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={speech.togglePlay}>
              <Text style={styles.playBtnText}>{speech.isPlaying ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={speech.playNext}>
              <Text style={styles.controlBtnText}>▶▶</Text>
            </TouchableOpacity>
          </View>

          {/* Voice selection */}
          <View style={styles.toggleRow}>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.key}
                style={[styles.toggleBtn, speech.voice === v.key && styles.toggleActive]}
                onPress={() => speech.setVoice(v.key)}
              >
                <Text style={[styles.toggleText, speech.voice === v.key && styles.toggleTextActive]}>
                  {t(v.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mode selection */}
          <View style={styles.toggleRow}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.toggleBtn, speech.mode === m.key && styles.toggleActive]}
                onPress={() => speech.setMode(m.key)}
              >
                <Text style={[styles.toggleText, speech.mode === m.key && styles.toggleTextActive]}>
                  {t(m.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rate selection */}
          <View style={styles.toggleRow}>
            {RATES.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[styles.toggleBtn, speech.rate === r.key && styles.toggleActive]}
                onPress={() => speech.setRate(r.key)}
              >
                <Text style={[styles.toggleText, speech.rate === r.key && styles.toggleTextActive]}>
                  {t(r.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.stopBtn} onPress={() => { speech.stop(); onClose(); }}>
            <Text style={styles.stopBtnText}>{t('speech.stop')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    panel: {
      backgroundColor: c.card,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      maxHeight: '80%',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    statusText: {
      fontSize: fontSize.sm,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    noteList: {
      maxHeight: 150,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: borderRadius.sm,
    },
    noteItem: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    noteItemActive: {
      backgroundColor: c.activeOptionBg,
    },
    noteItemText: {
      fontSize: fontSize.md,
      color: c.textSecondary,
    },
    noteItemTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xl,
      marginBottom: spacing.lg,
    },
    controlBtn: {
      padding: spacing.md,
    },
    controlBtnText: {
      fontSize: fontSize.xl,
      color: c.textSecondary,
    },
    playBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playBtnText: {
      fontSize: fontSize.xxl,
      color: '#ffffff',
    },
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    toggleBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      alignItems: 'center',
    },
    toggleActive: {
      borderColor: c.primary,
      backgroundColor: c.activeOptionBg,
    },
    toggleText: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    toggleTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
    stopBtn: {
      backgroundColor: c.danger,
      borderRadius: borderRadius.sm,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    stopBtnText: {
      color: '#ffffff',
      fontSize: fontSize.md,
      fontWeight: '600',
    },
  });
}
