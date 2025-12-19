
import React, { useState, useEffect, useRef } from 'react';
import { Project, Entry, EntryType } from '../types';
import { getEntriesByProject, saveEntry, addToSyncQueue, deleteEntry, generateId } from '../db';
import { processVoice } from '../geminiService';

interface ProjectDetailProps {
  project: Project;
  isOnline: boolean;
  onSyncRequested: () => void;
  initialAction?: string | null;
}

const EntryCard: React.FC<{
    e: Entry;
    onSelect: (e: Entry) => void;
    onArchiveToggle: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onTypeToggle: (id: string) => void;
    isArchivedView: boolean;
    onShowImage: (img: string, entryId: string) => void;
}> = ({ e, onSelect, onArchiveToggle, onPermanentDelete, onTypeToggle, isArchivedView, onShowImage }) => {
    const [translateX, setTranslateX] = useState(0);
    const [showMenu, setShowMenu] = useState(false);
    const touchStart = useRef<number>(0);
    const isMoving = useRef<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const onTouchStart = (ts: React.TouchEvent) => {
        touchStart.current = ts.targetTouches[0].clientX;
        isMoving.current = false;
    };

    const onTouchMove = (tm: React.TouchEvent) => {
        const diff = tm.targetTouches[0].clientX - touchStart.current;
        if (Math.abs(diff) > 10) isMoving.current = true;
        if (diff < 0) {
            const limit = isArchivedView ? -180 : -250;
            setTranslateX(Math.max(diff, limit));
        } else {
            setTranslateX(0);
        }
    };

    const onTouchEnd = () => {
        const threshold = -60;
        if (translateX < threshold) {
            setTranslateX(isArchivedView ? -160 : -240);
        } else {
            setTranslateX(0);
        }
    };

    const handleAction = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        onArchiveToggle(e.id);
        setTranslateX(0);
    };

    const handleDelete = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        if (window.confirm("Удалить позицию навсегда? Это действие необратимо.")) {
            onPermanentDelete(e.id);
        }
        setTranslateX(0);
    };

    const handleTypeToggle = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        onTypeToggle(e.id);
        setTranslateX(0);
    };

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950 mb-4">
            <div className="absolute inset-0 flex items-center justify-end px-4 gap-2">
               {isArchivedView ? (
                 <>
                    <button onClick={handleAction} className="bg-emerald-600 text-white h-[80%] px-4 rounded-xl text-[9px] font-bold uppercase active:bg-emerald-500 shadow-lg flex flex-col items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2}/></svg>
                      Вернуть
                    </button>
                    <button onClick={handleDelete} className="bg-red-600 text-white h-[80%] px-4 rounded-xl text-[9px] font-bold uppercase active:bg-red-500 shadow-lg flex flex-col items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                      Удалить
                    </button>
                 </>
               ) : (
                 <>
                    <button onClick={handleTypeToggle} className="bg-cyan-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-cyan-500 shadow-lg flex flex-col items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      Тип
                    </button>
                    <button onClick={handleAction} className="bg-amber-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-amber-500 shadow-lg flex flex-col items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      В архив
                    </button>
                    <button onClick={handleDelete} className="bg-red-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-red-500 shadow-lg flex flex-col items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                      Удалить
                    </button>
                 </>
               )}
            </div>

            <div 
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={() => !isMoving.current && translateX === 0 && onSelect(e)}
                style={{ transform: `translateX(${translateX}px)` }}
                className={`bg-slate-900 border ${e.processed ? (isArchivedView ? 'border-slate-800/50' : 'border-slate-800') : 'border-cyan-500/50 animate-pulse'} p-5 rounded-[1.5rem] transition-transform duration-200 ease-out relative z-10 shadow-lg active:bg-slate-800 ${isArchivedView ? 'opacity-60 grayscale-[0.5]' : ''}`}
            >
                <div className="flex justify-between items-start gap-3 relative">
                    <div className="flex-1 min-w-0 pr-8">
                        <div className="text-lg font-bold text-white leading-tight mb-1">
                          <span className="truncate block">{e.name || 'БЕЗ НАЗВАНИЯ'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-cyan-400 font-mono uppercase bg-cyan-950 border border-cyan-900/50 px-2 py-0.5 rounded truncate">
                                {e.vendor || 'ПОСТАВЩИК?'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="absolute top-0 right-0" ref={menuRef}>
                        <button 
                            onClick={(evt) => { evt.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-[60] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(evt) => { evt.stopPropagation(); handleAction(evt); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                    {isArchivedView ? 'ВЕРНУТЬ' : 'В АРХИВ'}
                                </button>
                                <button 
                                    onClick={(evt) => { evt.stopPropagation(); handleTypeToggle(evt); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-cyan-400 hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                    {e.type === EntryType.MATERIAL ? 'В РАБОТЫ' : 'В МАТЕРИАЛЫ'}
                                </button>
                                <button 
                                    onClick={(evt) => { evt.stopPropagation(); handleDelete(evt); setShowMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    УДАЛИТЬ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-between items-end mt-6 pt-4 border-t border-slate-800/50">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-mono uppercase mb-1 opacity-60 tracking-widest">_КОЛ_ВО / ЦЕНА_</span>
                        <div className="text-sm text-slate-200 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1">
                            {e.quantity || '0'} {e.unit || 'шт'} 
                            <span className="text-slate-600 mx-1">×</span> 
                            {e.price?.toLocaleString() || '0'} 
                            <span className="text-[10px] opacity-40 ml-0.5">₽</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1 opacity-60 tracking-widest">_ИТОГО_</span>
                        <div className="text-2xl font-bold text-emerald-400 coding-font tracking-tighter">
                            {e.total?.toLocaleString() || '0'} <span className="text-sm font-normal opacity-50">₽</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, isOnline, onSyncRequested, initialAction }) => {
  const [activeTab, setActiveTab] = useState<EntryType>(EntryType.MATERIAL);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showArchivedEntries, setShowArchivedEntries] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{src: string, entryId: string} | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showUnitsMenu, setShowUnitsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entryFileInputRef = useRef<HTMLInputElement>(null);
  const unitsMenuRef = useRef<HTMLDivElement>(null);

  const commonUnits = ['шт', 'кв.м', 'пог.м', 'куб.м', 'кг', 'т', 'ч'];

  const loadEntries = async () => {
    try {
      const data = await getEntriesByProject(project.id, showArchivedEntries);
      setEntries(data);
    } catch (err) {
      console.error("Load Entries Error:", err);
    }
  };

  useEffect(() => {
    loadEntries();
    const interval = setInterval(loadEntries, 5000);
    return () => clearInterval(interval);
  }, [project.id, showArchivedEntries]);

  useEffect(() => {
    if (initialAction === 'photo') fileInputRef.current?.click();
    if (initialAction === 'voice') handleVoiceInput();
    if (initialAction === 'material') { setActiveTab(EntryType.MATERIAL); addManualEntry(EntryType.MATERIAL); }
    if (initialAction === 'labor') { setActiveTab(EntryType.LABOR); addManualEntry(EntryType.LABOR); }
  }, [initialAction]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unitsMenuRef.current && !unitsMenuRef.current.contains(event.target as Node)) {
        setShowUnitsMenu(false);
      }
    };
    if (showUnitsMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUnitsMenu]);

  const visibleEntries = entries.filter(e => e.type === activeTab);

  const addManualEntry = async (type?: EntryType) => {
    const newEntry: Entry = {
      id: generateId(),
      projectId: project.id,
      type: type || activeTab,
      name: '',
      quantity: 1,
      unit: 'шт',
      price: 0,
      total: 0,
      vendor: '',
      date: Date.now(),
      processed: true,
      archived: false,
      images: []
    };
    await saveEntry(newEntry);
    await loadEntries();
    setEditingEntry(newEntry);
  };

  const handleEntryArchiveToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    try {
      await saveEntry({ ...entry, archived: !entry.archived });
      await loadEntries();
    } catch (err) {
      console.error("Archive Entry Error:", err);
    }
  };

  const handleEntryTypeToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const newType = entry.type === EntryType.MATERIAL ? EntryType.LABOR : EntryType.MATERIAL;
    try {
      await saveEntry({ ...entry, type: newType });
      await loadEntries();
    } catch (err) {
      console.error("Type Toggle Error:", err);
    }
  };

  const handleEntryPermanentDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      await loadEntries();
    } catch (err) {
      console.error("Delete Entry Error:", err);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Голосовой ввод не поддерживается.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      const placeholder: Entry = {
        id: generateId(),
        projectId: project.id,
        type: activeTab,
        name: 'Разбор голоса...',
        quantity: null, unit: null, price: null, total: null, vendor: null,
        date: Date.now(), processed: false, archived: false, voiceTranscript: transcript,
        images: []
      };
      await saveEntry(placeholder);
      await loadEntries();
      if (isOnline) {
        try {
          const items = await processVoice(transcript);
          await deleteEntry(placeholder.id);
          for (const item of items) {
            await saveEntry({ id: generateId(), projectId: project.id, date: Date.now(), processed: true, archived: false, images: [], ...item });
          }
        } catch (e) {
          await addToSyncQueue({ id: generateId(), entryId: placeholder.id, type: 'VOICE', payload: transcript });
        }
      } else {
        await addToSyncQueue({ id: generateId(), entryId: placeholder.id, type: 'VOICE', payload: transcript });
      }
      setIsProcessing(false);
      await loadEntries();
    };
    recognition.start();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const newEntry: Entry = {
        id: generateId(), projectId: project.id, type: activeTab,
        name: 'Анализ чека...', quantity: null, unit: null, price: null, total: null, vendor: null,
        date: Date.now(), images: [base64], processed: false, archived: false
      };
      await saveEntry(newEntry);
      await addToSyncQueue({ id: generateId(), entryId: newEntry.id, type: 'PHOTO', payload: base64 });
      await loadEntries();
      onSyncRequested();
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEntryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingEntry) return;
    const reader = new FileReader();
    reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const updatedImages = [...(editingEntry.images || []), base64];
        setEditingEntry({ ...editingEntry, images: updatedImages });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    if (!editingEntry) return;
    const updatedImages = [...(editingEntry.images || [])];
    updatedImages.splice(index, 1);
    setEditingEntry({ ...editingEntry, images: updatedImages });
  };

  const movePhotoToEntry = async (targetEntryId: string) => {
    if (!fullscreenImage) return;
    const sourceEntry = entries.find(e => e.id === fullscreenImage.entryId);
    const targetEntry = entries.find(e => e.id === targetEntryId);
    if (!sourceEntry || !targetEntry) return;
    const updatedTargetImages = [...(targetEntry.images || []), fullscreenImage.src];
    await saveEntry({ ...targetEntry, images: updatedTargetImages });
    const updatedSourceImages = (sourceEntry.images || []).filter(img => img !== fullscreenImage.src);
    await saveEntry({ ...sourceEntry, images: updatedSourceImages });
    setFullscreenImage(null);
    setShowMoveMenu(false);
    loadEntries();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-slate-900 p-1 rounded-2xl mb-6 border border-slate-800 shadow-inner">
        <button onClick={() => setActiveTab(EntryType.MATERIAL)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === EntryType.MATERIAL ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>МАТЕРИАЛЫ</button>
        <button onClick={() => setActiveTab(EntryType.LABOR)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === EntryType.LABOR ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>РАБОТЫ</button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-end items-center mb-4 px-1">
          {isProcessing && <span className="text-[10px] text-cyan-400 animate-pulse font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>_AI_PROCESSING_</span>}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pb-40 px-0.5">
          {visibleEntries.map(e => (
            <EntryCard 
                key={e.id} 
                e={e} 
                onSelect={setEditingEntry} 
                onArchiveToggle={handleEntryArchiveToggle}
                onPermanentDelete={handleEntryPermanentDelete}
                onTypeToggle={handleEntryTypeToggle}
                isArchivedView={showArchivedEntries}
                onShowImage={(src, id) => setFullscreenImage({src, entryId: id})}
            />
          ))}
          {visibleEntries.length === 0 && (
            <div className="py-24 text-center opacity-10 flex flex-col items-center gap-6 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
               <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={1}/></svg>
               <span className="font-mono text-[10px] uppercase tracking-[0.4em] font-bold">Список пуст</span>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-6 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 flex items-center gap-4 z-40 shadow-[0_-15px_50px_rgba(0,0,0,0.8)]">
        {showArchivedEntries ? (
          <button 
            onClick={() => setShowArchivedEntries(false)} 
            className="flex-1 bg-slate-800 h-14 rounded-2xl font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-[0.2em]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            ВЕРНУТЬСЯ В РЕЕСТР
          </button>
        ) : (
          <>
            <button 
              onClick={() => setShowArchivedEntries(true)} 
              className="w-14 h-14 bg-slate-900 rounded-2xl text-amber-500 border border-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
              title="Архив позиций"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </button>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-slate-900 rounded-2xl text-cyan-400 border border-slate-800 flex items-center justify-center active:scale-90 transition-transform shadow-lg" title="Камера">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={2} />
              </svg>
            </button>

            <button 
              onClick={handleVoiceInput} 
              className={`w-14 h-14 ${isRecording ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-slate-900 border-slate-800 text-emerald-400'} border rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg`}
              title="Голосовой ввод"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/></svg>
            </button>

            <button 
              onClick={() => addManualEntry()} 
              className="flex-[1.4] bg-emerald-600 h-14 rounded-2xl font-bold text-white shadow-xl shadow-emerald-950/40 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-[11px] tracking-[0.2em]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              ДОБАВИТЬ
            </button>
          </>
        )}
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-950 z-50 p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-xl font-bold text-emerald-400 coding-font tracking-tighter uppercase">_РЕДАКТОР_</h2>
             <button onClick={() => setEditingEntry(null)} className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors border border-slate-800 shadow-lg">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
             </button>
           </div>
           
           <div className="flex-1 space-y-8 overflow-y-auto px-1 pb-10">
              <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Наименование_</label>
                <textarea 
                  value={editingEntry.name} 
                  onChange={e => setEditingEntry({...editingEntry, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white text-base outline-none focus:border-emerald-500/50 coding-font shadow-inner"
                  rows={3}
                  placeholder="Введите описание..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                  <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Кол_во_</label>
                  <input 
                    type="number" 
                    value={editingEntry.quantity || ''} 
                    onChange={e => setEditingEntry({...editingEntry, quantity: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white font-bold coding-font outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>
                <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg relative" ref={unitsMenuRef}>
                  <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Ед_изм_</label>
                  <div className="relative">
                    <input 
                      value={editingEntry.unit || ''} 
                      onChange={e => setEditingEntry({...editingEntry, unit: e.target.value})} 
                      onFocus={() => setShowUnitsMenu(true)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white font-bold coding-font outline-none focus:border-emerald-500 shadow-inner"
                      placeholder="выбрать..."
                    />
                    {showUnitsMenu && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 p-1 grid grid-cols-2 gap-1 animate-in fade-in slide-in-from-top-2">
                        {commonUnits.map(unit => (
                          <button 
                            key={unit} 
                            onClick={() => { setEditingEntry({...editingEntry, unit}); setShowUnitsMenu(false); }}
                            className="p-3 text-xs font-bold text-slate-300 hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-600 active:scale-95"
                          >
                            {unit}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                  <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Цена_ед_</label>
                  <input 
                    type="number" 
                    value={editingEntry.price || ''} 
                    onChange={e => setEditingEntry({...editingEntry, price: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white font-bold coding-font outline-none focus:border-emerald-500 shadow-inner"
                  />
                </div>
                <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                  <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Сумма_</label>
                  <div className="w-full bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 text-emerald-400 font-bold text-lg coding-font flex items-center shadow-inner">
                    {((editingEntry.quantity || 0) * (editingEntry.price || 0)).toLocaleString()} ₽
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Поставщик_</label>
                <input 
                  value={editingEntry.vendor || ''} 
                  onChange={e => setEditingEntry({...editingEntry, vendor: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white coding-font outline-none focus:border-emerald-500 shadow-inner"
                  placeholder="Название магазина, поставщика, исполнителя"
                />
              </div>

              <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-lg">
                <label className="text-[10px] text-slate-500 uppercase font-mono mb-2 px-3 block tracking-[0.3em] font-bold">Фотографии_</label>
                <div className="p-2 space-y-4">
                  {editingEntry.images && editingEntry.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {editingEntry.images.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-700 shadow-lg bg-slate-950">
                          <img 
                            src={`data:image/jpeg;base64,${img}`} 
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                            alt={`entry-photo-${idx}`} 
                            onClick={() => setFullscreenImage({src: img, entryId: editingEntry.id})}
                          />
                          <button 
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-red-600/80 backdrop-blur-sm rounded-full p-1 shadow-lg active:scale-90"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <input type="file" ref={entryFileInputRef} className="hidden" accept="image/*" onChange={handleEntryImageChange} />
                  <button 
                    onClick={() => entryFileInputRef.current?.click()}
                    className="w-full bg-slate-950 border border-dashed border-slate-700 rounded-xl py-6 flex flex-col items-center justify-center gap-2 active:bg-slate-800 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-active:scale-90 transition-transform">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeWidth={2.5}/>
                      </svg>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Добавить фото</span>
                  </button>
                </div>
              </div>
           </div>

           <div className="mt-auto pt-6 border-t border-slate-800 flex flex-col gap-4">
              <button 
                onClick={async () => {
                  const updated = { ...editingEntry, total: (editingEntry.quantity || 0) * (editingEntry.price || 0) };
                  await saveEntry(updated);
                  setEditingEntry(null);
                  loadEntries();
                }}
                className="w-full bg-emerald-600 py-5 rounded-2xl font-bold text-white shadow-xl shadow-emerald-950/50 uppercase tracking-[0.3em] text-xs active:scale-95 transition-all"
              >
                Сохранить_изменения
              </button>
              <button onClick={() => setEditingEntry(null)} className="w-full bg-slate-900 py-5 rounded-2xl font-bold text-slate-500 border border-slate-800 uppercase tracking-[0.3em] text-xs active:bg-slate-800 transition-colors">Отменить</button>
           </div>
        </div>
      )}

      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/98 z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => { setFullscreenImage(null); setShowMoveMenu(false); }}
        >
          <div className="absolute top-8 right-8 z-[110] flex gap-3">
             <button 
                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                className="bg-emerald-600/80 backdrop-blur-md px-6 h-12 rounded-full text-white font-bold text-xs uppercase tracking-widest border border-emerald-500/30 active:scale-90 transition-all flex items-center gap-2"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                Перенести
             </button>
             <button className="bg-slate-900/50 backdrop-blur-md p-3 rounded-full text-white active:scale-90 transition-transform border border-slate-800">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
             </button>
          </div>
          
          {showMoveMenu && (
            <div 
              className="absolute top-24 right-8 left-8 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 z-[120] max-h-[60vh] overflow-y-auto shadow-2xl animate-in slide-in-from-top-4"
              onClick={e => e.stopPropagation()}
            >
               <h4 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-4 px-2">Выберите цель переноса_</h4>
               <div className="space-y-2">
                  {entries
                    .filter(e => e.id !== fullscreenImage.entryId)
                    .map(entry => (
                      <button 
                        key={entry.id}
                        onClick={() => movePhotoToEntry(entry.id)}
                        className="w-full text-left p-4 bg-slate-950/50 hover:bg-emerald-900/20 border border-slate-800 rounded-2xl transition-all active:scale-[0.98]"
                      >
                         <div className="text-xs font-bold text-white mb-1 truncate">{entry.name || 'Без названия'}</div>
                         <div className="text-[9px] text-slate-500 font-mono uppercase">
                            {entry.type === EntryType.MATERIAL ? 'МАТЕРИАЛ' : 'РАБОТА'} | {entry.vendor || 'Без поставщика'}
                         </div>
                      </button>
                    ))
                  }
                  {entries.length <= 1 && (
                    <div className="text-center py-8 text-slate-600 text-xs font-mono uppercase">Нет других позиций</div>
                  )}
               </div>
            </div>
          )}

          <img 
            src={`data:image/jpeg;base64,${fullscreenImage.src}`} 
            className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-in zoom-in duration-300" 
            alt="fullscreen-view" 
            onClick={e => e.stopPropagation()}
          />
          <p className="mt-6 text-slate-500 font-mono text-[10px] uppercase tracking-[0.5em] animate-pulse">Просмотр изображения</p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
