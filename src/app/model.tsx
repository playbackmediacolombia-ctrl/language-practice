import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, ProgressBar } from '../components/ui';
import { deleteModel, downloadModel, isModelDownloaded, MODEL_SIZE_MB, warmUpWhisper } from '../lib/whisper';

export default function ModelScreen() {
  const [ready, setReady] = useState(isModelDownloaded());
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    setProgress(0);
    try {
      await downloadModel(setProgress);
      setReady(true);
      warmUpWhisper();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  const remove = () =>
    Alert.alert('Delete the speech model?', `This frees about ${MODEL_SIZE_MB} MB. You can download it again later.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteModel();
          setReady(false);
        },
      },
    ]);

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: 'Speech checking' }} />
      <Card style={{ gap: 10 }}>
        <Text style={styles.text}>
          Listen &amp; Repeat uses Whisper (multilingual “small” model) running entirely on your iPhone. It is downloaded
          once (about {MODEL_SIZE_MB} MB, free from Hugging Face), then works with no internet.
        </Text>
        {ready ? (
          <Text style={[styles.text, { color: colors.ok, fontWeight: '600' }]}>✓ Model installed</Text>
        ) : progress !== null ? (
          <View style={{ gap: 8 }}>
            <ProgressBar value={progress} />
            <Text style={styles.muted}>
              Downloading… {Math.round(progress * 100)}% — keep the app open.
            </Text>
          </View>
        ) : (
          <Button title={`Download model (${MODEL_SIZE_MB} MB)`} onPress={download} />
        )}
        {error && <Text style={{ color: colors.wrong }}>{error}</Text>}
      </Card>
      {ready && <Button title="Delete model" kind="secondary" onPress={remove} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  text: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted },
});
