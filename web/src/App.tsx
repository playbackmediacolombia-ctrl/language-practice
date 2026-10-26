import { lazy, Suspense, useEffect } from 'react';
import { getTopic, isLang } from './lib/content';
import { navigate, useRoute } from './lib/router';
import { isModelReady, loadModel } from './lib/whisper';
import { Flashcards } from './screens/Flashcards';
import { Home } from './screens/Home';
import { Path } from './screens/Path';
import { Quiz } from './screens/Quiz';
import { Settings } from './screens/Settings';
import { TopicScreen } from './screens/TopicScreen';
import { Topics } from './screens/Topics';

// Practice and Lesson pull in the Chinese pinyin dictionary, so they load only when opened.
const Practice = lazy(() => import('./screens/Practice'));
const Lesson = lazy(() => import('./screens/Lesson'));

export function App() {
  const [first, topic, mode] = useRoute();
  const lang = isLang(first) ? first : null;

  useEffect(() => {
    // Warm up Whisper from the browser cache so the first check is quicker.
    if (isModelReady()) loadModel().catch(() => {});
  }, []);

  if (first === 'settings') return <Settings />;
  if (!lang) return <Home />;
  if (!topic) return <Path lang={lang} />;
  if (topic === 'phrasebook') return <Topics lang={lang} />;
  if (topic === 'learn' && mode)
    return (
      <Suspense fallback={null}>
        <Lesson key={mode} lang={lang} lessonId={mode} />
      </Suspense>
    );
  if (!getTopic(topic)) {
    navigate(`/${lang}`, true);
    return null;
  }
  if (mode === 'practice')
    return (
      <Suspense fallback={null}>
        <Practice lang={lang} topic={topic} />
      </Suspense>
    );
  if (mode === 'flashcards') return <Flashcards lang={lang} topic={topic} />;
  if (mode === 'quiz') return <Quiz lang={lang} topic={topic} />;
  return <TopicScreen lang={lang} topic={topic} />;
}
