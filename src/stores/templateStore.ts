import { create } from 'zustand';
import type { Template } from '../types';
import { supabase } from '../lib/supabase';

interface TemplateState {
  templates: Template[];
  loading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  createTemplate: (name: string, title: string, content: string) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('is_builtin', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ templates: (data ?? []) as Template[], loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load templates', loading: false });
    }
  },

  createTemplate: async (name, title, content) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        title,
        content,
        user_id: user.id,
        is_builtin: false,
      })
      .select()
      .single();

    if (error) throw error;

    const template = data as Template;
    set({ templates: [...get().templates, template] });
    return template;
  },

  deleteTemplate: async (id) => {
    const existing = get().templates.find((t) => t.id === id);
    if (existing?.is_builtin) {
      throw new Error('Cannot delete built-in templates');
    }

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },
}));

/**
 * Replace {{date}} placeholder in template content with the current date.
 */
export function processTemplateContent(content: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return content.replace(/\{\{date\}\}/g, dateStr);
}
