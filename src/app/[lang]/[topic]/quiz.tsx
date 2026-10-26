import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, PhraseText } from '../../../components/ui';
import { usePhrasePlayer } from '../../../lib/audio';
import { getPhrases, Lang, Phrase, shuffle } from '../../../lib/content';
import { useProgress } from '../../../lib/progress';

type Question = {
  phrase: Phrase;
  /** 'listen': hear it, pick the English. 'read': see English, pick the phrase. */
  mode: 'listen' | 'read';
  options: Phrase[];
};

function makeQuiz(phrases: Phrase[]): Question[] {
  return shuffle(phrases).map((phrase, i) => ({
    phrase,
    mode: i % 2 === 0 ? 'listen' : 'read',
    options: shuffle([phrase, ...shuffle(phrases.filter((p) => p.id !== phrase.id)).slice(0, 3)]),
  }));
}

export default function Quiz() {
  const { lang, topic } = useLocalSearchParams<{ lang: Lang; topic: string }>();
  const phrases = useMemo(() => getPhrases(lang, topic), [lang, topic]);
  const [questions, setQuestions] = useState(() => makeQuiz(phrases));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const play = usePhrasePlayer();
  const { recordQuiz } = useProgress();

  const q = questions[index];
  const finished = index >= questions.length;

  useEffect(() => {
    if (q?.mode === 'listen') play(q.phrase.audio);
  }, [q, play]);

  const pick = (option: Phrase) => {
    if (picked) return;
    setPicked(option.id);
    if (option.id === q.phrase.id) setCorrect((c) => c + 1);
    if (q.mode === 'read') play(q.phrase.audio);
  };

  const next = () => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) recordQuiz(lang, topic, correct / questions.length);
    setPicked(null);
    setIndex(nextIndex);
  };

  const restart = () => {
    setQuestions(makeQuiz(phrases));
    setIndex(0);
    setCorrect(0);
    setPicked(null);
  };

  if (finished) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: 'Quiz' }} />
        <Card style={{ gap: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>{correct === questions.length ? '🏆' : '👏'}</Text>
          <Text style={styles.big}>
            {correct} / {questions.length} correct
          </Text>
          <Button title="Try again" onPress={restart} style={{ alignSelf: 'stretch' }} />
          <Button title="Back to topic" kind="secondary" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </Card>
      </View>
    );
  }

  const optionStyle = (option: Phrase) => {
    if (!picked) return undefined;
    if (option.id === q.phrase.id) return { backgroundColor: colors.okBg, borderColor: colors.ok };
    if (option.id === picked) return { backgroundColor: colors.wrongBg, borderColor: colors.wrong };
    return { opacity: 0.5 };
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: `Quiz  ${index + 1}/${questions.length}` }} />
      <Card style={{ gap: 12 }}>
        {q.mode === 'listen' ? (
          <>
            <Text style={styles.prompt}>What does this mean?</Text>
            {picked ? <PhraseText phrase={q.phrase} showEnglish={false} /> : null}
            <Button title="🔊 Play again" kind="secondary" onPress={() => play(q.phrase.audio)} />
          </>
        ) : (
          <>
            <Text style={styles.prompt}>How do you say…</Text>
            <Text style={styles.big}>{q.phrase.en}</Text>
          </>
        )}
      </Card>

      {q.options.map((option) => (
        <Button
          key={option.id}
          kind="secondary"
          title={q.mode === 'listen' ? option.en : option.pinyin ? `${option.text}\n${option.pinyin}` : option.text}
          onPress={() => pick(option)}
          style={optionStyle(option)}
        />
      ))}

      {picked && <Button title={index + 1 === questions.length ? 'See score' : 'Next ›'} onPress={next} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  prompt: { fontSize: 15, color: colors.muted },
  big: { fontSize: 26, fontWeight: '600', color: colors.text },
});
