import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors, ProgressBar } from '../../components/ui';
import { getPhrases, getTopics, Lang, langInfo } from '../../lib/content';
import { MAX_BOX, useProgress } from '../../lib/progress';

export default function Topics() {
  const { lang } = useLocalSearchParams<{ lang: Lang }>();
  const { cardBox } = useProgress();
  const info = langInfo(lang);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: `${info.flag} ${info.name}` }} />
      {getTopics().map((topic) => {
        const phrases = getPhrases(lang, topic.id);
        const learned = phrases.reduce((sum, p) => sum + cardBox(lang, p.id) / MAX_BOX, 0) / phrases.length;
        return (
          <Link key={topic.id} href={`/${lang}/${topic.id}`} asChild>
            <Pressable>
              <Card style={{ gap: 10 }}>
                <View style={styles.row}>
                  <Text style={styles.emoji}>{topic.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{topic.title}</Text>
                    <Text style={styles.muted}>{phrases.length} phrases</Text>
                  </View>
                  <Text style={styles.muted}>{Math.round(learned * 100)}%</Text>
                </View>
                <ProgressBar value={learned} />
              </Card>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emoji: { fontSize: 30 },
  title: { fontSize: 19, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
});
