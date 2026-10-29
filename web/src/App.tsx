import { lazy, Suspense, useEffect } from 'react';
import { usePracticeTime } from './lib/activity';
import { getTopic, isLang, type Lang } from './lib/content';
import { setPref, useProgress } from './lib/progress';
import { navigate, useRoute } from './lib/router';
import { isModelReady, loadModel } from './lib/whisper';
import { Flashcards } from './screens/Flashcards';
import { Home } from './screens/Home';
import { LevelScreen } from './screens/Level';
import { Path } from './screens/Path';
import { PracticeHub } from './screens/PracticeHub';
import { ProgressScreen } from './screens/ProgressScreen';
import { Quiz } from './screens/Quiz';
import { Move } from './screens/Move';
import { Reminder } from './screens/Reminder';
import { Settings } from './screens/Settings';
import { TopicScreen } from './screens/TopicScreen';
import { AchievementHost } from './Achievements';
import { getLesson, isAdultLesson } from './lib/course';
import { AdultGateScreen } from './screens/AdultGate';
import { TabBar, useActiveTab } from './ui';

const RolePlays = lazy(() => import('./screens/RolePlay').then((m) => ({ default: m.RolePlayList })));
const RolePlayScreen = lazy(() => import('./screens/RolePlay').then((m) => ({ default: m.GatedRolePlay })));
const ClassScreen = lazy(() => import('./screens/Class').then((m) => ({ default: m.ClassScreen })));
const Notebook = lazy(() => import('./screens/Notebook').then((m) => ({ default: m.Notebook })));
const MusicList = lazy(() => import('./screens/Music').then((m) => ({ default: m.MusicList })));
const MusicPlayer = lazy(() => import('./screens/Music').then((m) => ({ default: m.MusicPlayer })));
const Camera = lazy(() => import('./screens/Camera').then((m) => ({ default: m.CameraScreen })));
const Talk = lazy(() => import('./screens/Talk').then((m) => ({ default: m.Talk })));
const Articles = lazy(() => import('./screens/Stories').then((m) => ({ default: m.ArticleList })));
const Stories = lazy(() => import('./screens/Stories').then((m) => ({ default: m.StoryList })));
const StoryScreen = lazy(() => import('./screens/Stories').then((m) => ({ default: m.GatedStory })));
const Writing = lazy(() => import('./screens/Writing').then((m) => ({ default: m.WritingList })));
const WritingChar = lazy(() => import('./screens/Writing').then((m) => ({ default: m.WritingScreen })));

// Practice and Lesson pull in the Chinese pinyin dictionary, so they load only when opened.
const Practice = lazy(() => import('./screens/Practice'));
const Lesson = lazy(() => import('./screens/Lesson'));
const Placement = lazy(() => import('./screens/Placement'));
const Gallery = lazy(() => import('./characters/Gallery'));
const Play = lazy(() => import('./screens/play'));
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
  const { lang: saved, adult } = useProgress();
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

  if (first === 'gallery' && location.search.includes('test'))
    return (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    );
  if (first === 'settings') return topic === 'reminder' ? <Reminder /> : <Settings />;
  if (first === 'move') return <Move code={topic} />;
  if (first === 'progress') return <ProgressScreen />;
  if (first === 'practice') return <PracticeHub lang={saved ?? 'es'} />;
  if (!lang) return saved ? <Path lang={saved} /> : <Home />;
  if (!topic) return <Path lang={lang} />;
  // Flirting lessons, role-plays and dialogues need the one-tap 18+ check first.
  if (!adult && mode && isAdultRoute(lang, topic, mode)) return <AdultGateScreen back={topic === 'learn' ? `/${lang}` : `/${lang}/${topic}`} />;
  if (topic === 'camera')
    return (
      <Suspense fallback={null}>
        <Camera lang={lang} />
      </Suspense>
    );
  if (topic === 'play')
    return (
      <Suspense fallback={null}>
        <Play key={lang} lang={lang} />
      </Suspense>
    );
  if (topic === 'music')
    return <Suspense fallback={null}>{mode ? <MusicPlayer key={mode} lang={lang} id={mode} /> : <MusicList lang={lang} />}</Suspense>;
  if (topic === 'talk')
    return (
      <Suspense fallback={null}>
        <Talk key={mode ?? 'free'} lang={lang} scenarioId={mode} />
      </Suspense>
    );
  if (topic === 'roleplay')
    return <Suspense fallback={null}>{mode ? <RolePlayScreen key={mode} lang={lang} id={mode} /> : <RolePlays lang={lang} />}</Suspense>;
  if (topic === 'reading')
    return <Suspense fallback={null}>{mode ? <StoryScreen key={mode} lang={lang} id={mode} /> : <Articles lang={lang} />}</Suspense>;
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
  if (topic === 'level') return <LevelScreen lang={lang} />;
  if (topic === 'class' && mode)
    return (
      <Suspense fallback={null}>
        <ClassScreen key={mode} lang={lang} unitId={mode} />
      </Suspense>
    );
  if (topic === 'notebook')
    return (
      <Suspense fallback={null}>
        <Notebook lang={lang} />
      </Suspense>
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

function isAdultRoute(lang: Lang, topic: string, id: string): boolean {
  if (topic === 'learn') {
    const lesson = getLesson(lang, id);
    return !!lesson && isAdultLesson(lesson);
  }
  return false; // role-plays and dialogues check for themselves (their screens load only when opened)
}
