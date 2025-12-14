
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
}

const StudyView: React.FC<StudyViewProps> = ({
  chapter,
  sentences,
  knownIds,
  bookmarks,
  onBack,
  onMarkKnown,
  onMarkUnknown,
  onToggleBookmark
}) => {
  const [round, setRound] = useState(1);
  const [sessionSentences, setSessionSentences] = useState<Sentence[]>([]);
  const [unknownsInCurrentRound, setUnknownsInCurrentRound] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [isAllFinished, setIsAllFinished] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // 세션 시작 시점의 '이미 아는 문장' 기록
  const initialKnownIds = useRef<Set<number>>(new Set(knownIds));
  const chapterIdRef = useRef(chapter.id);

  useEffect(() => {
    if (isInitializing || chapter.id !== chapterIdRef.current) {
      const initial = sentences.filter(s => !initialKnownIds.current.has(s.id));
      if (initial.length === 0) {
        setIsAllFinished(true);
      } else {
        setSessionSentences(initial);
      }
      setIsInitializing(false);
      chapterIdRef.current = chapter.id;
    }
  }, [sentences, chapter.id, isInitializing]);

  useEffect(() => {
    if (isAllFinished) return;
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, isAllFinished]);

  const currentSentence = sessionSentences[currentIndex];

  const handleKnown = () => {
    if (!currentSentence) return;
    onMarkKnown(currentSentence.id);
    proceedToNext(false);
  };

  const handleUnknown = () => {
    if (!currentSentence) return;
    onMarkUnknown(currentSentence.id);
    const nextUnknowns = [...unknownsInCurrentRound, currentSentence];
    setUnknownsInCurrentRound(nextUnknowns);
    proceedToNext(true, nextUnknowns);
  };

  const proceedToNext = (wasUnknown: boolean, updatedUnknowns?: Sentence[]) => {
    setShowAnswer(false);
    const isLastInRound = currentIndex === sessionSentences.length - 1;

    if (!isLastInRound) {
      setCurrentIndex(prev => prev + 1);
    } else {
      const finalPool = updatedUnknowns || unknownsInCurrentRound;
      if (finalPool.length > 0) {
        const nextRoundNum = round + 1;
        const shuffled = [...finalPool].sort(() => Math.random() - 0.5);
        setSessionSentences(shuffled);
        setUnknownsInCurrentRound([]);
        setCurrentIndex(0);
        setRound(nextRoundNum);
      } else {
        setIsAllFinished(true);
      }
    }
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
    <div className="flex-1 flex flex-col bg-white relative">
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between text-white shadow-lg z-10" style={{ background: `linear-gradient(135deg, ${THEME_COLOR}, ${SECONDARY_COLOR})` }}>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-0.5">{chapter.id === 999 ? 'MY NOTE' : chapter.title} • {round} ROUND</div>
          <div className="text-sm font-black italic tracking-tighter">
            {currentIndex + 1} / {sessionSentences.length}
          </div>
        </div>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 z-10">
        <div 
          className="h-full transition-all duration-500 ease-out" 
          style={{ 
            backgroundColor: THEME_COLOR, 
            width: `${((currentIndex + 1) / (sessionSentences.length || 1)) * 100}%` 
          }}
        />
      </div>

      {/* Card Area */}
      <div className={`flex-1 flex flex-col p-8 items-center justify-center text-center relative overflow-hidden bg-white ${isAllFinished ? 'blur-sm grayscale' : ''}`}>
        {!isAllFinished && currentSentence ? (
          <>
            <button 
              onClick={() => onToggleBookmark(currentSentence.id)}
              className="absolute top-10 right-10 text-3xl transition-transform active:scale-150 hover:scale-110 z-20"
              style={{ color: bookmarks.has(currentSentence.id) ? '#f59e0b' : '#f1f5f9' }}
            >
              <i className="fa-solid fa-star"></i>
            </button>

            <div className="w-full max-w-sm flex flex-col items-center">
              {/* English revealed ABOVE Korean */}
              <div className={`transition-all duration-500 transform w-full mb-12 ${showAnswer ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[-20px] scale-95 pointer-events-none'}`}>
                 <h3 className="text-3xl font-black text-indigo-600 italic tracking-tight leading-tight mb-4">
                   {currentSentence.english}
                 </h3>
                 <div className="w-12 h-1 bg-indigo-100 mx-auto rounded-full"></div>
              </div>

              {/* Korean always visible or central */}
              <h2 className={`font-black leading-snug transition-all duration-500 text-slate-800 ${showAnswer ? 'text-xl opacity-60' : 'text-3xl'}`}>
                {currentSentence.korean}
              </h2>
            </div>
          </>
        ) : !isAllFinished && (
           <div className="text-slate-400 font-bold">로딩 중...</div>
        )}
      </div>

      {/* Bottom Buttons */}
      {!isAllFinished && (
        <div className="p-6 bg-slate-50 flex flex-col gap-4 pb-12 border-t border-slate-100 z-10">
          <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowAnswer(true)}
                className="h-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center gap-2 font-black text-slate-700 active:bg-slate-100 active:scale-95 transition-all shadow-sm"
              >
                <i className="fa-solid fa-eye text-indigo-500"></i>
                정답 확인
              </button>
              <button 
                onClick={() => {
                  if (!currentSentence) return;
                  const msg = new SpeechSynthesisUtterance(currentSentence.english);
                  msg.lang = 'en-US';
                  window.speechSynthesis.speak(msg);
                }}
                className="h-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center gap-2 font-black text-slate-700 active:bg-slate-100 active:scale-95 transition-all shadow-sm"
              >
                <i className="fa-solid fa-volume-high text-indigo-500"></i>
                발음
              </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleUnknown}
                className="h-16 rounded-[1.5rem] bg-rose-500 text-white font-black shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                모르겠음
              </button>
              <button 
                onClick={handleKnown}
                className="h-16 rounded-[1.5rem] text-white font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${THEME_COLOR}, ${SECONDARY_COLOR})` }}
              >
                알고있음
              </button>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {isAllFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[320px] shadow-2xl flex flex-col animate-modal-pop relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
               <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-xl flex flex-col items-center justify-center text-white p-2 text-center" style={{ backgroundColor: THEME_COLOR }}>
                 <span className="text-[10px] font-black leading-none mb-1">회독</span>
                 <span className="text-2xl font-black italic leading-none">ROTA</span>
               </div>
            </div>

            <div className="p-8 pt-20 flex flex-col items-center">
              <h2 className="text-2xl font-black text-slate-800 mb-8">축하드립니다!</h2>
              <div className="w-full space-y-5 mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold text-sm">레벨 :</span>
                  <span className="text-slate-800 font-black">{chapter.id === 999 ? 'MY NOTE' : chapter.title}</span>
                </div>
                <div className="flex justify-between items-center">
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
                style={{ backgroundColor: THEME_COLOR }}
              >
                확인
              </button>
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
