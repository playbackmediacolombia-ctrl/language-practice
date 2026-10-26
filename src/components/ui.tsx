import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import type { Phrase } from '../lib/content';

export const colors = {
  bg: '#F6F4EF',
  card: '#FFFFFF',
  text: '#1F2328',
  muted: '#6B7280',
  border: '#E5E1D8',
  accent: '#2563EB',
  ok: '#15803D',
  okBg: '#DCFCE7',
  close: '#B45309',
  closeBg: '#FEF3C7',
  wrong: '#B91C1C',
  wrongBg: '#FEE2E2',
};

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = kind === 'primary' ? colors.accent : kind === 'danger' ? colors.wrong : colors.card;
  const fg = kind === 'secondary' ? colors.text : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Phrase in the target language, pinyin for Chinese, and optionally the English. */
export function PhraseText({ phrase, showEnglish = true, size = 'large' }: { phrase: Phrase; showEnglish?: boolean; size?: 'large' | 'small' }) {
  const big = size === 'large';
  return (
    <View style={{ gap: 4 }}>
      <Text style={[styles.target, big ? { fontSize: phrase.pinyin ? 40 : 30 } : { fontSize: 20 }]}>{phrase.text}</Text>
      {phrase.pinyin && <Text style={[styles.pinyin, { fontSize: big ? 22 : 15 }]}>{phrase.pinyin}</Text>}
      {showEnglish && <Text style={[styles.english, { fontSize: big ? 18 : 14 }]}>{phrase.en}</Text>}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border },
  target: { color: colors.text, fontWeight: '600' },
  pinyin: { color: colors.accent },
  english: { color: colors.muted },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.ok },
});
