
import React, { useRef } from 'react';
import { EntryType } from '../types';

interface HeaderProps {
  isDetail: boolean;
  onBack: () => void;
  title: string;
  viewingArchive?: boolean;
  onToggleArchive?: () => void;
  onImport?: (file: File) => void;
  activeTab?: EntryType;
  onTabChange?: (tab: EntryType) => void;
}

const Header: React.FC<HeaderProps> = ({ isDetail, onBack, title, viewingArchive, onToggleArchive, onImport, activeTab, onTabChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-20 h-16">
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {isDetail && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-emerald-500 shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {isDetail ? (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner w-full max-w-[280px]">
            <button 
              onClick={() => onTabChange?.(EntryType.MATERIAL)} 
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === EntryType.MATERIAL ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              МАТЕРИАЛЫ
            </button>
            <button 
              onClick={() => onTabChange?.(EntryType.LABOR)} 
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeTab === EntryType.LABOR ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              РАБОТЫ
            </button>
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-lg font-bold truncate coding-font text-white">{title}</h1>
            {viewingArchive && <span className="text-[10px] text-amber-500 tracking-widest uppercase font-mono">Архив объектов</span>}
          </div>
        )}
      </div>

      {!isDetail && (
        <div className="flex gap-2">
          {!viewingArchive && onImport && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".ais,.json" 
                onChange={handleFileChange} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-cyan-400 active:scale-95 transition-all"
                title="Импорт проекта"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            </>
          )}
          
          {onToggleArchive && (
            <button 
              onClick={onToggleArchive}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-2 px-4 ${viewingArchive ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-amber-500'}`}
              title={viewingArchive ? "Вернуться к активным" : "Открыть архив объектов"}
            >
              {viewingArchive ? (
                <>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">ВЫХОД</span>
                </>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
