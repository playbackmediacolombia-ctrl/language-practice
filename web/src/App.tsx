import { lazy, Suspense, useEffect } from 'react';
import { getTopic, isLang } from './lib/content';
import { navigate, useRoute } from './lib/router';
import { isModelReady, loadModel } from './lib/whisper';
import { Flashcards } from './screens/Flashcards';
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { Settings } from './screens/Settings';
import { TopicScreen } from './screens/TopicScreen';
import { Topics } from './screens/Topics';

// Practice pulls in the Chinese pinyin dictionary, so it loads only when opened.
const Practice = lazy(() => import('./screens/Practice'));

export function App() {
  const [first, topic, mode] = useRoute();

  useEffect(() => {
    // Warm up Whisper from the browser cache so the first check is quicker.
    if (isModelReady()) loadModel().catch(() => {});
  }, []);

  if (first === 'settings') return <Settings />;
  if (!isLang(first)) return <Home />;
  if (!topic) return <Topics lang={first} />;
  if (!getTopic(topic)) {
    navigate(`/${first}`, true);
    return null;
  }
  if (mode === 'practice')
    return (
      <Suspense fallback={null}>
        <Practice lang={first} topic={topic} />
      </Suspense>
    );
  if (mode === 'flashcards') return <Flashcards lang={first} topic={topic} />;
  if (mode === 'quiz') return <Quiz lang={first} topic={topic} />;
  return <TopicScreen lang={first} topic={topic} />;
}
