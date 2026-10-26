import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, PhraseText } from '../../../components/ui';
import { usePhrasePlayer } from '../../../lib/audio';
import { getPhrases, Lang, Phrase, shuffle } from '../../../lib/content';
import { MAX_BOX, useProgress } from '../../../lib/progress';

export default function Flashcards() {
  const { lang, topic } = useLocalSearchParams<{ lang: Lang; topic: string }>();
  const { cardBox, reviewCard } = useProgress();
  const play = usePhrasePlayer();

  // Least-known cards first; cards you miss go to the back of the deck to see again.
  const [deck, setDeck] = useState<Phrase[]>(() =>
    shuffle(getPhrases(lang, topic)).sort((a, b) => cardBox(lang, a.id) - cardBox(lang, b.id)),
  );
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const card = deck[0];

  const flip = () => {
    if (!flipped) play(card.audio);
    setFlipped(!flipped);
  };

  const answer = (knewIt: boolean) => {
    reviewCard(lang, card.id, knewIt);
    setFlipped(false);
    if (knewIt) {
      setDone((d) => d + 1);
      setDeck((d) => d.slice(1));
    } else {
      setDeck((d) => [...d.slice(1), d[0]]);
    }
  };

  if (!card) {
    return (
      <View style={styles.page}>
        <Stack.Screen options={{ title: 'Flashcards' }} />
        <Card style={{ gap: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text style={styles.big}>All {done} cards done!</Text>
          <Button title="Back to topic" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </Card>
      </View>
    );
  }

  const box = cardBox(lang, card.id);
  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: `Flashcards · ${deck.length} left` }} />
      <Pressable onPress={flip} style={{ flex: 1 }}>
        <Card style={styles.card}>
          <Text style={styles.level}>{'●'.repeat(box) + '○'.repeat(MAX_BOX - box)}</Text>
          {flipped ? (
            <>
              <PhraseText phrase={card} showEnglish={false} />
              <Text style={styles.english}>{card.en}</Text>
            </>
          ) : (
            <>
              <Text style={styles.big}>{card.en}</Text>
              <Text style={styles.muted}>Say it out loud, then tap to check</Text>
            </>
          )}
        </Card>
      </Pressable>

      {flipped ? (
        <View style={styles.row}>
          <Button title="✗ Again" kind="danger" style={{ flex: 1 }} onPress={() => answer(false)} />
          <Button title="✓ Got it" style={{ flex: 1, backgroundColor: colors.ok }} onPress={() => answer(true)} />
        </View>
      ) : (
        <Button title="Show answer" onPress={flip} />
      )}
      {flipped && <Button title="🔊 Play again" kind="secondary" onPress={() => play(card.audio)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12, paddingBottom: 40 },
  card: { flex: 1, justifyContent: 'center', gap: 16 },
  level: { position: 'absolute', top: 16, right: 18, color: colors.ok, letterSpacing: 2 },
  big: { fontSize: 28, fontWeight: '600', color: colors.text },
  english: { fontSize: 18, color: colors.muted },
  muted: { fontSize: 15, color: colors.muted },
  row: { flexDirection: 'row', gap: 10 },
});
