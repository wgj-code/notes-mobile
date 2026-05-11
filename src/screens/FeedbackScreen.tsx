import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { t } from '../i18n';
import { useFeedbackStore } from '../stores/feedbackStore';
import type { FeedbackCategory, Feedback, FeedbackStatus } from '../types';

type Tab = 'submit' | 'history';

const CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'improvement', 'other'];

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: '#007AFF',
  reviewed: '#FF9500',
  resolved: '#34C759',
  wontfix: '#8E8E93',
};

export default function FeedbackScreen() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const [tab, setTab] = useState<Tab>('submit');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [images, setImages] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const { feedbackList, loading, submitting, fetchMyFeedback, submitFeedback } = useFeedbackStore();

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const resetForm = useCallback(() => {
    setDescription('');
    setCategory('other');
    setImages([]);
    setVoiceUri(null);
    setRecording(null);
    setIsRecording(false);
  }, []);

  // ── Image picking ──────────────────────────────────────────────────

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 4 - images.length,
      });

      if (result.canceled || !result.assets?.length) return;
      const newUris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...newUris].slice(0, 4));
    } catch {
      // silently fail
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Voice recording ────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('feedback.permissionDenied'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setVoiceUri(null);
      setIsRecording(true);
    } catch {
      Alert.alert(t('common.error'), t('feedback.submitFailed'));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setVoiceUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch {
      setRecording(null);
      setIsRecording(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('feedback.descriptionRequired'));
      return;
    }

    try {
      await submitFeedback({
        content: trimmed,
        category,
        images,
        voiceUri,
      });
      Alert.alert('', t('feedback.success'));
      resetForm();
      setTab('history');
    } catch {
      Alert.alert(t('common.error'), t('feedback.submitFailed'));
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────

  const getStatusLabel = (status: FeedbackStatus) => {
    const map: Record<FeedbackStatus, string> = {
      new: t('feedback.statusNew'),
      reviewed: t('feedback.statusReviewed'),
      resolved: t('feedback.statusResolved'),
      wontfix: t('feedback.statusWontfix'),
    };
    return map[status];
  };

  const getCategoryLabel = (cat: FeedbackCategory) => {
    const map: Record<FeedbackCategory, string> = {
      bug: t('feedback.bug'),
      feature: t('feedback.feature'),
      improvement: t('feedback.improvement'),
      other: t('feedback.other'),
    };
    return map[cat];
  };

  // ── Submit form ────────────────────────────────────────────────────

  const renderSubmitForm = () => (
    <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
      {/* Description */}
      <Text style={styles.label}>{t('feedback.description')}</Text>
      <TextInput
        style={styles.textInput}
        placeholder={t('feedback.descriptionPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />

      {/* Category picker */}
      <Text style={styles.label}>{t('feedback.category')}</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
              {getCategoryLabel(cat)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Images */}
      <Text style={styles.label}>{t('feedback.attachImages')}</Text>
      <View style={styles.imageRow}>
        {images.map((uri, i) => (
          <View key={uri} style={styles.imageThumbWrapper}>
            <Image source={{ uri }} style={styles.imageThumb} />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(i)}>
              <Text style={styles.imageRemoveText}>{t('feedback.removeImage')}</Text>
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 4 && (
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Text style={styles.addImageButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Voice recording */}
      <Text style={styles.label}>{t('feedback.recordVoice')}</Text>
      <View style={styles.voiceRow}>
        {!isRecording ? (
          <TouchableOpacity style={styles.voiceButton} onPress={startRecording}>
            <Text style={styles.voiceButtonText}>{t('feedback.recordVoice')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.voiceButton, styles.voiceButtonActive]}
            onPress={stopRecording}
          >
            <Text style={[styles.voiceButtonText, styles.voiceButtonTextActive]}>
              {t('feedback.recording')}
            </Text>
          </TouchableOpacity>
        )}
        {voiceUri && !isRecording && (
          <Text style={styles.voiceAttached}>{t('feedback.recordVoice')} ✓</Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ── History list ───────────────────────────────────────────────────

  const renderHistoryItem = ({ item }: { item: Feedback }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyCategoryBadge}>
          <Text style={styles.historyCategoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        <View style={[styles.historyStatusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.historyStatusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.historyContent}>{item.content}</Text>
      {item.images.length > 0 && (
        <View style={styles.historyImages}>
          {item.images.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.historyThumb} />
          ))}
        </View>
      )}
      <Text style={styles.historyDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderHistory = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (feedbackList.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('feedback.noFeedback')}</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={feedbackList}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.historyList}
      />
    );
  };

  // ── Main render ────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'submit' && styles.tabItemActive]}
          onPress={() => setTab('submit')}
        >
          <Text style={[styles.tabText, tab === 'submit' && styles.tabTextActive]}>
            {t('feedback.submitFeedback')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'history' && styles.tabItemActive]}
          onPress={() => {
            setTab('history');
            fetchMyFeedback();
          }}
        >
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>
            {t('feedback.history')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'submit' ? renderSubmitForm() : renderHistory()}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tabItem: {
      flex: 1,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    tabItemActive: {
      borderBottomWidth: 2,
      borderBottomColor: c.primary,
    },
    tabText: {
      fontSize: fontSize.md,
      color: c.textMuted,
      fontWeight: '500',
    },
    tabTextActive: {
      color: c.primary,
      fontWeight: '600',
    },

    // Form
    formContainer: {
      flex: 1,
      padding: spacing.xl,
    },
    label: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
      marginTop: spacing.lg,
    },
    textInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: borderRadius.sm,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: c.text,
      backgroundColor: c.card,
      minHeight: 120,
    },

    // Category
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    categoryChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    categoryChipActive: {
      borderColor: c.primary,
      backgroundColor: c.activeOptionBg,
    },
    categoryText: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    categoryTextActive: {
      color: c.primary,
      fontWeight: '600',
    },

    // Images
    imageRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    imageThumbWrapper: {
      position: 'relative',
    },
    imageThumb: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.sm,
    },
    imageRemoveBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: c.danger,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageRemoveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    addImageButton: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    addImageButtonText: {
      fontSize: 24,
      color: c.textMuted,
    },

    // Voice
    voiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    voiceButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    voiceButtonActive: {
      borderColor: c.danger,
      backgroundColor: c.errorBannerBg,
    },
    voiceButtonText: {
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    voiceButtonTextActive: {
      color: c.danger,
    },
    voiceAttached: {
      fontSize: fontSize.sm,
      color: c.primary,
      fontWeight: '500',
    },

    // Submit
    submitButton: {
      marginTop: spacing.xl,
      marginBottom: spacing.xxl,
      backgroundColor: c.primary,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: fontSize.lg,
      fontWeight: '600',
    },

    // History
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: fontSize.md,
      color: c.textMuted,
    },
    historyList: {
      padding: spacing.lg,
    },
    historyCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.sm,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    historyCategoryBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: c.activeOptionBg,
    },
    historyCategoryText: {
      fontSize: fontSize.sm,
      color: c.primary,
      fontWeight: '500',
    },
    historyStatusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 4,
    },
    historyStatusText: {
      fontSize: fontSize.sm,
      color: '#fff',
      fontWeight: '500',
    },
    historyContent: {
      fontSize: fontSize.md,
      color: c.text,
      lineHeight: 20,
    },
    historyImages: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    historyThumb: {
      width: 48,
      height: 48,
      borderRadius: 4,
    },
    historyDate: {
      fontSize: fontSize.sm,
      color: c.textMuted,
      marginTop: spacing.sm,
    },
  });
}
