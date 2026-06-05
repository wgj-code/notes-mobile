// F-001: VoiceNoteScreen
// 语音笔记界面：录音、实时转写、场景识别、笔记生成

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useVoiceRecorder, type RecordingStatus } from '../hooks/useVoiceRecorder';
import { identifyScene, getSceneName, getSceneIcon, type SceneType } from '../lib/scene-detector';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useNotesStore } from '../stores/notesStore';

// R3: 指数退避重试上传
async function uploadWithRetry(
  uri: string,
  fileName: string,
  retries = 3,
  baseDelay = 1000,
): Promise<{ data?: { path?: string }; error?: { message: string } }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const result = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, blob, { contentType: 'audio/m4a' });
      if (!result.error) return result;
      // 有 error 但不是最后一次尝试，继续重试
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn('VoiceNote', `Upload attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error: result.error.message });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return result;
    } catch (err: any) {
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn('VoiceNote', `Upload attempt ${attempt + 1} failed, retrying in ${delay}ms`, { error: err?.message });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return { error: { message: err?.message || String(err) } };
    }
  }
  return { error: { message: 'Upload failed after retries' } };
}

interface Props {
  navigation: any;
}

export default function VoiceNoteScreen({ navigation }: Props) {
  logger.info('VoiceNote', 'Screen mounted');
  console.log('[VoiceNote] Screen mounted v0.1.80-fix');
  const colors = useThemeColors();
  const { createNote } = useNotesStore();
  const recorder = useVoiceRecorder();
  const { status } = recorder;
  const [manualScene, setManualScene] = useState<SceneType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<string | null>(null);

  const currentScene = manualScene || recorder.sceneType;
  const styles = makeStyles(colors);

  // 格式化时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 调用Edge Function生成笔记
  const generateNote = useCallback(async (voiceNoteId: string, rawText: string, scene: SceneType) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-notes-generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            voice_note_id: voiceNoteId,
            raw_text: rawText,
            scene_type: scene,
            duration_seconds: recorder.duration,
          }),
        }
      );

      const result = await response.json();
      // title 作为内容首行，卡片标题用固定格式
      const noteBody = result.title
        ? `# ${result.title}\n\n${result.generated_note}`
        : result.generated_note;
      return noteBody;
    } catch (err) {
      console.error('Generate note error:', err);
      throw err;
    }
  }, [recorder.duration]);

  // 保存录音到Storage（R3: 指数退避重试）
  const saveRecordingToStorage = useCallback(async (uri: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        logger.error('VoiceNote', 'No user session');
        return null;
      }

      const fileExt = uri.split('.').pop() || 'm4a';
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      logger.info('VoiceNote', 'Uploading recording', { fileName, uri });

      const { data, error } = await uploadWithRetry(uri, fileName);

      if (error) {
        logger.warn('VoiceNote', 'Upload failed, continuing without audio', { error: error.message });
        return null;
      }

      logger.info('VoiceNote', 'Upload success', { path: data?.path });
      return data?.path || null;
    } catch (err: any) {
      logger.error('VoiceNote', 'Save recording error', { error: err?.message || String(err) });
      return null;
    }
  }, []);

  // 处理停止录音
  const handleStopRecording = useCallback(async () => {
    logger.info('VoiceNote', 'Stopping recording');
    const result = await recorder.stopRecording();
    logger.info('VoiceNote', 'Stop result', { hasResult: !!result });
    if (!result) {
      logger.error('VoiceNote', 'No result from stopRecording');
      return;
    }

    logger.info('VoiceNote', 'Recording stopped', {
      uri: result.uri,
      transcriptLength: result.transcript.length,
      transcriptPreview: result.transcript.substring(0, 100),
      scene: result.sceneType,
    });

    // 转写为空时提示用户（STT 失败或录音无内容）
    if (!result.transcript || result.transcript.trim().length === 0) {
      Alert.alert('提示', '语音转写内容为空，无法生成笔记。请检查 STT 模型是否正常加载，或重新录音。', [
        { text: '重置', onPress: () => recorder.reset() },
      ]);
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('错误', '请先登录');
        return;
      }

      // 上传录音文件（失败不阻塞笔记生成）
      const audioPath = await saveRecordingToStorage(result.uri);

      // 创建voice_notes记录
      const { data: voiceNote, error: insertError } = await supabase
        .from('voice_notes')
        .insert({
          user_id: session.user.id,
          scene_type: currentScene,
          raw_text: result.transcript,
          audio_file_path: audioPath,
          duration_seconds: recorder.duration,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        Alert.alert('错误', '保存失败');
        return;
      }

      // 调用Edge Function生成笔记
      const note = await generateNote(voiceNote.id, result.transcript, currentScene);

      if (note) {
        setGeneratedNote(note);
        // 固定标题格式：语音笔记-场景名
        const noteTitle = `语音笔记-${getSceneName(currentScene)}`;
        await createNote(noteTitle, note, null, ['voice', currentScene]);
        Alert.alert('完成', '笔记已生成并保存', [
          { text: '查看笔记', onPress: () => navigation.goBack() },
          { text: '继续录音', onPress: () => recorder.reset() },
        ]);
      } else {
        Alert.alert('提示', '笔记生成失败，请重试', [
          { text: '继续录音', onPress: () => recorder.reset() },
        ]);
      }
    } catch (err: any) {
      logger.error('VoiceNote', 'Generate error', { error: err?.message || String(err) });
      Alert.alert('错误', '生成笔记失败，请重试');
    } finally {
      setIsGenerating(false);
      await logger.flush();
    }
  }, [currentScene, generateNote, saveRecordingToStorage, createNote, navigation, recorder]);

  // 场景切换
  const sceneOptions: { type: SceneType; label: string; icon: string }[] = [
    { type: 'meeting', label: '会议', icon: '👥' },
    { type: 'chat', label: '闲聊', icon: '💬' },
    { type: 'monologue', label: '自言自语', icon: '🤔' },
    { type: 'unknown', label: '自动识别', icon: '📝' },
  ];

  return (
    <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      {/* 状态显示 */}
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>
          {status === 'idle' && '准备就绪'}
          {status === 'initializing' && '正在初始化...'}
          {status === 'recording' && '录音中...'}
          {status === 'paused' && '已暂停'}
          {status === 'stopping' && '正在停止...'}
          {status === 'transcribing' && '转写中...'}
          {status === 'error' && '发生错误'}
        </Text>
        {recorder.sttError && (
          <Text style={styles.errorText}>STT错误: {recorder.sttError}</Text>
        )}
      </View>

      {/* 时长显示 */}
      <View style={styles.durationCard}>
        <Text style={styles.durationText}>{formatDuration(recorder.duration)}</Text>
      </View>

      {/* 场景选择 */}
      <View style={styles.sceneCard}>
        <Text style={styles.sceneLabel}>场景识别</Text>
        <View style={styles.sceneOptions}>
          {sceneOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.sceneOption,
                currentScene === option.type && styles.sceneOptionActive,
              ]}
              onPress={() => setManualScene(option.type === 'unknown' ? null : option.type)}
            >
              <Text style={styles.sceneIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.sceneText,
                  currentScene === option.type && styles.sceneTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sceneHint}>
          {manualScene ? '已手动选择场景' : `自动识别: ${getSceneName(recorder.sceneType)}`}
        </Text>
      </View>

      {/* 实时转写 */}
      <View style={styles.transcriptCard}>
        <Text style={styles.transcriptLabel}>实时转写</Text>
        <ScrollView style={styles.transcriptScroll} nestedScrollEnabled>
          {recorder.transcript.length === 0 ? (
            <Text style={styles.transcriptPlaceholder}>
              开始录音后，语音将实时转换为文字...
            </Text>
          ) : (
            recorder.transcript.map((segment, index) => (
              <Text
                key={index}
                style={[
                  styles.transcriptText,
                  !segment.isFinal && styles.transcriptTextPending,
                ]}
              >
                {segment.text}
              </Text>
            ))
          )}
        </ScrollView>
      </View>

      {/* 生成的笔记 */}
      {generatedNote && (
        <View style={styles.noteCard}>
          <Text style={styles.noteLabel}>生成的笔记</Text>
          <ScrollView style={styles.noteScroll} nestedScrollEnabled>
            <Text style={styles.noteText}>{generatedNote}</Text>
          </ScrollView>
        </View>
      )}

      {/* 控制按钮 */}
      <View style={styles.controls}>
        {(status === 'idle' || status === 'error') && (
          <TouchableOpacity
            style={styles.recordBtn}
            onPress={recorder.startRecording}
            disabled={!recorder.sttReady}
          >
            <Text style={styles.recordBtnText}>开始录音</Text>
          </TouchableOpacity>
        )}

        {status === 'recording' && (
          <>
            <TouchableOpacity style={styles.pauseBtn} onPress={recorder.pauseRecording}>
              <Text style={styles.pauseBtnText}>暂停</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopBtn}
              onPress={handleStopRecording}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.stopBtnText}>停止并生成</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {status === 'paused' && (
          <>
            <TouchableOpacity style={styles.resumeBtn} onPress={recorder.resumeRecording}>
              <Text style={styles.resumeBtnText}>继续</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopBtn}
              onPress={handleStopRecording}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.stopBtnText}>停止并生成</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.resetBtn} onPress={recorder.reset}>
          <Text style={styles.resetBtnText}>重置</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
    },
    statusCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    statusText: {
      fontSize: fontSize.lg,
      color: c.text,
      fontWeight: '600',
    },
    errorText: {
      fontSize: fontSize.sm,
      color: c.danger,
      marginTop: spacing.sm,
    },
    durationCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.xl,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    durationText: {
      fontSize: fontSize.xxxl,
      color: c.primary,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    sceneCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    sceneLabel: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    sceneOptions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    sceneOption: {
      flex: 1,
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    sceneOptionActive: {
      borderColor: c.primary,
      backgroundColor: c.activeOptionBg,
    },
    sceneIcon: {
      fontSize: fontSize.xl,
      marginBottom: spacing.xs,
    },
    sceneText: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    sceneTextActive: {
      color: c.primary,
      fontWeight: '600',
    },
    sceneHint: {
      fontSize: fontSize.xs,
      color: c.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    transcriptCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    transcriptLabel: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    transcriptScroll: {
    },
    transcriptPlaceholder: {
      fontSize: fontSize.md,
      color: c.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
      padding: spacing.xl,
    },
    transcriptText: {
      fontSize: fontSize.md,
      color: c.text,
      lineHeight: 24,
    },
    transcriptTextPending: {
      color: c.textSecondary,
      fontStyle: 'italic',
    },
    noteCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: c.primary,
    },
    noteLabel: {
      fontSize: fontSize.md,
      color: c.primary,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    noteScroll: {
    },
    noteText: {
      fontSize: fontSize.md,
      color: c.text,
      lineHeight: 24,
    },
    controls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'center',
      marginTop: spacing.md,
    },
    recordBtn: {
      backgroundColor: c.danger,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    recordBtnText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    pauseBtn: {
      backgroundColor: c.warning,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    pauseBtnText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    resumeBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    resumeBtnText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    stopBtn: {
      backgroundColor: c.textSecondary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    stopBtnText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },
    resetBtn: {
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
    },
    resetBtnText: {
      color: c.textSecondary,
      fontSize: fontSize.lg,
    },
  });
}
