
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType, SyncQueueItem } from './types';
import { getProjects, saveProject, getEntriesByProject, saveEntry, getSyncQueue, removeFromSyncQueue, addToSyncQueue, deleteProject, deleteEntry, generateId, getFullProjectData, initDB } from './db';
import { processImage, processVoice } from './geminiService';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Header from './components/Header';
import SyncStatus from './components/SyncStatus';

const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materialTotals, setMaterialTotals] = useState<Record<string, number>>({});
  const [laborTotals, setLaborTotals] = useState<Record<string, number>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewingArchive, setViewingArchive] = useState(false);
  const [apiKeyReady, setApiKeyReady] = useState(false);

  // Безопасное получение ключа из окружения
  const getEnvApiKey = () => {
    try {
      // Пытаемся достать из window.process или напрямую из process.env
      return (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : null);
    } catch {
      return null;
    }
  };

  // Проверка наличия ключа при загрузке
  useEffect(() => {
    const checkKey = async () => {
      // Если ключ уже есть в окружении (например, локально), считаем, что готовы
      if (getEnvApiKey()) {
        setApiKeyReady(true);
        return;
      }
      
      // Проверяем наличие методов AI Studio
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        try {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (hasKey) {
            setApiKeyReady(true);
          }
        } catch (e) {
          console.debug("Check key failed:", e);
        }
      }
    };

    checkKey();
    // Повторяем проверку через секунду на случай, если скрипты окружения подгружаются позже
    const t = setTimeout(checkKey, 1000);
    return () => clearTimeout(t);
  }, []);

  const handleOpenKeySelector = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // Согласно правилам, предполагаем успех сразу после вызова и продолжаем в приложение
        setApiKeyReady(true);
      } catch (e) {
        console.error("Open key selector failed:", e);
        // Если вызов не удался, но мы видим ключ в окружении — пускаем
        if (getEnvApiKey()) setApiKeyReady(true);
      }
    } else {
      // Если мы не в среде AI Studio, просто пропускаем экран активации
      console.warn("window.aistudio.openSelectKey не обнаружен. Пропускаем...");
      setApiKeyReady(true);
    }
  };

  const refreshProjects = useCallback(async () => {
    try {
      const p = await getProjects(viewingArchive);
      const mTotals: Record<string, number> = {};
      const lTotals: Record<string, number> = {};
      
      for (const project of p) {
        const entries = await getEntriesByProject(project.id, false);
        mTotals[project.id] = entries
          .filter(e => e.type === EntryType.MATERIAL)
          .reduce((sum, e) => sum + (e.total || 0), 0);
        lTotals[project.id] = entries
          .filter(e => e.type === EntryType.LABOR)
          .reduce((sum, e) => sum + (e.total || 0), 0);
      }
      
      setMaterialTotals(mTotals);
      setLaborTotals(lTotals);
      setProjects(p);
    } catch (err) {
      console.error("Refresh Projects Error:", err);
    }
  }, [viewingArchive]);

  useEffect(() => {
    refreshProjects();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshProjects]);

  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing || !apiKeyReady) return;
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    for (const item of queue) {
      try {
        let items: any[] = [];
        if (item.type === 'PHOTO') {
          items = await processImage(item.payload);
        } else {
          items = await processVoice(item.payload);
        }

        await deleteEntry(item.entryId);
        
        for (const entryData of items) {
          const newEntry: Entry = {
            id: generateId(),
            projectId: currentProject?.id || item.id.split('_')[0],
            date: Date.now(),
            processed: true,
            archived: false,
            ...entryData,
            images: item.type === 'PHOTO' ? [item.payload] : []
          };
          await saveEntry(newEntry);
        }

        await removeFromSyncQueue(item.id);
      } catch (e: any) {
        console.error("Sync Error:", item.id, e);
        if (e.message?.includes("Requested entity was not found")) {
          setApiKeyReady(false);
        }
        
        const db = await initDB();
        const tx = db.transaction('entries', 'readwrite');
        const store = tx.objectStore('entries');
        const req = store.get(item.entryId);
        req.onsuccess = () => {
          const entry = req.result;
          if (entry) {
            entry.processed = true;
            entry.error = e.message || "Ошибка ИИ";
            store.put(entry);
          }
        };
        await removeFromSyncQueue(item.id);
      }
    }
    setIsSyncing(false);
    await refreshProjects();
  }, [isOnline, isSyncing, currentProject, refreshProjects, apiKeyReady]);

  useEffect(() => {
    if (isOnline && apiKeyReady) {
      handleSync();
    }
  }, [isOnline, handleSync, apiKeyReady]);

  const createNewProject = async (name: string, address: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      address,
      createdAt: Date.now(),
      archived: false
    };
    await saveProject(newProject);
    await refreshProjects();
    setCurrentProject(newProject);
  };

  const handleProjectArchive = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    await saveProject({ ...project, archived: !project.archived });
    await refreshProjects();
  };

  const handleProjectPermanentDelete = async (id: string) => {
    await deleteProject(id);
    await refreshProjects();
    if (currentProject?.id === id) setCurrentProject(null);
  };

  const handleProjectQuickAction = (project: Project, action: string) => {
    setCurrentProject(project);
    setInitialAction(action);
  };

  const handleProjectRename = async (id: string, newName: string, newAddress: string) => {
    const p = projects.find(item => item.id === id);
    if (p) {
      await saveProject({ ...p, name: newName, address: newAddress });
      await refreshProjects();
    }
  };

  const handleProjectDuplicate = async (project: Project) => {
    const newId = generateId();
    await saveProject({
      ...project,
      id: newId,
      name: `${project.name} (Копия)`,
      createdAt: Date.now(),
      archived: false
    });
    const entries = await getEntriesByProject(project.id, false);
    for (const entry of entries) {
      await saveEntry({ ...entry, id: generateId(), projectId: newId, archived: false });
    }
    await refreshProjects();
  };

  const handleProjectShare = async (project: Project, format: 'text' | 'html' | 'json') => {
    const { entries } = await getFullProjectData(project.id);
    
    if (format === 'html') {
      const materials = entries.filter(e => e.type === EntryType.MATERIAL);
      const labor = entries.filter(e => e.type === EntryType.LABOR);

      const renderItems = (items: Entry[]) => items.map(item => `
        <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-weight: bold; font-size: 1.1em; color: #1e293b;">${item.name || 'Без названия'}</div>
              <div style="font-size: 0.85em; color: #64748b; margin-top: 4px;">
                ${item.quantity || 0} ${item.unit || ''} × ${item.price || 0} ₽ | ${item.vendor || 'Без поставщика'}
              </div>
            </div>
            <div style="font-weight: bold; font-size: 1.1em; color: #059669;">${(item.total || 0).toLocaleString()} ₽</div>
          </div>
          ${item.images && item.images.length > 0 ? `
            <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
              ${item.images.map(img => `<img src="data:image/jpeg;base64,${img}" style="max-width: 200px; border-radius: 8px; border: 1px solid #e2e8f0;" />`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');

      const htmlContent = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${project.name} - Отчет</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #334155; line-height: 1.5; max-width: 800px; margin: 0 auto; background: #f8fafc; }
            .header { background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 30px; }
            h1 { color: #059669; margin: 0; font-size: 2em; }
            .address { color: #64748b; font-size: 0.9em; margin-top: 5px; }
            .section { background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 20px; }
            .section-title { font-size: 1.2em; font-weight: 800; color: #059669; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
            @media print { body { background: #fff; padding: 0; } .header, .section { box-shadow: none; border: 1px solid #eee; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${project.name}</h1>
            <p class="address">${project.address || 'Адрес не указан'}</p>
          </div>
          <div class="section">
            <div class="section-title">Материалы</div>
            ${renderItems(materials)}
          </div>
          <div class="section">
            <div class="section-title">Работы</div>
            ${renderItems(labor)}
          </div>
        </body>
      </html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_отчет.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'text') {
      const materials = entries.filter(e => e.type === EntryType.MATERIAL);
      const labor = entries.filter(e => e.type === EntryType.LABOR);
      
      let text = `ПРОЕКТ: ${project.name}\nАДРЕС: ${project.address || 'не указан'}\n\n`;
      text += `МАТЕРИАЛЫ:\n`;
      materials.forEach(e => {
        text += `- ${e.name}: ${e.quantity || 0} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });
      text += `\nРАБОТЫ:\n`;
      labor.forEach(e => {
        text += `- ${e.name}: ${e.quantity || 0} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });

      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_смета.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const data = JSON.stringify({ project, entries }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.ais`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.project && Array.isArray(data.entries)) {
        const newProject = { ...data.project, id: generateId(), createdAt: Date.now(), archived: false };
        await saveProject(newProject);
        for (const entry of data.entries) {
          await saveEntry({ ...entry, id: generateId(), projectId: newProject.id, archived: false });
        }
        await refreshProjects();
      }
    } catch (e) {
      console.error("Import failed:", e);
      alert("Ошибка импорта файла: некорректный формат .ais");
    }
  };

  // Экран активации ключа
  if (!apiKeyReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)]">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4 coding-font uppercase tracking-tighter">AI СМЕТА</h1>
        <p className="text-slate-400 max-w-xs mb-10 leading-relaxed text-sm">
          Для работы искусственного интеллекта (распознавание чеков и голоса) необходимо выбрать оплаченный API ключ в AI Studio.
        </p>
        <button 
          onClick={handleOpenKeySelector}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 px-10 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 uppercase text-xs tracking-[0.2em] active:scale-95 border border-emerald-400/50"
        >
          ВЫБРАТЬ API КЛЮЧ
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-10 text-[10px] text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors"
        >
          Инструкция по биллингу →
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col max-w-5xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-slate-900">
      <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
      
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { setCurrentProject(null); setInitialAction(null); }}
        title={currentProject ? currentProject.name : 'AI СМЕТА'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImport}
      />

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {currentProject ? (
          <ProjectDetail 
            project={currentProject} 
            isOnline={isOnline} 
            onSyncRequested={handleSync}
            initialAction={initialAction}
          />
        ) : (
          <Dashboard 
            projects={projects}
            materialTotals={materialTotals}
            laborTotals={laborTotals}
            onProjectSelect={setCurrentProject}
            onCreateProject={createNewProject}
            onArchive={handleProjectArchive}
            onPermanentDelete={handleProjectPermanentDelete}
            onDuplicate={handleProjectDuplicate}
            onRename={handleProjectRename}
            onShare={handleProjectShare}
            onQuickAction={handleProjectQuickAction}
            viewingArchive={viewingArchive}
          />
        )}
      </main>
    </div>
  );
};

export default App;
