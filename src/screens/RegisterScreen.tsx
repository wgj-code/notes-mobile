import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { mapSupabaseError, getUserMessage } from '../lib/supabase-helpers';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const signUp = useAuthStore((s) => s.signUp);

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
    } catch (error: any) {
      const code = mapSupabaseError(error);
      Alert.alert('Registration Failed', getUserMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { fontSize: fontSize.title, fontWeight: '700', marginBottom: 32, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: colors.inputBorder, borderRadius: borderRadius.sm,
    padding: 14, fontSize: fontSize.lg, marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary, borderRadius: borderRadius.sm,
    padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: spacing.lg, fontSize: fontSize.md },
});
