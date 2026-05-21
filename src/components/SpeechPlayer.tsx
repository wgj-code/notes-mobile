import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useSpeech, type PlayMode, type SpeechRate } from '../hooks/useSpeech';
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

export default function SpeechPlayer({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const { notes } = useNotesStore();
  const speech = useSpeech(notes);
  const styles = makeStyles(colors);

  const currentNote = notes[speech.currentIndex];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.panel} activeOpacity={1}>
          <View style={styles.handle} />

          <Text style={styles.currentNote} numberOfLines={1}>
            {currentNote?.title ?? t('speech.noNotes')}
          </Text>

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
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    currentNote: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xl,
      marginBottom: spacing.xl,
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
