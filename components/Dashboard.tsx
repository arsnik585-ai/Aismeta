
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { saveProject } from '../db';

interface DashboardProps {
  projects: Project[];
  materialTotals: Record<string, number>;
  laborTotals: Record<string, number>;
  onProjectSelect: (p: Project) => void;
  onCreateProject: (name: string, address: string) => void;
  onArchive: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onDuplicate: (p: Project) => void;
  onRename: (id: string, name: string, address: string) => void;
  onShare: (p: Project, format: 'text' | 'html' | 'json') => void;
  onQuickAction: (p: Project, action: string) => void;
  viewingArchive: boolean;
}

const ProjectCard: React.FC<{
  p: Project;
  index: number;
  totalCount: number;
  mTotal: number;
  lTotal: number;
  onSelect: (p: Project) => void;
  onArchiveToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRenameStart: (p: Project) => void;
  onShareClick: (p: Project) => void;
  onDuplicate: (p: Project) => void;
  onQuickAction: (p: Project, action: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  isArchivedView: boolean;
}> = ({ p, index, totalCount, mTotal, lTotal, onSelect, onArchiveToggle, onDelete, onRenameStart, onShareClick, onDuplicate, onQuickAction, onMove, isArchivedView }) => {
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

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div className={`relative rounded-xl bg-slate-950 transition-all duration-200 ${showMenu ? 'z-50' : 'z-10'}`}>
      <div 
        onClick={() => onSelect(p)}
        className={`bg-slate-900 border border-slate-800 p-2.5 rounded-xl transition-all cursor-pointer relative shadow-lg active:bg-slate-800 h-full flex flex-col justify-between ${isArchivedView ? 'opacity-90' : ''}`}
      >
        <div>
          <div className="flex justify-between items-start mb-1">
            <span className="text-[8px] text-emerald-400 font-mono bg-emerald-950 border border-emerald-900/50 px-1.5 py-0.5 rounded-full font-bold">
              {new Date(p.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </span>
            
            <div className="flex items-center gap-1">
              {!isArchivedView && (
                <div className="flex items-center gap-0.5 mr-1 bg-slate-950/50 p-0.5 rounded-md border border-slate-800">
                  <button 
                    disabled={index === 0}
                    onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
                    className={`p-1 rounded transition-colors ${index === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button 
                    disabled={index === totalCount - 1}
                    onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
                    className={`p-1 rounded transition-colors ${index === totalCount - 1 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
              )}

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={toggleMenu}
                  className="p-1 text-slate-300 hover:text-white transition-colors rounded hover:bg-slate-800"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRenameStart(p); setShowMenu(false); }}
                      className="w-full text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2}/></svg>
                      ПРАВКА
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDuplicate(p); setShowMenu(false); }}
                      className="w-full text-left px-2.5 py-1.5 text-[9px] font-bold text-slate-300 hover:bg-slate-700 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                      КОПИЯ
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onArchiveToggle(p.id); setShowMenu(false); }}
                      className="w-full text-left px-2.5 py-1.5 text-[9px] font-bold text-amber-400 hover:bg-amber-950/30 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      {isArchivedView ? 'ВЕРНУТЬ' : 'АРХИВ'}
                    </button>
                    {!isArchivedView && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onShareClick(p); setShowMenu(false); }}
                        className="w-full text-left px-2.5 py-1.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-950/30 flex items-center gap-2 uppercase tracking-widest"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        ОТЧЕТ
                      </button>
                    )}
                    <div className="h-px bg-slate-700 my-0.5 mx-1.5"></div>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onDelete(p.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[9px] font-bold text-red-400 hover:bg-red-950/30 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      УДАЛИТЬ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-1">
            <h3 className="text-lg font-bold text-white truncate tracking-tight leading-none">{p.name}</h3>
            <p className="text-[9px] text-slate-300 mt-0.5 uppercase tracking-wide font-mono flex items-center gap-1 font-bold">
              <svg className="w-2.5 h-2.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth={2}/></svg>
              {p.address || 'ЛОКАЦИЯ?'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
           <div className="text-left flex flex-col gap-0.5">
              <div className="leading-none">
                <span className="inline-block text-[6px] text-slate-300 font-mono tracking-tighter uppercase mr-1 font-bold">МАТ:</span>
                <span className="text-[14px] font-bold text-emerald-500 tabular-nums">
                  {mTotal.toLocaleString()} 
                  <span className="text-[8px] font-normal ml-0.5 opacity-40">₽</span>
                </span>
              </div>
              <div className="leading-none">
                <span className="inline-block text-[6px] text-slate-300 font-mono tracking-tighter uppercase mr-1 font-bold">РАБ:</span>
                <span className="text-[14px] font-bold text-cyan-500 tabular-nums">
                  {lTotal.toLocaleString()} 
                  <span className="text-[8px] font-normal ml-0.5 opacity-40">₽</span>
                </span>
              </div>
           </div>
           
           {!isArchivedView && (
             <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => onQuickAction(p, 'material')} className="p-1.5 bg-slate-950 rounded text-emerald-500 border border-slate-800 active:bg-slate-800 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button onClick={() => onQuickAction(p, 'labor')} className="p-1.5 bg-slate-950 rounded text-cyan-500 border border-slate-800 active:bg-slate-800 transition-all shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  projects: initialProjects, 
  materialTotals,
  laborTotals,
  onProjectSelect, 
  onCreateProject, 
  onArchive, 
  onPermanentDelete,
  onDuplicate,
  onRename, 
  onShare,
  onQuickAction,
  viewingArchive
}) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editAddressValue, setEditAddressValue] = useState('');
  const [shareProjectModal, setShareProjectModal] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // handleMoveProject manages ordering internally within Dashboard component
  const handleMoveProject = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    const newProjects = [...projects];
    // Swap items
    [newProjects[index], newProjects[targetIndex]] = [newProjects[targetIndex], newProjects[index]];

    // Re-assign orders
    const finalized = newProjects.map((p, i) => ({ ...p, order: i }));
    setProjects(finalized);

    // Save orders to DB
    for (const p of finalized) {
      await saveProject(p);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject(name, address);
      setName('');
      setAddress('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-base font-bold coding-font text-emerald-500 uppercase tracking-tighter">
          {viewingArchive ? '_АРХИВ' : '_ПРОЕКТЫ'}
        </h2>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/30 p-3 rounded-xl space-y-2 shadow-2xl animate-in slide-in-from-top-4 duration-300 max-w-lg mx-auto w-full">
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:border-emerald-500 outline-none text-white text-sm"
            placeholder="Название"
            required
            autoFocus
          />
          <input 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 focus:border-emerald-500 outline-none text-white text-sm"
            placeholder="Адрес объекта"
          />
          <button type="submit" className="w-full bg-emerald-600 py-2.5 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-colors shadow-xl">
            СОЗДАТЬ
          </button>
        </form>
      )}

      {editingId && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
             <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl w-full max-w-sm space-y-2.5 shadow-2xl">
                <h3 className="text-xs font-bold text-emerald-500 font-mono tracking-tighter uppercase">_ПРАВКА</h3>
                <input 
                  value={editNameValue} 
                  onChange={e => setEditNameValue(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white coding-font outline-none text-xs"
                />
                <input 
                  value={editAddressValue} 
                  onChange={e => setEditAddressValue(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-[10px] coding-font outline-none"
                />
                <div className="flex gap-2 pt-1">
                    <button onClick={() => { onRename(editingId, editNameValue, editAddressValue); setEditingId(null); }} className="flex-1 bg-emerald-600 py-2.5 rounded-lg font-bold text-white uppercase text-[9px] active:bg-emerald-500">Сохранить</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-800 py-2.5 rounded-lg font-bold text-slate-400 uppercase text-[9px] active:bg-slate-700">Отмена</button>
                </div>
             </div>
          </div>
      )}

      {shareProjectModal && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-sm shadow-2xl">
              <h3 className="text-sm font-bold text-emerald-400 coding-font mb-3 uppercase tracking-tighter flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                ЭКСПОРТ
              </h3>
              <div className="space-y-1.5">
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'text'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 transition-all group"
                 >
                    <div className="p-1.5 bg-slate-900 rounded"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                    <div className="text-left font-bold text-[10px] text-white">Текст</div>
                 </button>
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'html'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-emerald-950/20 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 transition-all group"
                 >
                    <div className="p-1.5 bg-emerald-900/20 text-emerald-400 rounded"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    <div className="text-left font-bold text-[10px] text-white">HTML Отчет</div>
                 </button>
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'json'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-cyan-950/20 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 transition-all group"
                 >
                    <div className="p-1.5 bg-cyan-900/20 text-cyan-400 rounded"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></div>
                    <div className="text-left font-bold text-[10px] text-white">Файл .ais</div>
                 </button>
              </div>
              <button 
                onClick={() => setShareProjectModal(null)}
                className="w-full mt-3 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-800 rounded-lg"
              >
                Отмена
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pb-16">
        {projects.length > 0 ? projects.map((p, idx) => (
          <ProjectCard 
            key={p.id}
            p={p}
            index={idx}
            totalCount={projects.length}
            mTotal={materialTotals[p.id] || 0}
            lTotal={laborTotals[p.id] || 0}
            isArchivedView={viewingArchive}
            onSelect={onProjectSelect}
            onArchiveToggle={onArchive}
            onDelete={onPermanentDelete}
            onDuplicate={onDuplicate}
            onRenameStart={(project) => { setEditingId(project.id); setEditNameValue(project.name); setEditAddressValue(project.address); }}
            onShareClick={setShareProjectModal}
            onQuickAction={onQuickAction}
            onMove={handleMoveProject}
          />
        )) : (
          <div className="col-span-full py-12 text-center opacity-20 flex flex-col items-center gap-3 border border-dashed border-slate-800 rounded-xl">
             <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth={1}/></svg>
             <p className="font-mono text-[9px] uppercase tracking-widest font-bold">Список пуст</p>
          </div>
        )}
      </div>

      {!viewingArchive && (
        <div 
          className="fixed z-40"
          style={{ 
            bottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
            right: '0.75rem'
          }}
        >
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-xl transition-all active:scale-95 border ${isAdding ? 'bg-slate-800 border-slate-700 text-emerald-500' : 'bg-emerald-600 border-emerald-500 text-white'}`}
          >
            {isAdding ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
