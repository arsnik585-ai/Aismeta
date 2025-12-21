
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

// Helper to compress image
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
    onUpdate: (updated: Entry) => void;
    onDelete: (id: string) => void;
    onTypeToggle: (id: string) => void;
    onShowFullscreen: (img: string) => void;
}> = ({ e, onUpdate, onDelete, onTypeToggle, onShowFullscreen }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            updated.total = (updated.quantity || 0) * (updated.price || 0);
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

    const removePhoto = (idx: number) => {
        const updatedImages = [...(e.images || [])];
        updatedImages.splice(idx, 1);
        handleChange({ images: updatedImages });
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] p-3.5 shadow-lg space-y-3 relative group">
            {/* Header */}
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <textarea 
                        value={e.name}
                        onChange={(evt) => handleChange({ name: evt.target.value })}
                        placeholder="Наименование..."
                        rows={1}
                        className="w-full bg-transparent text-sm text-white font-bold coding-font uppercase outline-none focus:text-emerald-400 placeholder:text-slate-700 resize-none overflow-hidden leading-snug"
                        onInput={(evt) => {
                            const target = evt.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                        }}
                    />
                    <input 
                        value={e.vendor || ''}
                        onChange={(evt) => handleChange({ vendor: evt.target.value })}
                        placeholder="Поставщик / Мастер"
                        className="w-full bg-transparent text-[9px] text-cyan-500 font-mono uppercase outline-none placeholder:text-slate-800 mt-0.5"
                    />
                </div>
                
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-slate-700 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-7 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-20 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button onClick={() => { onTypeToggle(e.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-slate-300 hover:bg-slate-700 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeWidth={2}/></svg>
                                ТИП
                            </button>
                            <button onClick={() => { if(confirm('Удалить?')) onDelete(e.id); setShowMenu(false); }} className="w-full text-left px-3 py-1.5 text-[9px] font-bold text-red-400 hover:bg-red-950/30 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" strokeWidth={2}/></svg>
                                УДАЛИТЬ
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Inputs Grid - Compact */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40">
                <div className="space-y-0.5">
                    <span className="block text-[7px] text-slate-600 font-mono uppercase tracking-tighter">Кол-во</span>
                    <input 
                        type="number" 
                        value={e.quantity === null ? '' : e.quantity}
                        onChange={(evt) => handleChange({ quantity: evt.target.value === '' ? null : parseFloat(evt.target.value) })}
                        className="w-full bg-transparent text-xs text-white font-bold outline-none tabular-nums"
                        placeholder="0"
                    />
                </div>
                <div className="space-y-0.5">
                    <span className="block text-[7px] text-slate-600 font-mono uppercase tracking-tighter">Ед.изм</span>
                    <input 
                        list={`units-${e.id}`}
                        value={e.unit || ''}
                        onChange={(evt) => handleChange({ unit: evt.target.value })}
                        className="w-full bg-transparent text-xs text-white font-bold outline-none"
                        placeholder="шт"
                    />
                    <datalist id={`units-${e.id}`}>
                        {COMMON_UNITS.map(u => <option key={u} value={u} />)}
                    </datalist>
                </div>
                <div className="space-y-0.5">
                    <span className="block text-[7px] text-slate-600 font-mono uppercase tracking-tighter">Цена (₽)</span>
                    <input 
                        type="number" 
                        value={e.price === null ? '' : e.price}
                        onChange={(evt) => handleChange({ price: evt.target.value === '' ? null : parseFloat(evt.target.value) })}
                        className="w-full bg-transparent text-xs text-emerald-500 font-bold outline-none tabular-nums"
                        placeholder="0"
                    />
                </div>
            </div>

            {/* Photos & Total */}
            <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar items-center min-h-[40px]">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-slate-950 text-slate-600 hover:text-emerald-500 border border-slate-800 border-dashed transition-all active:scale-90"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={2}/></svg>
                        <input type="file" ref={fileInputRef} onChange={handleAddPhoto} className="hidden" accept="image/*" />
                    </button>
                    {e.images?.map((img, idx) => (
                        <div key={idx} className="relative shrink-0">
                            <img 
                                src={`data:image/jpeg;base64,${img}`} 
                                onClick={() => onShowFullscreen(img)}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500 transition-colors"
                            />
                            <button 
                                onClick={() => removePhoto(idx)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 shadow-lg"
                            >
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
                            </button>
                        </div>
                    ))}
                </div>
                <div className="text-right shrink-0">
                    <span className="block text-[7px] text-slate-600 font-mono uppercase tracking-widest">ИТОГО</span>
                    <div className="text-lg font-bold text-white coding-font tabular-nums tracking-tighter">
                        {(e.total || 0).toLocaleString()} <span className="text-[9px] opacity-40 font-normal">₽</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, activeTab, onDataChange }) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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
    await deleteEntry(id);
    setEntries(prev => prev.filter(item => item.id !== id));
    onDataChange();
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
      vendor: '',
      date: Date.now(),
      archived: false
    };
    await saveEntry(newEntry);
    setEntries(prev => [newEntry, ...prev]);
    onDataChange();
  };

  const sectionTotal = entries
    .filter(e => e.type === activeTab)
    .reduce((sum, e) => sum + (e.total || 0), 0);

  return (
    <div className="flex flex-col h-full pt-1">
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pb-36 px-1 no-scrollbar">
        {entries.filter(e => e.type === activeTab).map(e => (
            <EntryCard 
              key={e.id} 
              e={e} 
              onUpdate={handleEntryUpdate}
              onDelete={handleEntryDelete}
              onTypeToggle={handleEntryTypeToggle}
              onShowFullscreen={setFullscreenImage}
            />
        ))}
        {entries.filter(e => e.type === activeTab).length === 0 && (
            <div className="col-span-full py-16 text-center opacity-10 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center gap-3">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={1}/></svg>
                <p className="text-[9px] uppercase font-mono tracking-widest">Список пуст</p>
            </div>
        )}
      </div>

      <div 
        className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/90 backdrop-blur-2xl border-t border-slate-800/60 flex items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
          <div className="flex flex-col pl-2">
              <span className="text-[7px] text-slate-500 font-mono uppercase tracking-[0.2em] mb-0.5">_ИТОГО {activeTab === EntryType.MATERIAL ? 'МАТ' : 'РАБ'}_</span>
              <div className="text-xl font-bold text-white coding-font tracking-tighter tabular-nums leading-none">
                  {sectionTotal.toLocaleString()} <span className="text-[10px] text-emerald-500 font-normal">₽</span>
              </div>
          </div>
          
          <button 
            onClick={addManualEntry} 
            className="bg-emerald-600 h-12 px-6 rounded-xl font-bold text-white shadow-lg uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3}/></svg>
            ДОБАВИТЬ
          </button>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/98 z-[100] flex flex-col items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white backdrop-blur-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img 
            src={`data:image/jpeg;base64,${fullscreenImage}`} 
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-150" 
            alt="Fullscreen" 
          />
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
