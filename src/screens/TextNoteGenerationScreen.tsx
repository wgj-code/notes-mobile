import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNotesStore } from '../stores/notesStore';
import { supabase } from '../lib/supabase';
import MarkdownPreview from '../components/MarkdownPreview';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

export default function TextNoteGenerationScreen({ navigation }: any) {
  const colors = useThemeColors();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ title: string; content: string } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const { generateNote, createNote } = useNotesStore();

  const handleGenerate = async () => {
    if (prompt.trim().length === 0) {
      Alert.alert('提示', '请输入文字内容');
      return;
    }

    setGenerating(true);
    try {
      const generated = await generateNote(prompt);
      setResult(generated);
      setEditTitle(generated.title);
      setEditContent(generated.content);
    } catch (error: any) {
      Alert.alert('生成失败', error.message || '请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const title = editMode ? editTitle : result?.title || '';
    const content = editMode ? editContent : result?.content || '';

    if (content.trim().length === 0) {
      Alert.alert('提示', '内容不能为空');
      return;
    }

    try {
      await createNote(title, content);
      Alert.alert('成功', '笔记已保存', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    }
  };

  const handleReset = () => {
    setResult(null);
    setEditMode(false);
    setEditTitle('');
    setEditContent('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Prompt Input */}
        {!result && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              输入文字（prompt）
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="输入你想生成的笔记内容，例如：
- 把以下古文翻译成白话文：{原文}
- 根据以下内容生成会议纪要：{内容}
- 总结以下内容的要点：{内容}"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={prompt}
              onChangeText={setPrompt}
              maxLength={10000}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {prompt.length}/10000
            </Text>
          </View>
        )}

        {/* Generate Button */}
        {!result && (
          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: colors.primary },
              generating && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.generateButtonText}>正在生成...</Text>
              </View>
            ) : (
              <Text style={styles.generateButtonText}>生成笔记</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Result Preview */}
        {result && (
          <View style={styles.section}>
            <View style={styles.resultHeader}>
              <Text style={[styles.label, { color: colors.text }]}>生成结果</Text>
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border }]}
                  onPress={() => setEditMode(!editMode)}
                >
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    {editMode ? '预览' : '编辑'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { borderColor: colors.border }]}
                  onPress={handleReset}
                >
                  <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                    重新生成
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {editMode ? (
              <View>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="标题"
                  placeholderTextColor={colors.textSecondary}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={20}
                />
                <TextInput
                  style={[
                    styles.editContent,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="内容"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={editContent}
                  onChangeText={setEditContent}
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
                {result.title ? (
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    {result.title}
                  </Text>
                ) : null}
                <MarkdownPreview content={result.content} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      {result && (
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>保存笔记</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 200,
  },
  charCount: {
    fontSize: fontSize.sm,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  generateButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
  },
  previewCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  editContent: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    minHeight: 200,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
