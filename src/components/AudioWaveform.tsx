// AudioWaveform: 录音过程中的实时语音波形可视化
// 自包含模拟波形：基于 requestAnimationFrame 生成视觉波形，不依赖 metering API

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';

interface AudioWaveformProps {
  /** 是否正在录音 */
  isActive: boolean;
  /** 容器样式 */
  style?: ViewStyle;
  /** 柱子最大高度 */
  barHeight?: number;
  /** 柱子数量 */
  barCount?: number;
}

const DEFAULT_BAR_COUNT = 32;
const DEFAULT_BAR_HEIGHT = 56;
const FPS = 15; // 降频避免性能问题

export function AudioWaveform({
  isActive,
  style,
  barHeight = DEFAULT_BAR_HEIGHT,
  barCount = DEFAULT_BAR_COUNT,
}: AudioWaveformProps) {
  const c = useThemeColors();
  const [bars, setBars] = useState<number[]>(() => new Array(barCount).fill(0));
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      // 停止时：所有柱子归零
      setBars(new Array(barCount).fill(0));
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const interval = 1000 / FPS;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameRef.current >= interval) {
        lastFrameRef.current = timestamp;
        phaseRef.current += 0.15;

        const newBars = new Array(barCount).fill(0).map((_, i) => {
          // 多层正弦波叠加，产生自然起伏效果
          const wave1 = Math.sin(phaseRef.current + i * 0.3) * 0.4;
          const wave2 = Math.sin(phaseRef.current * 1.7 + i * 0.5) * 0.25;
          const wave3 = Math.sin(phaseRef.current * 0.5 + i * 0.8) * 0.15;
          // 随机抖动
          const noise = (Math.sin(phaseRef.current * 3 + i * 11) * 0.5 + 0.5) * 0.2;
          // 中间的柱子稍高
          const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2);
          const curveFactor = 1 - distFromCenter * 0.3;

          const value = (0.3 + wave1 + wave2 + wave3 + noise) * curveFactor;
          return Math.max(0.08, Math.min(1, value));
        });

        setBars(newBars);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, barCount]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.waveformRow}>
        {bars.map((level, index) => {
          const height = isActive ? Math.max(3, level * barHeight) : 3;
          const opacity = isActive ? Math.max(0.35, level * 0.8) : 0.15;

          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: c.primary,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 3,
    marginHorizontal: 1,
  },
});
