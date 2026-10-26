import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors } from '../components/ui';
import { ProgressProvider } from '../lib/progress';
import { warmUpWhisper } from '../lib/whisper';

export default function RootLayout() {
  useEffect(() => {
    warmUpWhisper();
  }, []);

  return (
    <ProgressProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </ProgressProvider>
  );
}
