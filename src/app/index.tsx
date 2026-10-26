import { Link, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, colors } from '../components/ui';
import { LANGS } from '../lib/content';
import { isModelDownloaded } from '../lib/whisper';

export default function Home() {
  const [modelReady, setModelReady] = useState(isModelDownloaded());
  useFocusEffect(useCallback(() => setModelReady(isModelDownloaded()), []));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: 'Language Practice' }} />
      <Text style={styles.heading}>What do you want to practice?</Text>

      {LANGS.map((lang) => (
        <Link key={lang.id} href={`/${lang.id}`} asChild>
          <Pressable>
            <Card style={styles.langCard}>
              <Text style={styles.flag}>{lang.flag}</Text>
              <View>
                <Text style={styles.langName}>{lang.name}</Text>
                <Text style={styles.langNative}>{lang.native}</Text>
              </View>
            </Card>
          </Pressable>
        </Link>
      ))}

      <Link href="/model" asChild>
        <Pressable>
          <Card style={styles.modelCard}>
            <Text style={styles.modelTitle}>🎙️ Speech checking</Text>
            <Text style={styles.modelText}>
              {modelReady
                ? 'Whisper model is on this phone. Works offline.'
                : 'Not set up yet. Tap to download the Whisper model once (Wi‑Fi recommended).'}
            </Text>
          </Card>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flag: { fontSize: 40 },
  langName: { fontSize: 20, fontWeight: '600', color: colors.text },
  langNative: { fontSize: 15, color: colors.muted },
  modelCard: { marginTop: 12, gap: 4 },
  modelTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  modelText: { fontSize: 15, color: colors.muted },
});
