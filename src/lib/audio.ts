import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback } from 'react';

/** Plays the bundled phrase MP3s. One player per screen, swapped between phrases. */
export function usePhrasePlayer() {
  const player = useAudioPlayer(null);
  return useCallback(
    async (source: number, slow = false) => {
      player.replace(source);
      player.setPlaybackRate(slow ? 0.7 : 1);
      await player.seekTo(0);
      player.play();
    },
    [player],
  );
}

// 16 kHz mono 16-bit PCM WAV: exactly what Whisper wants, no conversion needed.
const WAV_16K: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    outputFormat: 'default',
    audioEncoder: 'default',
  },
  web: {},
};

export function useWavRecorder() {
  const recorder = useAudioRecorder(WAV_16K);

  const start = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) throw new Error('Microphone permission is off. Turn it on in Settings › Language Practice.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  /** Stops recording and returns the WAV file URI. */
  const stop = useCallback(async () => {
    await recorder.stop();
    // Switch back so playback uses the loud speaker instead of the earpiece.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return recorder.uri;
  }, [recorder]);

  return { start, stop };
}
