
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
    seenIds: {},
    unknownQueue: {},
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
        seenIds: parsed.seenIds || {},
        unknownQueue: parsed.unknownQueue || {},
      });
    }

    // 초기 히스토리 상태 설정 (홈)
    window.history.replaceState({ view: ViewMode.HOME }, '');
  }, []);

  // 하드웨어 뒤로가기 버튼 감지 로직
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
        // 만약 홈으로 돌아가는 거라면 선택된 챕터도 해제
        if (event.state.view === ViewMode.HOME) {
          setSelectedChapter(null);
        }
      } else {
        setView(ViewMode.HOME);
        setSelectedChapter(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save progress
  useEffect(() => {
    const dataToSave = {
      chapterKnownIds: progress.chapterKnownIds,
      failCounts: progress.failCounts,
      bookmarks: Array.from(progress.bookmarks),
      seenIds: progress.seenIds || {},
      unknownQueue: progress.unknownQueue || {},
    };
    localStorage.setItem('rota_progress_v3', JSON.stringify(dataToSave));
  }, [progress]);

  // 네비게이션 헬퍼 (히스토리 푸시 포함)
  const navigateTo = (newView: ViewMode, chapter: Chapter | null = null) => {
    setView(newView);
    setSelectedChapter(chapter);
    window.history.pushState({ view: newView, chapterId: chapter?.id }, '');
  };

  const handleBack = () => {
    // 인앱 뒤로가기 클릭 시 브라우저 히스토리 뒤로가기 실행
    // 이를 통해 popstate 이벤트가 발생하고 위에서 등록한 handlePopState가 실행됨
    window.history.back();
  };

  const handleStartChapter = (chapter: Chapter) => {
    navigateTo(ViewMode.STUDY, chapter);
  };

  const markKnown = useCallback((sentenceId: number, chapterId: number) => {
    setProgress(prev => {
      const currentChapterKnown = prev.chapterKnownIds[chapterId] || [];
      if (currentChapterKnown.includes(sentenceId)) return prev;
      const nextSeen = { ...(prev.seenIds || {}) };
      const seenList = new Set(nextSeen[chapterId] || []);
      seenList.add(sentenceId);
      nextSeen[chapterId] = Array.from(seenList);

      const nextUnknown = { ...(prev.unknownQueue || {}) };
      if (nextUnknown[chapterId]) {
        nextUnknown[chapterId] = nextUnknown[chapterId].filter(i => i !== sentenceId);
        if (nextUnknown[chapterId].length === 0) delete nextUnknown[chapterId];
      }

      return {
        ...prev,
        chapterKnownIds: {
          ...prev.chapterKnownIds,
          [chapterId]: [...currentChapterKnown, sentenceId]
        },
        seenIds: nextSeen,
        unknownQueue: nextUnknown
      };
    });
  }, []);

  const resetChapterProgress = (chapterId: number) => {
    setProgress(prev => {
      const nextChapterKnownIds = { ...prev.chapterKnownIds };
      delete nextChapterKnownIds[chapterId];
      const nextSeen = { ...(prev.seenIds || {}) };
      delete nextSeen[chapterId];
      return {
        ...prev,
        chapterKnownIds: nextChapterKnownIds,
        seenIds: nextSeen
      };
    });
  };

  const markUnknown = useCallback((id: number, chapterId: number) => {
    setProgress(prev => {
      const nextFailCounts = { ...prev.failCounts };
      nextFailCounts[id] = (nextFailCounts[id] || 0) + 1;

      const nextBookmarks = new Set(prev.bookmarks);
      if (nextFailCounts[id] >= 3) {
        nextBookmarks.add(id);
      }

      const nextUnknown = { ...(prev.unknownQueue || {}) };
      const list = new Set(nextUnknown[chapterId] || []);
      list.add(id);
      nextUnknown[chapterId] = Array.from(list);

      return { ...prev, failCounts: nextFailCounts, bookmarks: nextBookmarks, unknownQueue: nextUnknown };
    });
  }, []);

  const consumeUnknowns = useCallback((chapterId: number, ids: number[]) => {
    setProgress(prev => {
      const nextUnknown = { ...(prev.unknownQueue || {}) };
      if (!nextUnknown[chapterId]) return prev;
      nextUnknown[chapterId] = (nextUnknown[chapterId] || []).filter(i => !ids.includes(i));
      if (nextUnknown[chapterId].length === 0) delete nextUnknown[chapterId];
      return { ...prev, unknownQueue: nextUnknown };
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
    const seenInChapter = new Set((progress.seenIds && progress.seenIds[selectedChapter.id]) || []);
    const unknownInChapter = new Set((progress.unknownQueue && progress.unknownQueue[selectedChapter.id]) || []);

    if (selectedChapter.id === 999) {
      // 북마크 모드: 북마크된 문장 중 이미 본 것은 제외
      return ALL_SENTENCES.filter(s => progress.bookmarks.has(s.id) && !seenInChapter.has(s.id));
    }

    const knownInChapter = new Set(progress.chapterKnownIds[selectedChapter.id] || []);
    return ALL_SENTENCES
      .filter(s => s.id >= selectedChapter.range[0] && s.id <= selectedChapter.range[1])
      .filter(s => !knownInChapter.has(s.id) && !seenInChapter.has(s.id) && !unknownInChapter.has(s.id));
  }, [selectedChapter?.id, progress.bookmarks.size, progress.chapterKnownIds, progress.seenIds, progress.unknownQueue]);

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
          onViewBookmarks={() => navigateTo(ViewMode.BOOKMARKS)}
          bookmarkCount={progress.bookmarks.size}
        />
      )}
      
      {view === ViewMode.BOOKMARKS && (
        <BookmarkListView 
          sentences={bookmarkedSentences}
          onBack={handleBack}
          onToggleBookmark={toggleBookmark}
          onStartStudy={() => {
            const bookmarkChapter: Chapter = { id: 999, title: '저장된 문장', range: [0, 0] };
            navigateTo(ViewMode.STUDY, bookmarkChapter);
          }}
        />
      )}

      {view === ViewMode.STUDY && selectedChapter && (
        <StudyView 
          chapter={selectedChapter}
          sentences={currentSentences}
          knownIds={new Set(progress.chapterKnownIds[selectedChapter.id] || [])}
          bookmarks={progress.bookmarks}
          onBack={handleBack}
          onMarkKnown={(id) => markKnown(id, selectedChapter.id)}
            onMarkUnknown={(id) => markUnknown(id, selectedChapter.id)}
          seenOffset={(progress.seenIds && progress.seenIds[selectedChapter.id]) ? progress.seenIds[selectedChapter.id].length : 0}
          pendingUnknowns={(progress.unknownQueue && progress.unknownQueue[selectedChapter.id]) ? ALL_SENTENCES.filter(s => (progress.unknownQueue![selectedChapter.id] || []).includes(s.id)) : []}
          onConsumeUnknowns={(ids) => consumeUnknowns(selectedChapter.id, ids)}
          onToggleBookmark={toggleBookmark}
        />
      )}
    </div>
  );
};

export default App;
