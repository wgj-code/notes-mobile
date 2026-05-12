import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '../contexts/ThemeContext';
import { borderRadius } from '../lib/theme';
import { t } from '../i18n';

const FEEDBACK_HIDDEN_KEY = 'feedback-button-hidden';

interface Props {
  onPress: () => void;
}

export default function FeedbackButton({ onPress }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FEEDBACK_HIDDEN_KEY).then((v) => {
      if (v === 'true') setHidden(true);
    });
  }, []);

  const handleHide = async () => {
    setHidden(true);
    await AsyncStorage.setItem(FEEDBACK_HIDDEN_KEY, 'true');
  };

  if (hidden) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeBtn} onPress={handleHide} accessibilityLabel="Hide feedback button">
        <Text style={styles.closeText}>x</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fab} onPress={onPress} accessibilityLabel={t('feedback.title')}>
        <Text style={styles.fabText}>?</Text>
      </TouchableOpacity>
    </View>
  );
}

export async function showFeedbackButton() {
  await AsyncStorage.removeItem(FEEDBACK_HIDDEN_KEY);
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      left: 20,
      bottom: 20,
      zIndex: 999,
    },
    fab: {
      width: 52,
      height: 52,
      borderRadius: borderRadius.lg,
      backgroundColor: c.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    closeBtn: {
      position: 'absolute',
      top: -8,
      right: -8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    closeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    fabText: {
      color: '#fff',
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '700',
    },
  });
}
