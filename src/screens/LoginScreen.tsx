import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';
import { spacing, fontSize, borderRadius } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

export default function LoginScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('errors.fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      const code = mapSupabaseError(error);
      Alert.alert(t('auth.loginFailed'), getUserMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('common.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder={t('common.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? t('auth.loggingIn') : t('auth.login')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>{t('auth.noAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: c.background },
    title: { fontSize: fontSize.title, fontWeight: '700', marginBottom: 32, textAlign: 'center', color: c.text },
    input: {
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: borderRadius.sm,
      padding: 14, fontSize: fontSize.lg, marginBottom: spacing.md, color: c.text,
    },
    button: {
      backgroundColor: c.primary, borderRadius: borderRadius.sm,
      padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm,
    },
    buttonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
    link: { color: c.primary, textAlign: 'center', marginTop: spacing.lg, fontSize: fontSize.md },
  });
}
