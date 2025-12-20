
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
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const onTouchStart = (ts: React.TouchEvent) => {
        touchStart.current = ts.targetTouches[0].clientX;
        isMoving.current = false;
    };

    const onTouchMove = (tm: React.TouchEvent) => {
        const diff = tm.targetTouches[0].clientX - touchStart.current;
        if (Math.abs(diff) > 10) isMoving.current = true;
        if (diff < 0) setTranslateX(Math.max(diff, -240));
        else setTranslateX(0);
    };

    const onTouchEnd = () => {
        if (translateX < -60) setTranslateX(-240);
        else setTranslateX(0);
    };

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950">
            <div className="absolute inset-0 flex items-center justify-end px-4 gap-2">
                <button onClick={(evt) => { evt.stopPropagation(); onTypeToggle(e.id); setTranslateX(0); }} className="bg-cyan-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-cyan-500 shadow-lg flex flex-col items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>Тип
                </button>
                <button onClick={(evt) => { evt.stopPropagation(); onArchiveToggle(e.id); setTranslateX(0); }} className="bg-amber-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-amber-500 shadow-lg flex flex-col items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>Архив
                </button>
                <button onClick={(evt) => { evt.stopPropagation(); onPermanentDelete(e.id); setTranslateX(0); }} className="bg-red-600 text-white h-[80%] px-3 rounded-xl text-[8px] font-bold uppercase active:bg-red-500 shadow-lg flex flex-col items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>Удалить
                </button>
            </div>

            <div 
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                onClick={() => !isMoving.current && translateX === 0 && onSelect(e)}
                style={{ transform: `translateX(${translateX}px)` }}
                className={`bg-slate-900 border ${e.error ? 'border-red-500/50' : e.processed ? 'border-slate-800' : 'border-cyan-500/50 animate-pulse'} p-5 rounded-[1.5rem] transition-transform duration-200 ease-out relative z-10 shadow-lg active:bg-slate-800 h-full flex flex-col justify-between ${isArchivedView ? 'opacity-60 grayscale-[0.5]' : ''}`}
            >
                <div className="flex justify-between items-start gap-3 relative">
                    <div className="flex-1 min-w-0 pr-8">
                        <div className="text-lg font-bold text-white leading-tight mb-1 truncate">{e.name || 'БЕЗ НАЗВАНИЯ'}</div>
                        {e.error ? (
                          <div className="text-[10px] text-red-400 font-mono uppercase bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ОШИБКА: {e.error}
                          </div>
                        ) : (
                          <span className="text-[10px] text-cyan-400 font-mono uppercase bg-cyan-950 border border-cyan-900/50 px-2 py-0.5 rounded truncate">
                            {e.vendor || 'ПОСТАВЩИК?'}
                          </span>
                        )}
                    </div>
                    <div className="absolute top-0 right-0" ref={menuRef}>
                        <button onClick={(evt) => { evt.stopPropagation(); setShowMenu(!showMenu); }} className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                        </button>
                        {showMenu && (
                          <div className="absolute right-0 top-10 w-44 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                            <button onClick={(evt) => { evt.stopPropagation(); onTypeToggle(e.id); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3">
                              <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              ИЗМЕНИТЬ ТИП
                            </button>
                            <button onClick={(evt) => { evt.stopPropagation(); onArchiveToggle(e.id); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                              В АРХИВ
                            </button>
                            <div className="h-px bg-slate-700 my-1 mx-2"></div>
                            <button onClick={(evt) => { evt.stopPropagation(); onPermanentDelete(e.id); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-950/30 flex items-center gap-3">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                              УДАЛИТЬ
                            </button>
                          </div>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-between items-end mt-6 pt-4 border-t border-slate-800/50">
                    <div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase mb-1 opacity-60 tracking-widest">_КОЛ_ВО / ЦЕНА_</span>
                        <div className="text-sm text-slate-200 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">{e.quantity || '0'} {e.unit || 'шт'} <span className="text-slate-600">×</span> {e.price?.toLocaleString() || '0'} <span className="text-[10px] opacity-40 ml-0.5">₽</span></div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1 opacity-60 tracking-widest">_ИТОГО_</span>
                        <div className="text-2xl font-bold text-emerald-400 coding-font tracking-tighter">{e.total?.toLocaleString() || '0'} <span className="text-sm font-normal opacity-50">₽</span></div>
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
  const [showUnitsMenu, setShowUnitsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entryFileInputRef = useRef<HTMLInputElement>(null);
  const unitsMenuRef = useRef<HTMLDivElement>(null);

  const commonUnits = ['шт', 'кв.м', 'пог.м', 'куб.м', 'кг', 'т', 'ч'];

  const loadEntries = async () => {
    try {
      const data = await getEntriesByProject(project.id, showArchivedEntries);
      setEntries(data);
    } catch (err) {}
  };

  useEffect(() => {
    loadEntries();
    const interval = setInterval(loadEntries, 3000);
    return () => clearInterval(interval);
  }, [project.id, showArchivedEntries]);

  useEffect(() => {
    if (initialAction === 'photo') fileInputRef.current?.click();
    if (initialAction === 'voice') handleVoiceInput();
  }, [initialAction]);

  const handleEntryArchiveToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      await saveEntry({ ...entry, archived: !entry.archived });
      await loadEntries();
    }
  };

  const handleEntryTypeToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      await saveEntry({ ...entry, type: entry.type === EntryType.MATERIAL ? EntryType.LABOR : EntryType.MATERIAL });
      await loadEntries();
    }
  };

  const handleEntryPermanentDelete = async (id: string) => {
    if (window.confirm("Удалить навсегда?")) {
      await deleteEntry(id);
      await loadEntries();
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голос не поддерживается");
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      const placeholder: Entry = {
        id: generateId(), projectId: project.id, type: activeTab, name: 'Разбор голоса...',
        quantity: null, unit: null, price: null, total: null, vendor: null,
        date: Date.now(), processed: false, archived: false, voiceTranscript: transcript
      };
      await saveEntry(placeholder);
      await addToSyncQueue({ id: generateId(), entryId: placeholder.id, type: 'VOICE', payload: transcript });
      onSyncRequested();
      await loadEntries();
    };
    recognition.start();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      onSyncRequested();
      await loadEntries();
    };
    reader.readAsDataURL(file);
  };

  const addManualEntry = async () => {
    const newEntry: Entry = {
      id: generateId(), projectId: project.id, type: activeTab,
      name: '', quantity: 1, unit: 'шт', price: 0, total: 0, vendor: '',
      date: Date.now(), processed: true, archived: false
    };
    await saveEntry(newEntry);
    setEditingEntry(newEntry);
    await loadEntries();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-slate-900 p-1 rounded-2xl mb-6 border border-slate-800 shadow-inner max-w-lg mx-auto w-full">
        <button onClick={() => setActiveTab(EntryType.MATERIAL)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === EntryType.MATERIAL ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>МАТЕРИАЛЫ</button>
        <button onClick={() => setActiveTab(EntryType.LABOR)} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === EntryType.LABOR ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>РАБОТЫ</button>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pb-40">
        {entries.filter(e => e.type === activeTab).map(e => (
            <EntryCard key={e.id} e={e} onSelect={setEditingEntry} onArchiveToggle={handleEntryArchiveToggle} onPermanentDelete={handleEntryPermanentDelete} onTypeToggle={handleEntryTypeToggle} isArchivedView={showArchivedEntries} onShowImage={(src) => setFullscreenImage({src, entryId: e.id})} />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 flex justify-center gap-4 z-40 shadow-2xl">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-slate-900 rounded-2xl text-cyan-400 border border-slate-800 flex items-center justify-center active:scale-90 shadow-lg shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeWidth={2} /></svg>
          </button>
          <button onClick={handleVoiceInput} className={`w-14 h-14 shrink-0 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-900 text-emerald-400'} border border-slate-800 rounded-2xl flex items-center justify-center active:scale-90 shadow-lg`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/></svg>
          </button>
          <button onClick={addManualEntry} className="flex-1 bg-emerald-600 h-14 rounded-2xl font-bold text-white shadow-xl uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all">
            ДОБАВИТЬ
          </button>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center backdrop-blur-md p-6">
          <div className="bg-slate-900 w-full max-w-xl p-8 rounded-[3rem] border border-slate-800 space-y-6">
             <h2 className="text-xl font-bold text-emerald-400 coding-font tracking-tighter uppercase">_РЕДАКТОР</h2>
             <textarea value={editingEntry.name} onChange={e => setEditingEntry({...editingEntry, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-emerald-500" rows={3} placeholder="Описание..." />
             <div className="grid grid-cols-2 gap-4">
                <input type="number" value={editingEntry.quantity || ''} onChange={e => setEditingEntry({...editingEntry, quantity: parseFloat(e.target.value) || 0})} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none" placeholder="Кол-во" />
                <input value={editingEntry.unit || ''} onChange={e => setEditingEntry({...editingEntry, unit: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none" placeholder="Ед.изм" />
             </div>
             <input type="number" value={editingEntry.price || ''} onChange={e => setEditingEntry({...editingEntry, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none" placeholder="Цена" />
             <div className="flex gap-4">
                <button onClick={() => setEditingEntry(null)} className="flex-1 bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 uppercase text-xs">Отмена</button>
                <button onClick={async () => { await saveEntry({...editingEntry, total: (editingEntry.quantity || 0) * (editingEntry.price || 0)}); setEditingEntry(null); loadEntries(); }} className="flex-1 bg-emerald-600 py-4 rounded-2xl font-bold text-white uppercase text-xs">Сохранить</button>
             </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <img src={`data:image/jpeg;base64,${fullscreenImage.src}`} className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
