import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, PhraseText } from '../../../components/ui';
import { usePhrasePlayer, useWavRecorder } from '../../../lib/audio';
import { compare, Comparison } from '../../../../shared/compare';
import { getPhrases, Lang } from '../../../lib/content';
import { useProgress } from '../../../lib/progress';
import { isModelDownloaded, transcribe } from '../../../lib/whisper';

type State =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'thinking' }
  | { kind: 'result'; heard: string; result: Comparison }
  | { kind: 'error'; message: string };

const TOKEN_STYLE = {
  ok: { color: colors.ok, backgroundColor: colors.okBg },
  close: { color: colors.close, backgroundColor: colors.closeBg },
  wrong: { color: colors.wrong, backgroundColor: colors.wrongBg },
};

export default function Practice() {
  const { lang, topic } = useLocalSearchParams<{ lang: Lang; topic: string }>();
  const phrases = getPhrases(lang, topic);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const play = usePhrasePlayer();
  const recorder = useWavRecorder();
  const { recordSpeech } = useProgress();
  const phrase = phrases[index];

  if (!isModelDownloaded()) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: 'Listen & repeat' }} />
        <Card style={{ gap: 12 }}>
          <Text style={styles.text}>To check your pronunciation, download the Whisper speech model once.</Text>
          <Button title="Set up speech checking" onPress={() => router.replace('/model')} />
        </Card>
      </View>
    );
  }

  const go = (delta: number) => {
    setIndex((i) => (i + delta + phrases.length) % phrases.length);
    setState({ kind: 'idle' });
  };

  const toggleRecording = async () => {
    try {
      if (state.kind === 'recording') {
        setState({ kind: 'thinking' });
        const uri = await recorder.stop();
        if (!uri) throw new Error('Nothing was recorded.');
        const heard = await transcribe(uri, lang);
        const result = compare(phrase.text, heard, lang, phrase.alt);
        recordSpeech(lang, phrase.id, result.score);
        setState({ kind: 'result', heard, result });
      } else {
        await recorder.start();
        setState({ kind: 'recording' });
      }
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const recording = state.kind === 'recording';
  const thinking = state.kind === 'thinking';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: `Listen & repeat  ${index + 1}/${phrases.length}` }} />

      <Card style={{ gap: 16 }}>
        <PhraseText phrase={phrase} />
        <View style={styles.row}>
          <Button title="🔊 Listen" kind="secondary" style={{ flex: 1 }} onPress={() => play(phrase.audio)} />
          <Button title="🐢 Slow" kind="secondary" style={{ flex: 1 }} onPress={() => play(phrase.audio, true)} />
        </View>
      </Card>

      <Pressable
        onPress={toggleRecording}
        disabled={thinking}
        style={({ pressed }) => [styles.mic, recording && styles.micOn, { opacity: thinking ? 0.5 : pressed ? 0.8 : 1 }]}
      >
        {thinking ? <ActivityIndicator color="#fff" size="large" /> : <Text style={styles.micIcon}>{recording ? '■' : '🎙️'}</Text>}
      </Pressable>
      <Text style={styles.hint}>
        {recording ? 'Speak now… tap to stop' : thinking ? 'Checking what you said…' : 'Tap the mic and say the phrase'}
      </Text>

      {state.kind === 'result' && (
        <Card style={{ gap: 12 }}>
          <Text style={styles.score}>{Math.round(state.result.score * 100)}%</Text>
          <View style={styles.tokens}>
            {state.result.tokens.map((t, i) => (
              <Text key={i} style={[styles.token, TOKEN_STYLE[t.status]]}>
                {t.text}
              </Text>
            ))}
          </View>
          <Text style={styles.muted}>Whisper heard: “{state.heard || '(nothing)'}”</Text>
          <Text style={styles.legend}>
            <Text style={{ color: colors.ok }}>green</Text> = right · <Text style={{ color: colors.close }}>orange</Text> = almost ·{' '}
            <Text style={{ color: colors.wrong }}>red</Text> = missed or wrong
          </Text>
        </Card>
      )}
      {state.kind === 'error' && <Text style={{ color: colors.wrong, textAlign: 'center' }}>{state.message}</Text>}

      <View style={styles.row}>
        <Button title="‹ Previous" kind="secondary" style={{ flex: 1 }} onPress={() => go(-1)} disabled={recording || thinking} />
        <Button title="Next ›" style={{ flex: 1 }} onPress={() => go(1)} disabled={recording || thinking} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 10 },
  text: { fontSize: 16, color: colors.text },
  mic: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOn: { backgroundColor: colors.wrong },
  micIcon: { fontSize: 40, color: '#fff' },
  hint: { textAlign: 'center', color: colors.muted, fontSize: 15, marginTop: -6 },
  score: { fontSize: 32, fontWeight: '700', color: colors.text },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  token: { fontSize: 24, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  muted: { color: colors.muted, fontSize: 15 },
  legend: { color: colors.muted, fontSize: 13 },
});
