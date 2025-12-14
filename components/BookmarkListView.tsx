
import React from 'react';
import { Sentence } from '../types';
import { THEME_COLOR, SECONDARY_COLOR } from '../constants';

interface BookmarkListViewProps {
  sentences: Sentence[];
  onBack: () => void;
  onToggleBookmark: (id: number) => void;
  onStartStudy: () => void;
}

const BookmarkListView: React.FC<BookmarkListViewProps> = ({
  sentences,
  onBack,
  onToggleBookmark,
  onStartStudy
}) => {
  const handleSpeak = (text: string) => {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div 
        className="px-6 py-6 flex items-center justify-between text-white shadow-lg z-10 shrink-0" 
        style={{ background: `linear-gradient(135deg, ${THEME_COLOR}, ${SECONDARY_COLOR})` }}
      >
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-lg font-black tracking-tight">저장된 문장 리스트</h2>
        <div className="w-10"></div>
      </div>

      {/* Floating Action Bar */}
      {sentences.length > 0 && (
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center px-6 shrink-0 shadow-sm">
          <span className="text-sm font-bold text-slate-500">총 <span className="text-indigo-600">{sentences.length}</span>개 문장</span>
          <button 
            onClick={onStartStudy}
            className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-play"></i> 회독 시작
          </button>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sentences.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
            <i className="fa-solid fa-folder-open text-6xl mb-4 opacity-20"></i>
            <p className="font-bold">저장된 문장이 없습니다.</p>
            <p className="text-sm">학습 중에 별표를 눌러 문장을 저장해보세요!</p>
          </div>
        ) : (
          sentences.map((s) => (
            <div 
              key={s.id} 
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4 animate-slide-up group hover:border-indigo-200 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 mb-1 leading-snug">{s.korean}</p>
                <p className="text-base font-black text-indigo-600 italic leading-tight tracking-tight">{s.english}</p>
              </div>
              
              <div className="flex flex-col gap-3 shrink-0">
                <button 
                  onClick={() => onToggleBookmark(s.id)}
                  className="text-amber-400 text-xl active:scale-125 transition-transform"
                >
                  <i className="fa-solid fa-star"></i>
                </button>
                <button 
                  onClick={() => handleSpeak(s.english)}
                  className="text-slate-300 hover:text-indigo-500 text-xl active:scale-125 transition-transform"
                >
                  <i className="fa-solid fa-circle-play"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BookmarkListView;
