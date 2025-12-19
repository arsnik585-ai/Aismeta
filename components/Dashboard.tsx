
import React, { useState, useRef } from 'react';
import { Project } from '../types';

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
  mTotal: number;
  lTotal: number;
  onSelect: (p: Project) => void;
  onArchiveToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRenameStart: (p: Project) => void;
  onShareClick: (p: Project) => void;
  onDuplicate: (p: Project) => void;
  onQuickAction: (p: Project, action: string) => void;
  isArchivedView: boolean;
}> = ({ p, mTotal, lTotal, onSelect, onArchiveToggle, onDelete, onRenameStart, onShareClick, onDuplicate, onQuickAction, isArchivedView }) => {
  const [translateX, setTranslateX] = useState(0);
  const touchStart = useRef<number>(0);
  const isMoving = useRef<boolean>(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
    isMoving.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const diff = e.targetTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 10) isMoving.current = true;
    if (diff < 0) {
      setTranslateX(Math.max(diff, -180));
    } else {
      setTranslateX(0);
    }
  };

  const onTouchEnd = () => {
    if (translateX < -60) {
      setTranslateX(isArchivedView ? -170 : -100);
    } else {
      setTranslateX(0);
    }
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveToggle(p.id);
    setTranslateX(0);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveToggle(p.id);
    setTranslateX(0);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Удалить проект навсегда? Все данные будут потеряны.")) {
        onDelete(p.id);
    }
    setTranslateX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 mb-4">
      <div className="absolute inset-0 flex items-center justify-end px-4 gap-2">
        {isArchivedView ? (
          <>
            <button 
              onClick={handleRestore} 
              className="bg-emerald-600 text-white h-[80%] px-4 rounded-xl text-[9px] font-bold uppercase shadow-lg flex flex-col items-center justify-center gap-1 active:bg-emerald-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              ВЕРНУТЬ
            </button>
            <button 
              onClick={handleDelete} 
              className="bg-red-600 text-white h-[80%] px-4 rounded-xl text-[9px] font-bold uppercase shadow-lg flex flex-col items-center justify-center gap-1 active:bg-red-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              УДАЛИТЬ
            </button>
          </>
        ) : (
          <button 
            onClick={handleArchive} 
            className="bg-amber-600 text-white h-[80%] px-6 rounded-xl text-[9px] font-bold uppercase shadow-lg flex flex-col items-center justify-center gap-1 active:bg-amber-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            В АРХИВ
          </button>
        )}
      </div>

      <div 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => !isMoving.current && translateX === 0 && onSelect(p)}
        style={{ transform: `translateX(${translateX}px)` }}
        className={`bg-slate-900 border border-slate-800 p-5 rounded-[2rem] transition-transform duration-200 ease-out cursor-pointer relative z-10 shadow-xl active:bg-slate-800 ${isArchivedView ? 'opacity-70 grayscale-[0.3]' : ''}`}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 border border-emerald-900/50 px-3 py-1 rounded-full">
            {new Date(p.createdAt).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
            <button 
              onClick={(e) => { e.stopPropagation(); onShareClick(p); }}
              className="p-2.5 text-emerald-400 bg-emerald-950 border border-emerald-900/50 rounded-xl transition-colors active:bg-emerald-900"
              title="Экспорт / Поделиться"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDuplicate(p); }}
              className="p-2.5 text-cyan-400 bg-cyan-950 border border-cyan-900/50 rounded-xl transition-colors active:bg-cyan-900"
              title="Дублировать"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRenameStart(p); }}
              className="p-2.5 text-slate-400 bg-slate-800 rounded-xl transition-colors"
              title="Редактировать название"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2}/></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onArchiveToggle(p.id); }}
              className="p-2.5 text-amber-500 bg-amber-950 border border-amber-900/50 rounded-xl transition-colors active:bg-amber-900"
              title="В архив"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-2xl font-bold text-white truncate coding-font tracking-tight">{p.name}</h3>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth={2}/></svg>
            {p.address || 'ЛОКАЦИЯ НЕ УКАЗАНА'}
          </p>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-800">
           <div className="text-left flex flex-col gap-1.5">
              <div>
                <span className="block text-[8px] text-slate-500 font-mono tracking-tighter uppercase leading-none mb-0.5">_МАТЕРИАЛЫ_</span>
                <span className="text-lg font-bold text-emerald-500 coding-font tabular-nums leading-none">
                  {mTotal.toLocaleString()} 
                  <span className="text-[10px] font-normal ml-0.5 opacity-40">₽</span>
                </span>
              </div>
              <div>
                <span className="block text-[8px] text-slate-500 font-mono tracking-tighter uppercase leading-none mb-0.5">_РАБОТЫ_</span>
                <span className="text-lg font-bold text-cyan-500 coding-font tabular-nums leading-none">
                  {lTotal.toLocaleString()} 
                  <span className="text-[10px] font-normal ml-0.5 opacity-40">₽</span>
                </span>
              </div>
           </div>
           
           <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => onQuickAction(p, 'material')} className="p-2.5 bg-slate-950 rounded-xl text-emerald-500 border border-slate-800 active:bg-slate-800 transition-all shadow-md" title="Добавить материал">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button onClick={() => onQuickAction(p, 'labor')} className="p-2.5 bg-slate-950 rounded-xl text-cyan-500 border border-slate-800 active:bg-slate-800 transition-all shadow-md" title="Добавить работу">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
              </button>
              <button onClick={() => onQuickAction(p, 'photo')} className="p-2.5 bg-slate-950 rounded-xl text-cyan-400 border border-slate-800 active:bg-slate-800 transition-all shadow-md" title="Камера">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" strokeWidth={2} />
                </svg>
              </button>
              <button onClick={() => onQuickAction(p, 'voice')} className="p-2.5 bg-slate-950 rounded-xl text-emerald-400 border border-slate-800 active:bg-slate-800 transition-all shadow-md" title="Голос">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeWidth={2}/>
                </svg>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
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
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editAddressValue, setEditAddressValue] = useState('');
  const [shareProjectModal, setShareProjectModal] = useState<Project | null>(null);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold coding-font text-emerald-500 uppercase tracking-tighter">
          {viewingArchive ? '_АРХИВ' : '_ПРОЕКТЫ'}
        </h2>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl space-y-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 focus:border-emerald-500 outline-none text-white text-sm"
            placeholder="Название"
            required
            autoFocus
          />
          <input 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 focus:border-emerald-500 outline-none text-white text-sm"
            placeholder="Адрес объекта"
          />
          <button type="submit" className="w-full bg-emerald-600 py-4 rounded-xl font-bold uppercase text-sm tracking-widest hover:bg-emerald-500 transition-colors shadow-xl shadow-emerald-950/20">
            СОЗДАТЬ ОБЪЕКТ
          </button>
        </form>
      )}

      {editingId && (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
             <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] w-full max-sm:max-w-xs max-w-sm space-y-4 shadow-2xl">
                <h3 className="text-lg font-bold text-emerald-500 font-mono tracking-tighter">_РЕДАКТОР</h3>
                <input 
                  value={editNameValue} 
                  onChange={e => setEditNameValue(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white coding-font outline-none"
                />
                <input 
                  value={editAddressValue} 
                  onChange={e => setEditAddressValue(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs coding-font outline-none"
                />
                <div className="flex gap-3 pt-2">
                    <button onClick={() => { onRename(editingId, editNameValue, editAddressValue); setEditingId(null); }} className="flex-1 bg-emerald-600 py-4 rounded-xl font-bold text-white uppercase text-xs active:bg-emerald-500">Сохранить</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-800 py-4 rounded-xl font-bold text-slate-400 uppercase text-xs active:bg-slate-700">Отмена</button>
                </div>
             </div>
          </div>
      )}

      {shareProjectModal && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
           <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] w-full max-w-sm shadow-[0_0_80px_rgba(16,185,129,0.1)]">
              <h3 className="text-xl font-bold text-emerald-400 coding-font mb-6 uppercase tracking-tighter flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                ЭКСПОРТ ПРОЕКТА
              </h3>
              <div className="space-y-4">
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'text'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-95 group"
                 >
                    <div className="p-3 bg-slate-900 rounded-xl group-hover:text-emerald-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">Текстовый отчет</div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Быстрый список без фото</div>
                    </div>
                 </button>
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'html'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-emerald-950/20 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-95 group"
                 >
                    <div className="p-3 bg-emerald-900/20 text-emerald-400 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">HTML отчет (с фото)</div>
                      <div className="text-[10px] text-emerald-500 uppercase font-mono tracking-widest">Просмотр и печать в PDF</div>
                    </div>
                 </button>
                 <button 
                  onClick={() => { onShare(shareProjectModal, 'json'); setShareProjectModal(null); }}
                  className="w-full bg-slate-950 hover:bg-cyan-950/20 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-95 group"
                 >
                    <div className="p-3 bg-cyan-900/20 text-cyan-400 rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">Перенос проекта (.ais)</div>
                      <div className="text-[10px] text-cyan-400 uppercase font-mono tracking-widest">Для загрузки в Aiсмета</div>
                    </div>
                 </button>
              </div>
              <button 
                onClick={() => setShareProjectModal(null)}
                className="w-full mt-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border border-slate-800 rounded-xl active:bg-slate-800 transition-colors"
              >
                Отмена
              </button>
           </div>
        </div>
      )}

      <div className="flex flex-col gap-1 pb-24">
        {projects.length > 0 ? projects.map(p => (
          <ProjectCard 
            key={p.id}
            p={p}
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
          />
        )) : (
          <div className="py-24 text-center opacity-20 flex flex-col items-center gap-6 border-2 border-dashed border-slate-800 rounded-[3rem]">
             <svg className="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth={1}/></svg>
             <p className="font-mono text-xs uppercase tracking-[0.3em] font-bold">Список объектов пуст</p>
          </div>
        )}
      </div>

      {!viewingArchive && (
        <div className="fixed bottom-6 right-6 z-40">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all active:scale-95 border ${isAdding ? 'bg-slate-800 border-slate-700 text-emerald-500' : 'bg-emerald-600 border-emerald-500 text-white'}`}
          >
            {isAdding ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
