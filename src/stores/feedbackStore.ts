import { create } from 'zustand';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import type { Feedback, FeedbackCategory } from '../types';

interface FeedbackState {
  feedbackList: Feedback[];
  loading: boolean;
  submitting: boolean;
  error: string | null;

  fetchMyFeedback: () => Promise<void>;
  submitFeedback: (params: {
    content: string;
    category: FeedbackCategory;
    images: string[];
    voiceUri: string | null;
  }) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbackList: [],
  loading: false,
  submitting: false,
  error: null,

  fetchMyFeedback: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      set({ feedbackList: (data ?? []) as Feedback[], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Network error', loading: false });
    }
  },

  submitFeedback: async ({ content, category, images, voiceUri }) => {
    set({ submitting: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload images to note-images bucket
      const uploadedImages: string[] = [];
      for (const uri of images) {
        const fileContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = uri.split('.').pop() ?? 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `${user.id}/${filename}`;

        const { error } = await supabase.storage
          .from('note-images')
          .upload(path, decodeBase64(fileContent), {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('note-images')
          .getPublicUrl(path);

        if (urlData?.publicUrl) {
          uploadedImages.push(urlData.publicUrl);
        }
      }

      // Upload voice recording to feedback-voice bucket
      let voiceUrl: string | null = null;
      if (voiceUri) {
        const voiceContent = await FileSystem.readAsStringAsync(voiceUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const filename = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.m4a`;
        const path = `${user.id}/${filename}`;

        const { error } = await supabase.storage
          .from('feedback-voice')
          .upload(path, decodeBase64(voiceContent), {
            contentType: 'audio/m4a',
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('feedback-voice')
          .getPublicUrl(path);

        voiceUrl = urlData?.publicUrl ?? null;
      }

      // Insert feedback record
      const { data, error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          content,
          category,
          images: uploadedImages,
          voice_url: voiceUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Prepend to local list
      set({
        feedbackList: [data as Feedback, ...get().feedbackList],
        submitting: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Submit failed', submitting: false });
      throw err;
    }
  },
}));

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
