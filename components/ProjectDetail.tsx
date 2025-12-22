
import React, { useState, useEffect, useRef } from 'react';
import { Project, Entry, EntryType, AppSettings } from '../types';
import { getEntriesByProject, saveEntry, deleteEntry, generateId } from '../db';

interface ProjectDetailProps {
  project: Project;
  initialAction?: string | null;
  activeTab: EntryType;
  onDataChange: () => void;
  settings: AppSettings;
  onTabChange: (tab: EntryType) => void;
}

const COMMON_UNITS = ['шт', 'м²', 'м³', 'м.п.', 'кг', 'т', 'компл.', 'усл. ед.', 'час', 'смена'];

const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressed.split(',')[1]);
        };
    });
};

const EntryCard: React.FC<{
    e: Entry;
    index: number;
    totalCount: number;
    onUpdate: (updated: Entry) => void;
    onDelete: (id: string) => void;
    onTypeToggle: (id: string) => void;
    onShowFullscreen: (img: string, entryId: string, photoIdx: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
    settings: AppSettings;
}> = ({ e, index, totalCount, onUpdate, onDelete, onTypeToggle, onShowFullscreen, onMove, settings }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDefaultQty, setIsDefaultQty] = useState(e.quantity === null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleChange = (fields: Partial<Entry>) => {
        const updated = { ...e, ...fields };
        if ('quantity' in fields || 'price' in fields) {
            const q = updated.quantity === null ? 1 : updated.quantity;
            updated.total = q * (updated.price || 0);
        }
        onUpdate(updated);
    };

    const handleAddPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const compressed = await compressImage(base64);
            handleChange({ images: [...(e.images || []), compressed] });
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md space-y-1 relative group transition-all duration-200">
            <div className="flex justify-between items-start gap-1">
                <div className="flex-1 min-w-0">
                    <textarea 
                        value={e.name}
                        onChange={(evt) => handleChange({ name: evt.target.value })}
                        placeholder="Наименование..."
                        rows={1}
                        className="w-full bg-transparent text-[14px] text-white font-bold outline-none focus:text-emerald-400 placeholder:text-slate-700 resize-none overflow-hidden leading-tight"
                        onInput={(evt) => {
                            const target = evt.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                        }}
                    />
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-slate-950/50 p-0.5 rounded-md border border-slate-800">
                    <button 
                      disabled={index === 0}
                      onClick={(ev) => { ev.stopPropagation(); onMove(index, 'up'); }}
                      className={`p-1 rounded transition-colors ${index === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button 
                      disabled={index === totalCount - 1}
                      onClick={(ev) => { ev.stopPropagation(); onMove(index, 'down'); }}
                      className={`p-1 rounded transition-colors ${index === totalCount - 1 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>

                  <div className="relative" ref={menuRef}>
                      <button 
                        onClick={(ev) => { ev.stopPropagation(); setShowMenu(!showMenu); }} 
                        className="p-1 text-slate-300 hover:text-white transition-colors"
                      >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                      </button>
                      {showMenu && (
                          <div className="absolute right-0 top-6 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95 duration-75 origin-top-right">
                              <button onClick={(ev) => { ev.stopPropagation(); onTypeToggle(e.id); setShowMenu(false); }} className="w-full text-left px-2 py-1.5 text-[8px] font-bold text-slate-300 hover:bg-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeWidth={2}/></svg>
                                  {e.type === EntryType.MATERIAL ? `В ${settings.labels.laborTab.toUpperCase()}` : `В ${settings.labels.materialTab.toUpperCase()}`}
                              </button>
                              <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); setShowMenu(false); }} className="w-full text-left px-2 py-1.5 text-[8px] font-bold text-red-400 hover:bg-red-950/30 uppercase tracking-widest flex items-center gap-1.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  {settings.labels.deleteLabel.toUpperCase()}
                              </button>
                          </div>
                      )}
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                <div className="space-y-0">
                    <span className="block text-[7px] text-slate-300 font-mono uppercase tracking-tighter font-bold">{settings.labels.quantityLabel}</span>
                    <input 
                        type="number" 
                        value={e.quantity === null ? '' : e.quantity}
                        onFocus={(evt) => { 
                            if(isDefaultQty) {
                                evt.target.value = '';
                                setIsDefaultQty(false);
                            }
                        }}
                        onChange={(evt) => {
                            const val = evt.target.value === '' ? null : parseFloat(evt.target.value);
                            handleChange({ quantity: val });
                        }}
                        className="w-full bg-transparent text-[14px] text-white font-bold outline-none tabular-nums"
                        placeholder="1"
                    />
                </div>
                <div className="space-y-0">
                    <span className="block text-[7px] text-slate-300 font-mono uppercase tracking-tighter font-bold">{settings.labels.unitLabel}</span>
                    <input 
                        list={`units-${e.id}`}
                        value={e.unit || ''}
                        onChange={(evt) => handleChange({ unit: evt.target.value })}
                        className="w-full bg-transparent text-[14px] text-white font-bold outline-none"
                        placeholder="шт"
                    />
                    <datalist id={`units-${e.id}`}>
                        {COMMON_UNITS.map(u => <option key={u} value={u} />)}
                    </datalist>
                </div>
                <div className="space-y-0">
                    <span className="block text-[7px] text-slate-300 font-mono uppercase tracking-tighter font-bold">{settings.labels.priceLabel} (₽)</span>
                    <input 
                        type="number" 
                        value={e.price === null ? '' : e.price}
                        onChange={(evt) => handleChange({ price: evt.target.value === '' ? null : parseFloat(evt.target.value) })}
                        className="w-full bg-transparent text-[14px] text-emerald-500 font-bold outline-none tabular-nums"
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/20">
                <div className="text-left shrink-0 min-w-[70px]">
                    <span className="block text-[6px] text-slate-400 font-mono uppercase tracking-widest leading-none font-bold">{settings.labels.totalLabel}</span>
                    <div className="text-[14px] font-bold text-white tabular-nums tracking-tighter leading-none mt-0.5">
                        {(e.total || 0).toLocaleString()} <span className="text-[8px] opacity-40 font-normal">₽</span>
                    </div>
                </div>

                <div className="flex-1 flex gap-1 overflow-x-auto no-scrollbar items-center justify-end">
                    {e.images?.map((img, idx) => (
                        <div key={idx} className="relative shrink-0">
                            <img 
                                src={`data:image/jpeg;base64,${img}`} 
                                onClick={(ev) => { ev.stopPropagation(); onShowFullscreen(img, e.id, idx); }}
                                className="w-8 h-8 object-cover rounded-md border border-slate-800 shadow-sm cursor-pointer"
                            />
                        </div>
                    ))}
                </div>

                <button 
                    onClick={(ev) => { ev.stopPropagation(); fileInputRef.current?.click(); }}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md bg-slate-950 text-slate-300 hover:text-emerald-500 border border-slate-700 border-dashed transition-all active:scale-90"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                    <input type="file" ref={fileInputRef} onChange={handleAddPhoto} className="hidden" accept="image/*" />
                </button>
            </div>
        </div>
    );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, activeTab, onDataChange, settings, onTabChange }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fullscreenData, setFullscreenData] = useState<{ img: string, entryId: string, idx: number } | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const loadEntries = async () => {
    try {
      const data = await getEntriesByProject(project.id, false);
      setEntries(data);
    } catch (err) {}
  };

  useEffect(() => {
    loadEntries();
  }, [project.id]);

  const handleEntryUpdate = async (updated: Entry) => {
    await saveEntry(updated);
    setEntries(prev => prev.map(item => item.id === updated.id ? updated : item));
    onDataChange();
  };

  const handleEntryDelete = async (id: string) => {
    if (confirm('Удалить эту позицию?')) {
        await deleteEntry(id);
        setEntries(prev => prev.filter(item => item.id !== id));
        onDataChange();
    }
  };

  const handleEntryTypeToggle = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
      const updated = { ...entry, type: entry.type === EntryType.MATERIAL ? EntryType.LABOR : EntryType.MATERIAL };
      await saveEntry(updated);
      loadEntries();
      onDataChange();
    }
  };

  const addManualEntry = async () => {
    const newEntry: Entry = {
      id: generateId(),
      projectId: project.id,
      type: activeTab,
      name: '',
      quantity: null,
      unit: '',
      price: null,
      total: 0,
      date: Date.now(),
      order: entries.length,
      archived: false
    };
    await saveEntry(newEntry);
    setEntries(prev => [...prev, newEntry]);
    onDataChange();
  };

  const removePhotoFromEntry = async (entryId: string, idx: number) => {
      if (!confirm('Удалить это фото?')) return;
      const entry = entries.find(e => e.id === entryId);
      if (entry && entry.images) {
          const updatedImages = [...entry.images];
          updatedImages.splice(idx, 1);
          const updated = { ...entry, images: updatedImages };
          await handleEntryUpdate(updated);
          setFullscreenData(null);
      }
  };

  const handleMoveEntry = async (index: number, direction: 'up' | 'down') => {
    const currentTabEntries = entries.filter(e => e.type === activeTab);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentTabEntries.length) return;

    const newTabEntries = [...currentTabEntries];
    [newTabEntries[index], newTabEntries[targetIndex]] = [newTabEntries[targetIndex], newTabEntries[index]];

    const finalizedTabEntries = newTabEntries.map((item, i) => ({ ...item, order: i }));
    const otherEntries = entries.filter(e => e.type !== activeTab);
    const finalizedAll = [...otherEntries, ...finalizedTabEntries].sort((a,b) => (a.order ?? 0) - (b.order ?? 0));

    setEntries(finalizedAll);
    for (const item of finalizedTabEntries) {
      await saveEntry(item);
    }
    onDataChange();
  };

  const sectionTotal = entries
    .filter(e => e.type === activeTab)
    .reduce((sum, e) => {
      const q = e.quantity === null ? 1 : e.quantity;
      return sum + (q * (e.price || 0));
    }, 0);

  const currentTabEntries = entries.filter(e => e.type === activeTab);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
    if (deltaX > 70) { 
      onTabChange(EntryType.MATERIAL);
    } else if (deltaX < -70) {
      onTabChange(EntryType.LABOR);
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className="flex flex-col h-full pt-0.5 select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pb-28 px-1 no-scrollbar">
        {currentTabEntries.map((e, idx) => (
            <EntryCard 
              key={e.id} 
              e={e} 
              index={idx}
              totalCount={currentTabEntries.length}
              onUpdate={handleEntryUpdate}
              onDelete={handleEntryDelete}
              onTypeToggle={handleEntryTypeToggle}
              onShowFullscreen={(img, eid, pidx) => setFullscreenData({ img, entryId: eid, idx: pidx })}
              onMove={handleMoveEntry}
              settings={settings}
            />
        ))}
        {currentTabEntries.length === 0 && (
            <div className="col-span-full py-8 text-center opacity-10 border border-dashed border-slate-800 rounded-lg flex flex-col items-center gap-1.5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={1}/></svg>
                <p className="text-[7px] uppercase font-mono tracking-widest">Список пуст</p>
            </div>
        )}
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 p-2 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/60 flex items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
          <div className="flex flex-col pl-2">
              <span className="text-[6px] text-slate-300 font-mono uppercase tracking-[0.2em] mb-0.5 font-bold">_{settings.labels.totalLabel} {activeTab === EntryType.MATERIAL ? settings.labels.materialTab.substring(0,3).toUpperCase() : settings.labels.laborTab.substring(0,3).toUpperCase()}_</span>
              <div className="text-base font-bold text-white tracking-tighter tabular-nums leading-none">
                  {sectionTotal.toLocaleString()} <span className="text-[9px] text-emerald-500 font-normal">₽</span>
              </div>
          </div>
          
          <button 
            onClick={addManualEntry} 
            className="bg-emerald-600 h-10 px-6 rounded-lg font-bold text-white shadow-lg uppercase text-[8px] tracking-widest active:scale-95 transition-all flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
            {settings.labels.addBtn}
          </button>
      </div>

      {fullscreenData && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex flex-col items-center justify-center p-4">
          <img 
            src={`data:image/jpeg;base64,${fullscreenData.img}`} 
            className="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-150" 
            alt="Fullscreen" 
          />
          
          <div className="flex gap-3 mt-8 w-full max-w-xs">
            <button 
                onClick={() => removePhotoFromEntry(fullscreenData.entryId, fullscreenData.idx)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
                {settings.labels.deleteLabel}
            </button>
            <button 
                onClick={() => setFullscreenData(null)}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2"
            >
                Назад
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
