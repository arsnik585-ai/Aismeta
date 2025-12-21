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
    if (!isOnline || isSyncing) return;
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);

    try {
      for (const item of queue) {
        let aiResult: any[] = [];
        let errorMsg: string | null = null;

        try {
          const result = item.type === 'PHOTO' 
            ? await processImage(item.payload) 
            : await processVoice(item.payload);
          
          aiResult = Array.isArray(result) ? result : [];
          if (aiResult.length === 0) errorMsg = "Позиции не найдены";
        } catch (e: any) {
          console.error("[SYNC_ERROR]", e);
          errorMsg = e.message || "Ошибка ИИ";
        }

        const db = await initDB();
        const tx = db.transaction(['entries'], 'readwrite');
        const store = tx.objectStore('entries');

        if (errorMsg) {
          const entry = await new Promise<Entry | undefined>((resolve) => {
            const req = store.get(item.entryId);
            req.onsuccess = () => resolve(req.result);
          });
          if (entry) {
            entry.processed = true;
            entry.error = errorMsg;
            await new Promise((resolve) => {
              const req = store.put(entry);
              req.onsuccess = resolve;
            });
          }
        } else {
          await new Promise((resolve) => {
            const req = store.delete(item.entryId);
            req.onsuccess = resolve;
          });

          for (const data of aiResult) {
            const newEntry: Entry = {
              id: generateId(),
              projectId: currentProject?.id || item.id.split('_')[0],
              date: Date.now(),
              processed: true,
              archived: false,
              name: data.name || 'Без названия',
              type: data.type === 'LABOR' ? EntryType.LABOR : EntryType.MATERIAL,
              quantity: data.quantity || 0,
              unit: data.unit || 'шт',
              price: data.price || 0,
              total: data.total || ((data.quantity || 0) * (data.price || 0)) || 0,
              vendor: data.vendor || null,
              images: item.type === 'PHOTO' ? [item.payload] : []
            };
            await new Promise((resolve) => {
              const req = store.put(newEntry);
              req.onsuccess = resolve;
            });
          }
        }
        await removeFromSyncQueue(item.id);
      }
    } catch (err) {
      console.error("[CRITICAL_SYNC_ERROR]", err);
    } finally {
      setIsSyncing(false);
      await refreshProjects();
    }
  }, [isOnline, isSyncing, currentProject, refreshProjects]);

  useEffect(() => {
    if (isOnline) handleSync();
  }, [isOnline, handleSync]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col max-w-5xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-slate-900">
      <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
      
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
        onImport={(file) => {}} 
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
            onCreateProject={async (n, a) => {
                const newProject: Project = { id: generateId(), name: n, address: a, createdAt: Date.now(), archived: false };
                await saveProject(newProject);
                await refreshProjects();
                setCurrentProject(newProject);
            }}
            onArchive={async (id) => {
                const p = projects.find(item => item.id === id);
                if (p) {
                    await saveProject({ ...p, archived: !p.archived });
                    await refreshProjects();
                }
            }}
            onPermanentDelete={async (id) => {
                if (window.confirm("Удалить проект?")) {
                    await deleteProject(id);
                    await refreshProjects();
                }
            }}
            onDuplicate={async (p) => {
                const newId = generateId();
                await saveProject({ ...p, id: newId, name: `${p.name} (Копия)`, createdAt: Date.now() });
                await refreshProjects();
            }}
            onRename={async (id, n, a) => {
                const p = projects.find(item => item.id === id);
                if (p) {
                    await saveProject({ ...p, name: n, address: a });
                    await refreshProjects();
                }
            }}
            onShare={(p, f) => {}}
            onQuickAction={(p, a) => {
                setCurrentProject(p);
                setInitialAction(a);
            }}
            viewingArchive={viewingArchive}
          />
        )}
      </main>
    </div>
  );
};

export default App;