import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sentence, Chapter } from '../types';
import { THEME_COLOR, SECONDARY_COLOR } from '../constants';

interface StudyViewProps {
  chapter: Chapter;
  sentences: Sentence[];
  knownIds: Set<number>;
  bookmarks: Set<number>;
  onBack: () => void;
  onMarkKnown: (id: number) => void;
  onMarkUnknown: (id: number) => void;
  onToggleBookmark: (id: number) => void;
  seenOffset?: number;
  pendingUnknowns?: Sentence[];
  onConsumeUnknowns?: (ids: number[]) => void;
}

const StudyView: React.FC<StudyViewProps> = ({
  chapter,
  sentences,
  knownIds,
  bookmarks,
  onBack,
  onMarkKnown,
  onMarkUnknown,
  onToggleBookmark,
  seenOffset = 0,
  pendingUnknowns = [],
  onConsumeUnknowns
}) => {
  const [round, setRound] = useState(1);
  const [sessionSentences, setSessionSentences] = useState<Sentence[]>([]);
  const [unknownsInCurrentRound, setUnknownsInCurrentRound] = useState<Sentence[]>([]);
  const unknownsRef = useRef<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isAllFinished, setIsAllFinished] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const initialKnownIds = useRef<Set<number>>(new Set(knownIds));
  const chapterIdRef = useRef(chapter.id);
  const initialSeenOffsetRef = useRef<number>(seenOffset || 0);
  const sessionSeenSetRef = useRef<Set<number>>(new Set());
  const advancesRef = useRef<number>(0);
  const lastActionRef = useRef<'known' | 'unknown' | null>(null);
  const [showContinueModal, setShowContinueModal] = useState(false);

  useEffect(() => {
    if (isInitializing || chapter.id !== chapterIdRef.current) {
      // reset per-chapter session counters (capture seen offset once)
      initialSeenOffsetRef.current = seenOffset || 0;
      sessionSeenSetRef.current = new Set();
      advancesRef.current = 0;

      const initial = sentences.filter(s => !initialKnownIds.current.has(s.id));

      // if there are pending unknowns from previous sessions (persisted by App), load them
      if (pendingUnknowns && pendingUnknowns.length > 0) {
        unknownsRef.current = [...pendingUnknowns];
      }

      // if there are no initial items to study, but there are pending unknowns,
      // do not mark finished — show continue modal instead so user can resume.
      if (initial.length === 0) {
        if (unknownsRef.current && unknownsRef.current.length > 0) {
          setShowContinueModal(true);
        } else {
          setIsAllFinished(true);
        }
      } else {
        // 초기 순서 랜덤 섞기
        const shuffled = [...initial].sort(() => Math.random() - 0.5);
        setSessionSentences(shuffled);
      }

      setIsInitializing(false);
      chapterIdRef.current = chapter.id;
      console.debug('[StudyView] init', { chapterId: chapter.id, seenOffset, initialCount: initial.length, initialSeenOffset: initialSeenOffsetRef.current, knownCount: initialKnownIds.current.size, pendingUnknowns: pendingUnknowns ? pendingUnknowns.length : 0 });
    }
  }, [sentences, chapter.id, isInitializing, pendingUnknowns]);

  // If the session was marked finished but there are unknowns collected,
  // offer the continue modal again so the user can resume 2nd round after re-entering.
  useEffect(() => {
    if (isAllFinished && unknownsRef.current && unknownsRef.current.length > 0 && !showContinueModal) {
      setShowContinueModal(true);
      setIsAllFinished(false);
    }
  }, [isAllFinished, showContinueModal]);

  useEffect(() => {
    if (isAllFinished) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, isAllFinished]);

  const currentSentence = sessionSentences[currentIndex];

  const totalCount = chapter.id === 999 ? bookmarks.size : (chapter.range[1] - chapter.range[0] + 1);
  const displayIndex = Math.min(initialSeenOffsetRef.current + advancesRef.current + 1, totalCount);

  const handleKnown = () => {
    if (!currentSentence) return;
    onMarkKnown(currentSentence.id);
    // mark as seen in this session
    sessionSeenSetRef.current.add(currentSentence.id);
    // count progress only for '알겠음'
    lastActionRef.current = 'known';
    advancesRef.current = advancesRef.current + 1;
    proceedToNext();
  };

  const handleUnknown = () => {
    if (!currentSentence) return;
    onMarkUnknown(currentSentence.id);
    // collect unknowns in a ref to avoid state update timing issues
    unknownsRef.current.push(currentSentence);
    // mark as seen in this session
    sessionSeenSetRef.current.add(currentSentence.id);
    // do NOT increment advances for '모르겠음'
    lastActionRef.current = 'unknown';
    proceedToNext();
  };

  const proceedToNext = (updatedUnknowns?: Sentence[]) => {
    // 다음 문장으로 넘어가기 전 정답을 즉시 가립니다.
    setShowAnswer(false); 
    const isLastInRound = currentIndex === sessionSentences.length - 1;
    if (!isLastInRound) {
      setCurrentIndex(prev => prev + 1);
      console.debug('[StudyView] next', { chapterId: chapter.id, round, currentIndex: currentIndex + 1, sessionLen: sessionSentences.length, unknowns: unknownsRef.current.length, seenThisSession: sessionSeenSetRef.current.size, initialSeenOffset: initialSeenOffsetRef.current, totalCount, displayIndex });
      return;
    }

    const finalPool = unknownsRef.current;
    console.debug('[StudyView] roundEnd', { chapterId: chapter.id, round, finalPoolLen: finalPool.length, unknownsRefLen: unknownsRef.current.length, seenThisSession: sessionSeenSetRef.current.size, initialSeenOffset: initialSeenOffsetRef.current, advances: advancesRef.current, totalCount });
    if (finalPool && finalPool.length > 0) {
      // Ask the user whether to continue with the collected unknowns
      // for every round transition (not only after round 1).
      setShowContinueModal(true);
      return;
    }

    setIsAllFinished(true);
  };

  const confirmContinue = () => {
    const finalPool = unknownsRef.current;
    const nextRoundNum = round + 1;
    const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
    setSessionSentences(shuffled);
    unknownsRef.current = [];
    setUnknownsInCurrentRound([]);
    setCurrentIndex(0);
    setRound(nextRoundNum);
    setShowContinueModal(false);
    // inform App to consume pending unknowns so they won't show up as pending again
    if (onConsumeUnknowns && finalPool && finalPool.length > 0) {
      onConsumeUnknowns(finalPool.map(s => s.id));
    }
    console.debug('[StudyView] startNextRoundConfirmed', { chapterId: chapter.id, nextRoundNum, nextLen: shuffled.length, advances: advancesRef.current });
  };

  const cancelContinue = () => {
    // dismiss modal but keep session unfinished so user can resume later
    setShowContinueModal(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  if (isInitializing) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative h-full">
      {/* Header */}
      <div className="px-6 py-8 flex items-center justify-between text-white shadow-lg z-10" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">
            {chapter.id === 999 ? 'MY NOTE' : `LEVEL ${chapter.id} • ${round} ROUND`}
          </div>
          <div className="text-xl font-black italic tracking-tighter">
            {displayIndex} / {totalCount}
          </div>
        </div>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      {/* Main Study Area */}
      <div className={`flex-1 flex flex-col items-center relative bg-white ${isAllFinished ? 'blur-sm grayscale' : ''}`}>
        {!isAllFinished && currentSentence ? (
          <>
            {/* Bookmark */}
            <button 
              onClick={() => onToggleBookmark(currentSentence.id)}
              className="absolute top-8 right-8 text-4xl transition-transform active:scale-150 z-20"
              style={{ color: bookmarks.has(currentSentence.id) ? '#fbbf24' : '#f1f5f9' }}
            >
              <i className="fa-solid fa-star"></i>
            </button>

            {/* Sentence Content */}
            <div className="w-full max-w-sm flex flex-col items-center px-8 mt-32 mb-6">
              {/* English (정답) */}
              <div className={`transform w-full text-center h-12 flex items-center justify-center mb-6 
                ${showAnswer 
                  ? 'opacity-100 translate-y-0 transition-all duration-300' 
                  : 'opacity-0 translate-y-[-10px] pointer-events-none'
                }`}>
                 <h3 className="text-3xl font-black text-indigo-600 italic tracking-tight leading-tight">
                   {currentSentence.english}
                 </h3>
              </div>

              {/* Korean (문제) */}
              <h2 className="text-3xl font-black leading-snug text-slate-800 text-center">
                {currentSentence.korean}
              </h2>
            </div>

            {/* Raised Buttons Block */}
            <div className="w-full flex flex-col gap-4 px-6 max-w-[380px] mt-8">
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="h-16 rounded-[1.2rem] bg-white border border-slate-200 flex items-center justify-center gap-3 font-black text-slate-700 active:bg-slate-50 active:scale-95 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                  >
                    <i className="fa-solid fa-eye text-[#6366f1] text-lg"></i>
                    정답 확인
                  </button>
                  <button 
                    onClick={() => {
                      if (!currentSentence) return;
                      const msg = new SpeechSynthesisUtterance(currentSentence.english);
                      msg.lang = 'en-US';
                      window.speechSynthesis.speak(msg);
                    }}
                    className="h-16 rounded-[1.2rem] bg-white border border-slate-200 flex items-center justify-center gap-3 font-black text-slate-700 active:bg-slate-50 active:scale-95 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                  >
                    <i className="fa-solid fa-volume-high text-[#3b82f6] text-lg"></i>
                    발음
                  </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleUnknown}
                    className="h-16 rounded-[1.5rem] bg-[#f43f5e] text-white font-black shadow-[0_8px_20px_rgba(244,63,94,0.3)] active:scale-95 transition-all flex items-center justify-center text-lg"
                  >
                    모르겠음
                  </button>
                  <button 
                    onClick={handleKnown}
                    className="h-16 rounded-[1.5rem] bg-[#6366f1] text-white font-black shadow-[0_8px_20px_rgba(99,102,241,0.3)] active:scale-95 transition-all flex items-center justify-center text-lg"
                  >
                    알고있음
                  </button>
              </div>
            </div>
          </>
        ) : !isAllFinished && (
           <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">로딩 중...</div>
        )}
      </div>

      {/* Completion Modal */}
      {isAllFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[320px] shadow-2xl flex flex-col animate-modal-pop relative overflow-visible">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
               <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-xl flex flex-col items-center justify-center text-white p-2 text-center" style={{ backgroundColor: '#6366f1' }}>
                 <span className="text-[10px] font-black leading-none mb-1">회독</span>
                 <span className="text-2xl font-black italic leading-none">ROTA</span>
               </div>
            </div>

            <div className="p-8 pt-20 flex flex-col items-center">
              <h2 className="text-2xl font-black text-slate-800 mb-8">축하드립니다!</h2>
              <div className="w-full space-y-5 mb-10">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold text-sm">레벨 :</span>
                  <span className="text-slate-800 font-black">{chapter.id === 999 ? 'MY NOTE' : chapter.title}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold text-sm">회독 :</span>
                  <span className="text-slate-800 font-black">{round}회독 완료</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-sm">걸린시간 :</span>
                  <span className="text-slate-800 font-black">{formatTime(elapsed)}</span>
                </div>
              </div>

              <button 
                onClick={onBack}
                className="w-full py-5 rounded-[1.8rem] text-white font-black shadow-lg transition-all active:scale-95 text-lg"
                style={{ backgroundColor: '#6366f1' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

        {showContinueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-[2.5rem] w-full max-w-[320px] shadow-2xl flex flex-col animate-modal-pop relative overflow-visible p-6">
              <button onClick={cancelContinue} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
              <h2 className="text-xl font-black text-slate-800 mb-4">회독 완료</h2>
              <p className="text-slate-500 mb-6">모아둔 '모르겠음' 문장들로 다음 회독을 진행하시겠습니까?</p>
              <div>
                <button onClick={confirmContinue} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black">네, 이어서 진행</button>
              </div>
            </div>
          </div>
        )}

      <style>{`
        @keyframes modal-pop {
          0% { transform: scale(0.9) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-modal-pop {
          animation: modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
};

export default StudyView;