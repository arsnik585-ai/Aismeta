
import React, { useRef, useState, useEffect } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowMenu(false);
  };

  return (
    <header 
      className="bg-slate-900 border-b border-slate-800 px-4 pb-4 flex items-center justify-between sticky top-0 z-20 w-full"
      style={{ 
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        minHeight: 'calc(4rem + env(safe-area-inset-top))'
      }}
    >
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
            {viewingArchive && <span className="text-[10px] text-amber-500 tracking-widest uppercase font-mono font-bold">Архив объектов</span>}
          </div>
        )}
      </div>

      {!isDetail && (
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 active:scale-95 transition-all"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              {onImport && (
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
                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3 uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    ИМПОРТ .AIS
                  </button>
                </>
              )}
              
              {onToggleArchive && (
                <button 
                  onClick={() => { onToggleArchive(); setShowMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-[11px] font-bold flex items-center gap-3 uppercase tracking-widest hover:bg-slate-700 transition-colors ${viewingArchive ? 'text-emerald-400' : 'text-amber-500'}`}
                >
                  {viewingArchive ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      К АКТИВНЫМ
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      АРХИВ ОБЪЕКТОВ
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
