import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType } from './types';
import { getProjects, saveProject, getEntriesByProject, saveEntry, getSyncQueue, removeFromSyncQueue, deleteProject, deleteEntry, generateId, getFullProjectData, initDB } from './db';
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
  const [activeTab, setActiveTab] = useState<EntryType>(EntryType.MATERIAL);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // API Key handling per environment instructions
  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        // If the playground provides no key and hasn't had one selected, show modal
        if (!hasKey && !process.env.API_KEY) {
          setNeedsApiKey(true);
        }
      } else if (!process.env.API_KEY) {
        // Fallback for standalone browser environments without injected keys
        setNeedsApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Proceed assuming success to mitigate race conditions
      setNeedsApiKey(false);
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
    if (!isOnline || isSyncing || needsApiKey) return;
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of queue) {
        let errorToRecord: string | null = null;
        let resultItems: any[] = [];

        try {
          let aiResult: any;
          if (item.type === 'PHOTO') {
            aiResult = await processImage(item.payload);
          } else {
            aiResult = await processVoice(item.payload);
          }
          resultItems = Array.isArray(aiResult) ? aiResult : (aiResult.items || []);
          if (resultItems.length === 0) errorToRecord = "ИИ не нашел позиций.";
        } catch (e: any) {
          console.error("AI sync error:", e);
          const msg = e.message || "Ошибка ИИ";
          errorToRecord = msg;
          
          // Guideline: handle "Requested entity was not found." by re-prompting key selection
          if (msg.includes("Requested entity was not found")) {
            setNeedsApiKey(true);
            setIsSyncing(false);
            return; // Stop queue processing
          }
        }

        if (errorToRecord) {
          const db = await initDB();
          const tx = db.transaction('entries', 'readwrite');
          const store = tx.objectStore('entries');
          const entry = await new Promise<Entry | undefined>((resolve) => {
            const req = store.get(item.entryId);
            req.onsuccess = () => resolve(req.result);
          });

          if (entry) {
            entry.processed = true;
            entry.error = errorToRecord;
            await new Promise((resolve) => {
              const req = store.put(entry);
              req.onsuccess = resolve;
            });
          }
        } else {
          await deleteEntry(item.entryId);
          for (const entryData of resultItems) {
            const newEntry: Entry = {
              id: generateId(),
              projectId: currentProject?.id || item.id.split('_')[0],
              date: Date.now(),
              processed: true,
              archived: false,
              name: entryData.name || 'Позиция без названия',
              type: entryData.type === 'LABOR' ? EntryType.LABOR : EntryType.MATERIAL,
              quantity: entryData.quantity || 0,
              unit: entryData.unit || 'шт',
              price: entryData.price || 0,
              total: entryData.total || ((entryData.quantity || 0) * (entryData.price || 0)) || 0,
              vendor: entryData.vendor || null,
              images: item.type === 'PHOTO' ? [item.payload] : []
            };
            await saveEntry(newEntry);
          }
        }
        await removeFromSyncQueue(item.id);
      }
    } catch (criticalErr) {
      console.error("Critical sync loop error:", criticalErr);
    } finally {
      setIsSyncing(false);
      await refreshProjects();
    }
  }, [isOnline, isSyncing, currentProject, refreshProjects, needsApiKey]);

  useEffect(() => {
    if (isOnline && !needsApiKey) {
      handleSync();
    }
  }, [isOnline, handleSync, needsApiKey]);

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
      const seenImages = new Set<string>();

      const renderItems = (items: Entry[]) => items.map(item => {
        const uniqueImages = (item.images || []).filter(img => {
            if (seenImages.has(img)) return false;
            seenImages.add(img);
            return true;
        });

        return `
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
            ${uniqueImages.length > 0 ? `
              <div style="margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
                ${uniqueImages.map(img => `<img src="data:image/jpeg;base64,${img}" style="max-width: 200px; border-radius: 8px; border: 1px solid #e2e8f0;" />`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${project.name} - Отчет</title><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #334155; line-height: 1.5; max-width: 800px; margin: 0 auto; background: #f8fafc; }.header { background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 30px; }h1 { color: #059669; margin: 0; font-size: 2em; }.address { color: #64748b; font-size: 0.9em; margin-top: 5px; }.section { background: #fff; padding: 30px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 20px; }.section-title { font-size: 1.2em; font-weight: 800; color: #059669; border-bottom: 2px solid #ecfdf5; padding-bottom: 10px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; }@media print { body { background: #fff; padding: 0; } .header, .section { box-shadow: none; border: 1px solid #eee; } }</style></head><body><div class="header"><h1>${project.name}</h1><p class="address">${project.address || 'Адрес не указан'}</p></div><div class="section"><div class="section-title">Материалы</div>${renderItems(materials)}</div><div class="section"><div class="section-title">Работы</div>${renderItems(labor)}</div></body></html>`;

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col max-w-5xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-slate-900">
      <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
      
      {needsApiKey && (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2 coding-font tracking-tighter uppercase">API KEY REQUIRED</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Для работы ИИ необходимо выбрать API ключ. Пожалуйста, используйте платный проект GCP для доступа к Gemini.
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-emerald-500 hover:underline block mt-1">Подробнее о биллинге</a>
              </p>
            </div>
            <button 
              onClick={handleSelectKey}
              className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-bold text-white uppercase text-xs tracking-[0.2em] shadow-lg shadow-emerald-950/20 transition-all active:scale-95"
            >
              ВЫБРАТЬ API КЛЮЧ
            </button>
          </div>
        </div>
      )}

      <Header 
        isDetail={!!currentProject} 
        onBack={() => { 
          setCurrentProject(null); 
          setInitialAction(null); 
          refreshProjects();
        }}
        title={currentProject ? currentProject.name : 'BuildFlow AI'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {currentProject ? (
          <ProjectDetail 
            project={currentProject} 
            isOnline={isOnline} 
            onSyncRequested={handleSync}
            initialAction={initialAction}
            activeTab={activeTab}
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