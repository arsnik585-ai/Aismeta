import React, { useState, useEffect, useRef } from 'react';
import { Project, Entry, EntryType } from '../types';
import { getEntriesByProject, saveEntry, deleteEntry, generateId } from '../db';

interface ProjectDetailProps {
  project: Project;
  initialAction?: string | null;
  activeTab: EntryType;
  onDataChange: () => void;
}

const COMMON_UNITS = ['шт', 'м²', 'м³', 'м.п.', 'кг', 'т', 'компл.', 'усл. ед.', 'час', 'смена'];

const EntryCard: React.FC<{
    e: Entry;
    onSelect: (e: Entry) => void;
    onPermanentDelete: (id: string) => void;
    onTypeToggle: (id: string) => void;
}> = ({ e, onSelect, onPermanentDelete, onTypeToggle }) => {
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
        if (diff < 0) setTranslateX(Math.max(diff, -100));
        else setTranslateX(0);
    };

    const onTouchEnd = () => {
        if (translateX < -60) setTranslateX(-100);
        else setTranslateX(0);
    };

    const handleDelete = (evt: React.MouseEvent | React.PointerEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
        onPermanentDelete(e.id);
        setShowMenu(false);
        setTranslateX(0);
    };

    const stopBubbling = (evt: React.SyntheticEvent) => {
        evt.stopPropagation();
    };

    return (
        <div className="relative overflow-hidden rounded-[1.5rem] bg-slate-950">
            {/* Swipe Menu */}
            <div className="absolute inset-0 flex items-center justify-end px-4 gap-2">
                <button 
                  onMouseDown={handleDelete}
                  className="bg-red-600 text-white h-[80%] px-6 rounded-xl text-[9px] font-bold uppercase shadow-lg flex flex-col items-center justify-center gap-1 active:bg-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                  Удалить
                </button>
            </div>

            {/* Main Card */}
            <div 
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
                onClick={() => !isMoving.current && translateX === 0 && onSelect(e)}
                style={{ transform: `translateX(${translateX}px)` }}
                className={`bg-slate-900 border border-slate-800 p-5 rounded-[1.5rem] transition-transform duration-200 ease-out relative z-10 shadow-lg active:bg-slate-800 h-full flex flex-col justify-between cursor-pointer`}
            >
                <div className="flex justify-between items-start gap-3 relative">
                    <div className="flex-1 min-w-0 pr-8">
                        <div className={`text-lg font-bold text-white leading-tight mb-1 truncate uppercase coding-font`}>
                          {e.name || 'БЕЗ НАЗВАНИЯ'}
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            <span className="text-[10px] text-cyan-400 font-mono uppercase bg-cyan-950 border border-cyan-900/50 px-2 py-0.5 rounded shrink-0">
                                {e.vendor || 'ПОСТАВЩИК?'}
                            </span>
                            {e.images && e.images.length > 0 && (
                                <div className="bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50 flex items-center gap-1 shrink-0">
                                   <svg className="w-2.5 h-2.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" /></svg>
                                   <span className="text-[9px] text-slate-500 font-bold">{e.images.length}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Menu Button */}
                    <div 
                        className="absolute top-0 right-0 z-20" 
                        ref={menuRef} 
                        onClick={(evt) => evt.stopPropagation()}
                    >
                        <button 
                            onClick={(evt) => { stopBubbling(evt); setShowMenu(!showMenu); }}
                            className="p-1 text-slate-400 hover:text-white transition-colors active:scale-90"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                        </button>
                        {showMenu && (
                          <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                            <button 
                                onMouseDown={(evt) => { stopBubbling(evt); onTypeToggle(e.id); setShowMenu(false); }} 
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-3"
                            >
                              <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              ИЗМЕНИТЬ ТИП
                            </button>
                            <div className="h-px bg-slate-700 my-1 mx-2"></div>
                            <button 
                              onMouseDown={handleDelete}
                              className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-950/30 flex items-center gap-3"
                            >
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
                        <div className="text-sm text-slate-200 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 tabular-nums">
                            {e.quantity || '0'} {e.unit || 'шт'} <span className="text-slate-600">×</span> {e.price?.toLocaleString() || '0'} <span className="text-[10px] opacity-40 ml-0.5">₽</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] text-slate-500 font-mono uppercase block mb-1 opacity-60 tracking-widest">_ИТОГО_</span>
                        <div className="text-2xl font-bold text-emerald-400 coding-font tracking-tighter tabular-nums">
                            {e.total?.toLocaleString() || '0'} <span className="text-sm font-normal opacity-50">₽</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, activeTab, onDataChange }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const editorFileInputRef = useRef<HTMLInputElement>(null);

  const loadEntries = async () => {
    try {
      const data = await getEntriesByProject(project.id, false);
      setEntries(data);
    } catch (err) {}
  };

  useEffect(() => {
    loadEntries();
  }, [project.id]);

  const handleEntryTypeToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      await saveEntry({ ...entry, type: entry.type === EntryType.MATERIAL ? EntryType.LABOR : EntryType.MATERIAL });
      await loadEntries();
      onDataChange();
    }
  };

  const handleEntryPermanentDelete = async (id: string) => {
    if (window.confirm("Удалить навсегда?")) {
      await deleteEntry(id);
      await loadEntries();
      onDataChange();
    }
  };

  const handleEditorPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingEntry) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const updatedImages = [...(editingEntry.images || []), base64];
      setEditingEntry({ ...editingEntry, images: updatedImages });
    };
    reader.readAsDataURL(file);
    if (editorFileInputRef.current) editorFileInputRef.current.value = '';
  };

  const removeImage = (idx: number) => {
    if (!editingEntry) return;
    const updatedImages = [...(editingEntry.images || [])];
    updatedImages.splice(idx, 1);
    setEditingEntry({ ...editingEntry, images: updatedImages });
  };

  const addManualEntry = async () => {
    const newEntry: Entry = {
      id: generateId(), projectId: project.id, type: activeTab,
      name: '', quantity: 1, unit: '', price: 0, total: 0, vendor: '',
      date: Date.now(), archived: false
    };
    await saveEntry(newEntry);
    setEditingEntry(newEntry);
    await loadEntries();
  };

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 pb-40 px-1">
        {entries.filter(e => e.type === activeTab).map(e => (
            <EntryCard 
              key={e.id} 
              e={e} 
              onSelect={setEditingEntry} 
              onPermanentDelete={handleEntryPermanentDelete} 
              onTypeToggle={handleEntryTypeToggle} 
            />
        ))}
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 flex justify-center gap-4 z-40 shadow-2xl"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
          <button onClick={addManualEntry} className="flex-1 bg-emerald-600 h-14 rounded-2xl font-bold text-white shadow-xl uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all hover:bg-emerald-500">
            ДОБАВИТЬ ПОЗИЦИЮ
          </button>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 w-full max-w-xl p-6 md:p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl my-auto">
             <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-emerald-400 coding-font tracking-tighter uppercase">_РЕДАКТОР</h2>
             </div>

             <div className="space-y-4">
                <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono uppercase px-2">НАИМЕНОВАНИЕ / ПОСТАВЩИК</span>
                    <textarea value={editingEntry.name} onChange={e => setEditingEntry({...editingEntry, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 text-sm" rows={2} placeholder="Что купили или сделали..." />
                    <input value={editingEntry.vendor || ''} onChange={e => setEditingEntry({...editingEntry, vendor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none text-xs text-cyan-400 coding-font" placeholder="Магазин или мастер..." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase px-2">КОЛ-ВО</span>
                        <input type="number" value={editingEntry.quantity || ''} onChange={e => setEditingEntry({...editingEntry, quantity: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" placeholder="1" />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase px-2">ЕД.ИЗМ</span>
                        <input 
                          list="units-list"
                          value={editingEntry.unit || ''} 
                          onChange={e => setEditingEntry({...editingEntry, unit: e.target.value})} 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" 
                          placeholder="шт, м2..." 
                        />
                        <datalist id="units-list">
                          {COMMON_UNITS.map(u => <option key={u} value={u} />)}
                        </datalist>
                    </div>
                </div>
                
                <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-mono uppercase px-2">ЦЕНА (ЗА ЕД.)</span>
                    <input type="number" value={editingEntry.price || ''} onChange={e => setEditingEntry({...editingEntry, price: parseFloat(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none text-sm" placeholder="0" />
                </div>
             </div>

             {/* Images Section with Move Photo Button */}
             <div className="space-y-2 pt-2 border-t border-slate-800/50">
                <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">ИЗОБРАЖЕНИЯ</span>
                    <input type="file" ref={editorFileInputRef} className="hidden" accept="image/*" onChange={handleEditorPhotoAdd} />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar items-center">
                    {/* Move Add Photo Button Here */}
                    <button 
                      onClick={() => editorFileInputRef.current?.click()} 
                      className="w-24 h-24 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/50 text-cyan-400 active:bg-slate-800/50 shrink-0 shadow-lg"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-[8px] font-bold uppercase tracking-widest">ФОТО</span>
                    </button>

                    {editingEntry.images && editingEntry.images.map((img, idx) => (
                        <div key={idx} className="relative shrink-0 group">
                            <img src={`data:image/jpeg;base64,${img}`} className="w-24 h-24 object-cover rounded-2xl border border-slate-700 shadow-xl" onClick={() => setFullscreenImage(img)} />
                            <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg active:scale-90 border-2 border-slate-900">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
             </div>

             <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingEntry(null)} className="flex-1 bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 uppercase text-xs hover:bg-slate-700 transition-colors">Отмена</button>
                <button onClick={async () => { await saveEntry({...editingEntry, total: (editingEntry.quantity || 0) * (editingEntry.price || 0)}); setEditingEntry(null); loadEntries(); onDataChange(); }} className="flex-1 bg-emerald-600 py-4 rounded-2xl font-bold text-white uppercase text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/20">Сохранить</button>
             </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex flex-col items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white backdrop-blur-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={`data:image/jpeg;base64,${fullscreenImage}`} className="max-w-full max-h-full rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] object-contain" alt="Fullscreen" />
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;