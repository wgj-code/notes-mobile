// ProgressBar: 笔记生成进度条
// 显示停止录音后的处理阶段进度

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, fontSize } from '../lib/theme';

export type GeneratingStage =
  | 'idle'
  | 'stopping'
  | 'converting'
  | 'transcribing'
  | 'generating'
  | 'complete'
  | 'error';

interface ProgressBarProps {
  stage: GeneratingStage;
  progress?: number;
}

const STAGE_CONFIG: Record<GeneratingStage, { label: string; percent: number }> = {
  idle: { label: '', percent: 0 },
  stopping: { label: '停止录音...', percent: 10 },
  converting: { label: '转换音频格式...', percent: 30 },
  transcribing: { label: '语音转写中...', percent: 55 },
  generating: { label: 'AI 生成笔记...', percent: 80 },
  complete: { label: '生成完成', percent: 100 },
  error: { label: '生成失败', percent: 0 },
};

export function ProgressBar({ stage, progress }: ProgressBarProps) {
  const c = useThemeColors();
  const config = STAGE_CONFIG[stage];
  const percent = progress ?? config.percent;

  if (stage === 'idle') return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textSecondary }]}>
        {config.label}
      </Text>
      <View style={[styles.track, { backgroundColor: c.border }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: stage === 'error' ? c.danger : c.primary,
              width: `${percent}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.percent, { color: c.textSecondary }]}>
        {percent}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  percent: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
