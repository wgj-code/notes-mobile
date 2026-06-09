// 7×24 在线语音笔记系统 - 测试界面

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useOnlineVoiceNote } from '../hooks/useOnlineVoiceNote';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, fontSize, borderRadius } from '../constants/theme';
import type { SceneType } from '../lib/online-voice-note/types';

// 场景图标映射
const SCENE_ICONS: Record<SceneType, string> = {
  meeting: '👥',
  chat: '💬',
  monologue: '🤔',
  unknown: '📝',
};

// 场景名称映射
const SCENE_NAMES: Record<SceneType, string> = {
  meeting: '会议',
  chat: '闲聊',
  monologue: '自言自语',
  unknown: '其他',
};

export function OnlineVoiceNoteScreen() {
  const c = useThemeColors();
  const {
    state,
    transcript,
    currentScene,
    notes,
    dailyLog,
    startRecording,
    stopRecording,
    reset,
    getDiagnostic,
    error,
  } = useOnlineVoiceNote();

  const [isProcessing, setIsProcessing] = useState(false);

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理开始录音
  const handleStart = useCallback(async () => {
    try {
      setIsProcessing(true);
      await startRecording();
    } catch (err: any) {
      Alert.alert('错误', err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [startRecording]);

  // 处理停止录音
  const handleStop = useCallback(async () => {
    try {
      setIsProcessing(true);
      const result = await stopRecording();
      if (result.notes.length > 0) {
        Alert.alert('成功', `生成了 ${result.notes.length} 条笔记`);
      }
    } catch (err: any) {
      Alert.alert('错误', err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [stopRecording]);

  // 处理导出诊断信息
  const handleExportDiagnostic = useCallback(async () => {
    try {
      const diagnostic = await getDiagnostic();
      Alert.alert('诊断信息', diagnostic.substring(0, 500) + '...');
    } catch (err: any) {
      Alert.alert('错误', err.message);
    }
  }, [getDiagnostic]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>
            🎙️ 7×24 在线语音笔记
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            边录音边转写 · 多场景识别 · 智能笔记
          </Text>
        </View>

        {/* 状态卡片 */}
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>系统状态</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: c.textSecondary }]}>状态:</Text>
            <Text style={[styles.statusValue, { color: c.primary }]}>
              {state === 'idle' && '就绪'}
              {state === 'initializing' && '初始化中...'}
              {state === 'recording' && '🔴 录音中'}
              {state === 'stopping' && '停止中...'}
              {state === 'error' && '❌ 错误'}
            </Text>
          </View>
          {error && (
            <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          )}
        </View>

        {/* 实时转写 */}
        {state === 'recording' && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>实时转写</Text>
            <Text style={[styles.transcript, { color: c.text }]}>
              {transcript || '等待语音输入...'}
            </Text>
          </View>
        )}

        {/* 场景识别 */}
        {state === 'recording' && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>当前场景</Text>
            <View style={styles.sceneContainer}>
              <Text style={styles.sceneIcon}>
                {SCENE_ICONS[currentScene]}
              </Text>
              <Text style={[styles.sceneName, { color: c.text }]}>
                {SCENE_NAMES[currentScene]}
              </Text>
            </View>
          </View>
        )}

        {/* 控制按钮 */}
        <View style={styles.buttonContainer}>
          {state === 'idle' && (
            <TouchableOpacity
              style={[styles.button, styles.startButton, { backgroundColor: c.primary }]}
              onPress={handleStart}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>开始录音</Text>
              )}
            </TouchableOpacity>
          )}

          {state === 'recording' && (
            <TouchableOpacity
              style={[styles.button, styles.stopButton, { backgroundColor: c.danger }]}
              onPress={handleStop}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>停止并生成笔记</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.resetButton, { backgroundColor: c.textSecondary }]}
            onPress={reset}
          >
            <Text style={styles.buttonText}>重置</Text>
          </TouchableOpacity>
        </View>

        {/* 生成的笔记 */}
        {notes.length > 0 && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>
              生成的笔记 ({notes.length})
            </Text>
            {notes.map((note, index) => (
              <View key={note.id} style={[styles.noteItem, { borderBottomColor: c.border }]}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteIcon}>
                    {SCENE_ICONS[note.sceneType || 'unknown']}
                  </Text>
                  <Text style={[styles.noteTitle, { color: c.text }]} numberOfLines={1}>
                    {note.title}
                  </Text>
                </View>
                <Text style={[styles.noteText, { color: c.textSecondary }]} numberOfLines={2}>
                  {note.text}
                </Text>
                <View style={styles.noteMeta}>
                  <Text style={[styles.noteTime, { color: c.textTertiary }]}>
                    {formatDuration(note.duration)}
                  </Text>
                  <Text style={[styles.noteScore, { color: c.primary }]}>
                    信息量: {(note.informationScore * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 日志汇总 */}
        {dailyLog && (
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>
              📋 日志汇总 ({dailyLog.date})
            </Text>
            <Text style={[styles.logSummary, { color: c.text }]}>
              {dailyLog.summary}
            </Text>
            <View style={styles.logStats}>
              <Text style={[styles.logStat, { color: c.textSecondary }]}>
                场景数: {dailyLog.sceneCount}
              </Text>
              <Text style={[styles.logStat, { color: c.textSecondary }]}>
                总时长: {formatDuration(dailyLog.totalDuration)}
              </Text>
            </View>
            {dailyLog.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {dailyLog.tags.slice(0, 5).map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: c.primaryLight }]}>
                    <Text style={[styles.tagText, { color: c.primary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 诊断按钮 */}
        <TouchableOpacity
          style={[styles.diagnosticButton, { borderColor: c.border }]}
          onPress={handleExportDiagnostic}
        >
          <Text style={[styles.diagnosticButtonText, { color: c.textSecondary }]}>
            导出诊断信息
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
  },
  card: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  transcript: {
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  sceneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sceneIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  sceneName: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  startButton: {},
  stopButton: {},
  resetButton: {},
  buttonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  noteItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  noteTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  noteText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteTime: {
    fontSize: fontSize.sm,
  },
  noteScore: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  logSummary: {
    fontSize: fontSize.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  logStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  logStat: {
    fontSize: fontSize.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.sm,
  },
  diagnosticButton: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  diagnosticButtonText: {
    fontSize: fontSize.md,
  },
});
