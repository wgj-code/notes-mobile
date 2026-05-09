import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { spacing, fontSize } from '../lib/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { t } from '../i18n';

interface Props {
  onImageUploaded: (url: string) => void;
}

export default function ImageUpload({ onImageUploaded }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate filename
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${user.id}/${filename}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('note-images')
        .upload(path, decode(fileContent), {
          contentType: asset.mimeType ?? 'image/jpeg',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('note-images')
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        onImageUploaded(urlData.publicUrl);
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('imageUpload.failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={pickAndUpload}
      disabled={uploading}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={styles.buttonText}>{t('imageUpload.addImage')}</Text>
      )}
    </TouchableOpacity>
  );
}

// Helper: decode base64 to Uint8Array for Supabase storage upload
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    button: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
      minHeight: 36,
    },
    buttonText: {
      fontSize: fontSize.sm,
      color: c.primary,
      fontWeight: '500',
    },
  });
}
