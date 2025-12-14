
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewMode, UserProgress, Chapter, Sentence } from './types';
import { CHAPTERS, ALL_SENTENCES } from './constants';
import HomeView from './components/HomeView';
import StudyView from './components/StudyView';
import BookmarkListView from './components/BookmarkListView';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [progress, setProgress] = useState<UserProgress>({
    chapterKnownIds: {},
    failCounts: {},
    bookmarks: new Set<number>(),
  });

  // Load progress
  useEffect(() => {
    const savedProgress = localStorage.getItem('rota_progress_v3');
    if (savedProgress) {
      const parsed = JSON.parse(savedProgress);
      setProgress({
        chapterKnownIds: parsed.chapterKnownIds || {},
        failCounts: parsed.failCounts || {},
        bookmarks: new Set(parsed.bookmarks || []),
      });
    }
  }, []);

  // Save progress
  useEffect(() => {
    const dataToSave = {
      chapterKnownIds: progress.chapterKnownIds,
      failCounts: progress.failCounts,
      bookmarks: Array.from(progress.bookmarks),
    };
    localStorage.setItem('rota_progress_v3', JSON.stringify(dataToSave));
  }, [progress]);

  const handleStartChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setView(ViewMode.STUDY);
  };

  const markKnown = useCallback((sentenceId: number, chapterId: number) => {
    setProgress(prev => {
      const currentChapterKnown = prev.chapterKnownIds[chapterId] || [];
      if (currentChapterKnown.includes(sentenceId)) return prev;
      
      return {
        ...prev,
        chapterKnownIds: {
          ...prev.chapterKnownIds,
          [chapterId]: [...currentChapterKnown, sentenceId]
        }
      };
    });
  }, []);

  const resetChapterProgress = (chapterId: number) => {
    setProgress(prev => {
      const nextChapterKnownIds = { ...prev.chapterKnownIds };
      delete nextChapterKnownIds[chapterId];
      return {
        ...prev,
        chapterKnownIds: nextChapterKnownIds
      };
    });
  };

  const markUnknown = useCallback((id: number) => {
    setProgress(prev => {
      const nextFailCounts = { ...prev.failCounts };
      nextFailCounts[id] = (nextFailCounts[id] || 0) + 1;
      
      const nextBookmarks = new Set(prev.bookmarks);
      if (nextFailCounts[id] >= 3) {
        nextBookmarks.add(id);
      }
      
      return { ...prev, failCounts: nextFailCounts, bookmarks: nextBookmarks };
    });
  }, []);

  const toggleBookmark = useCallback((id: number) => {
    setProgress(prev => {
      const next = new Set(prev.bookmarks);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, bookmarks: next };
    });
  }, []);

  const currentSentences = useMemo(() => {
    if (!selectedChapter) return [];
    if (selectedChapter.id === 999) {
      return ALL_SENTENCES.filter(s => progress.bookmarks.has(s.id));
    }
    // 레벨별 범위 누적 적용
    return ALL_SENTENCES.filter(s => s.id >= selectedChapter.range[0] && s.id <= selectedChapter.range[1]);
  }, [selectedChapter?.id, progress.bookmarks.size]);

  const bookmarkedSentences = useMemo(() => {
    return ALL_SENTENCES.filter(s => progress.bookmarks.has(s.id));
  }, [progress.bookmarks]);

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-white shadow-xl overflow-hidden relative">
      {view === ViewMode.HOME && (
        <HomeView 
          chapters={CHAPTERS} 
          onSelectChapter={handleStartChapter} 
          chapterKnownIds={progress.chapterKnownIds}
          onResetChapter={resetChapterProgress}
          onViewBookmarks={() => setView(ViewMode.BOOKMARKS)}
          bookmarkCount={progress.bookmarks.size}
        />
      )}
      
      {view === ViewMode.BOOKMARKS && (
        <BookmarkListView 
          sentences={bookmarkedSentences}
          onBack={() => setView(ViewMode.HOME)}
          onToggleBookmark={toggleBookmark}
          onStartStudy={() => {
            const bookmarkChapter: Chapter = { id: 999, title: '저장된 문장', range: [0, 0] };
            setSelectedChapter(bookmarkChapter);
            setView(ViewMode.STUDY);
          }}
        />
      )}

      {view === ViewMode.STUDY && selectedChapter && (
        <StudyView 
          chapter={selectedChapter}
          sentences={currentSentences}
          knownIds={new Set(progress.chapterKnownIds[selectedChapter.id] || [])}
          bookmarks={progress.bookmarks}
          onBack={() => {
            if (selectedChapter.id === 999) setView(ViewMode.BOOKMARKS);
            else setView(ViewMode.HOME);
          }}
          onMarkKnown={(id) => markKnown(id, selectedChapter.id)}
          onMarkUnknown={markUnknown}
          onToggleBookmark={toggleBookmark}
        />
      )}
    </div>
  );
};

export default App;
