
import React, { useState } from 'react';
import { Chapter } from '../types';
import { THEME_COLOR, SECONDARY_COLOR } from '../constants';

interface HomeViewProps {
  chapters: Chapter[];
  onSelectChapter: (c: Chapter) => void;
  chapterKnownIds: Record<number, number[]>;
  onViewBookmarks: () => void;
  bookmarkCount: number;
  onResetChapter: (chapterId: number) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ 
  chapters, 
  onSelectChapter, 
  chapterKnownIds,
  onViewBookmarks,
  bookmarkCount,
  onResetChapter
}) => {
  const [showConfirm, setShowConfirm] = useState<{from: Chapter, to: Chapter} | null>(null);

  const getInProgressChapter = () => {
    for (const ch of chapters) {
      const known = chapterKnownIds[ch.id] || [];
      const total = ch.range[1] - ch.range[0] + 1;
      if (known.length > 0 && known.length < total) return ch;
    }
    return null;
  };

  const inProgressChapter = getInProgressChapter();

  const handleChapterClick = (targetChapter: Chapter) => {
    if (inProgressChapter && inProgressChapter.id !== targetChapter.id) {
      setShowConfirm({ from: inProgressChapter, to: targetChapter });
    } else {
      onSelectChapter(targetChapter);
    }
  };

  const confirmSwitch = () => {
    if (showConfirm) {
      onResetChapter(showConfirm.from.id);
      onSelectChapter(showConfirm.to);
      setShowConfirm(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto pb-12 relative">
      {/* Header */}
      <div 
        className="text-white pt-20 pb-16 px-8 flex flex-col items-center justify-center relative shadow-lg"
        style={{ background: `linear-gradient(135deg, ${THEME_COLOR}, ${SECONDARY_COLOR})` }}
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl animate-float">
             <i className="fa-solid fa-arrows-rotate text-4xl text-white"></i>
          </div>
        </div>

        <div className="text-center">
            <h1 className="text-5xl font-black italic tracking-tighter mb-2 drop-shadow-md">ROTA</h1>
            <p className="text-[10px] font-black opacity-60 tracking-[0.6em] uppercase">Rotation Recall System</p>
        </div>
      </div>

      {/* Stats/Action Bar */}
      <div className="px-6 py-8 flex justify-between items-center bg-white sticky top-0 z-10">
         <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Learning Levels</h2>
         <button 
            onClick={onViewBookmarks}
            className="text-[11px] font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-indigo-50 active:scale-95 transition-all bg-indigo-50 text-indigo-600"
        >
            <i className="fa-solid fa-star"></i> 북마크 ({bookmarkCount})
        </button>
      </div>

      {/* Chapter List */}
      <div className="px-6 space-y-4">
        {chapters.map((chapter) => {
          const knownInChapter = chapterKnownIds[chapter.id] || [];
          const masteredCount = knownInChapter.length;
          const totalInRange = chapter.range[1] - chapter.range[0] + 1;
          
          const isCompleted = masteredCount >= totalInRange;
          const isInProgress = masteredCount > 0 && masteredCount < totalInRange;
          const progressPercent = (masteredCount / totalInRange) * 100;

          return (
            <button
              key={chapter.id}
              onClick={() => handleChapterClick(chapter)}
              className={`group w-full border-2 rounded-[2rem] p-6 flex items-center transition-all duration-300 bg-white active:scale-[0.97] hover:border-indigo-200 hover:shadow-lg
                ${isCompleted ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'}
                ${isInProgress ? 'border-indigo-200 ring-4 ring-indigo-50' : ''}
              `}
            >
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mr-5 shadow-inner shrink-0"
                style={{ background: isCompleted ? '#10b981' : isInProgress ? THEME_COLOR : '#cbd5e1' }}
              >
                {isCompleted ? (
                  <i className="fa-solid fa-check text-lg"></i>
                ) : (
                  <span className="text-sm font-black italic">{chapter.id}</span>
                )}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-black text-lg tracking-tight truncate ${isCompleted ? 'text-emerald-800' : 'text-slate-800'}`}>
                    {chapter.title}
                  </h3>
                  {isInProgress && (
                    <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-md uppercase animate-pulse">Study</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                  <span>{chapter.range[0]} - {chapter.range[1]} 문장</span>
                  <span className={isCompleted ? 'text-emerald-600' : 'text-slate-500'}>
                    {masteredCount} / {totalInRange}
                  </span>
                </div>

                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-700 ease-out" 
                    style={{ 
                      width: `${progressPercent}%`,
                      backgroundColor: isCompleted ? '#10b981' : THEME_COLOR 
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Switching Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-pop-up">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-xl font-black text-center text-slate-800 mb-2">학습을 포기하시겠어요?</h3>
            <p className="text-center text-slate-500 text-sm leading-relaxed mb-8">
              이동 시 현재 장의 진행률이 초기화됩니다.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmSwitch} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all">네, 포기하고 시작할게요</button>
              <button onClick={() => setShowConfirm(null)} className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm active:scale-95 transition-all">취소</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop-up { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-pop-up { animation: pop-up 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
};

export default HomeView;
