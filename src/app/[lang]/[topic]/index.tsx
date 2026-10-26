import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, PhraseText } from '../../../components/ui';
import { usePhrasePlayer } from '../../../lib/audio';
import { getPhrases, getTopic, Lang } from '../../../lib/content';
import { useProgress } from '../../../lib/progress';

export default function TopicScreen() {
  const { lang, topic } = useLocalSearchParams<{ lang: Lang; topic: string }>();
  const phrases = getPhrases(lang, topic);
  const play = usePhrasePlayer();
  const { progress } = useProgress();
  const quizBest = progress.quiz[`${lang}:${topic}`];

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: getTopic(topic)?.title ?? '' }} />

      <View style={styles.actions}>
        <Button title="🎙️ Listen & repeat" onPress={() => router.push(`/${lang}/${topic}/practice`)} />
        <View style={styles.row}>
          <Button title="🃏 Flashcards" kind="secondary" style={{ flex: 1 }} onPress={() => router.push(`/${lang}/${topic}/flashcards`)} />
          <Button
            title={quizBest !== undefined ? `❓ Quiz · best ${Math.round(quizBest * 100)}%` : '❓ Quiz'}
            kind="secondary"
            style={{ flex: 1 }}
            onPress={() => router.push(`/${lang}/${topic}/quiz`)}
          />
        </View>
      </View>

      {phrases.map((p) => {
        const best = progress.speech[`${lang}:${p.id}`];
        return (
          <Pressable key={p.id} onPress={() => play(p.audio)}>
            <Card style={styles.phrase}>
              <View style={{ flex: 1 }}>
                <PhraseText phrase={p} size="small" />
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 24 }}>🔊</Text>
                {best !== undefined && <Text style={styles.best}>🎙️ {Math.round(best * 100)}%</Text>}
              </View>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10 },
  actions: { gap: 10, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  phrase: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  best: { fontSize: 12, color: colors.muted },
});
