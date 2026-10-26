import { lazy, Suspense, useEffect } from 'react';
import { usePracticeTime } from './lib/activity';
import { getTopic, isLang } from './lib/content';
import { setPref, useProgress } from './lib/progress';
import { navigate, useRoute } from './lib/router';
import { isModelReady, loadModel } from './lib/whisper';
import { Flashcards } from './screens/Flashcards';
import { Home } from './screens/Home';
import { Path } from './screens/Path';
import { PracticeHub } from './screens/PracticeHub';
import { ProgressScreen } from './screens/ProgressScreen';
import { Quiz } from './screens/Quiz';
import { Settings } from './screens/Settings';
import { TopicScreen } from './screens/TopicScreen';
import { AchievementHost } from './Achievements';
import { TabBar, useActiveTab } from './ui';

const Stories = lazy(() => import('./screens/Stories').then((m) => ({ default: m.StoryList })));
const StoryScreen = lazy(() => import('./screens/Stories').then((m) => ({ default: m.StoryScreen })));
const Writing = lazy(() => import('./screens/Writing').then((m) => ({ default: m.WritingList })));
const WritingChar = lazy(() => import('./screens/Writing').then((m) => ({ default: m.WritingScreen })));

// Practice and Lesson pull in the Chinese pinyin dictionary, so they load only when opened.
const Practice = lazy(() => import('./screens/Practice'));
const Lesson = lazy(() => import('./screens/Lesson'));
const Placement = lazy(() => import('./screens/Placement'));
const HandsFreeList = lazy(() => import('./screens/HandsFree').then((m) => ({ default: m.HandsFreeList })));
const HandsFreePlayer = lazy(() => import('./screens/HandsFree').then((m) => ({ default: m.HandsFreePlayer })));

export function App() {
  const tab = useActiveTab();
  return (
    <div className={tab ? 'app with-tabs' : 'app'}>
      <Routes />
      {tab && <TabBar active={tab} />}
      <AchievementHost />
    </div>
  );
}

function Routes() {
  const [first, topic, mode] = useRoute();
  const { lang: saved } = useProgress();
  const lang = isLang(first) ? first : null;
  // Anything past a language's path (lessons, reviews, phrasebook, stories, writing) is practice.
  usePracticeTime(lang && topic ? lang : null);

  useEffect(() => {
    // Warm up Whisper from the browser cache so the first check is quicker.
    if (isModelReady()) loadModel().catch(() => {});
  }, []);
  // Opening a language makes it the one the Learn and Practice tabs show.
  useEffect(() => {
    if (lang && lang !== saved) setPref('lang', lang);
  }, [lang, saved]);

  if (first === 'settings') return <Settings />;
  if (first === 'progress') return <ProgressScreen />;
  if (first === 'practice') return <PracticeHub lang={saved ?? 'es'} />;
  if (!lang) return saved ? <Path lang={saved} /> : <Home />;
  if (!topic) return <Path lang={lang} />;
  if (topic === 'stories')
    return <Suspense fallback={null}>{mode ? <StoryScreen key={mode} lang={lang} id={mode} /> : <Stories lang={lang} />}</Suspense>;
  if (lang === 'zh' && topic === 'write')
    return <Suspense fallback={null}>{mode ? <WritingChar key={mode} char={mode} /> : <Writing />}</Suspense>;
  if (topic === 'phrasebook') {
    navigate('/practice', { replace: true });
    return null;
  }
  if (topic === 'handsfree')
    return (
      <Suspense fallback={null}>{mode ? <HandsFreePlayer key={mode} lang={lang} id={mode} /> : <HandsFreeList lang={lang} />}</Suspense>
    );
  if (topic === 'placement')
    return (
      <Suspense fallback={null}>
        <Placement lang={lang} />
      </Suspense>
    );
  if (topic === 'learn' && mode)
    return (
      <Suspense fallback={null}>
        <Lesson key={mode} lang={lang} lessonId={mode} />
      </Suspense>
    );
  if (!getTopic(topic)) {
    navigate(`/${lang}`, { replace: true });
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
