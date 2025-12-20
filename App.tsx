
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
    for (const item of queue) {
      try {
        let items: any[] = [];
        if (item.type === 'PHOTO') {
          items = await processImage(item.payload);
        } else {
          items = await processVoice(item.payload);
        }

        // Удаляем временную заглушку
        await deleteEntry(item.entryId);
        
        // Добавляем реально распознанные элементы
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
        // Если ошибка — обновляем запись в БД, чтобы пользователь видел статус
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
        // Удаляем из очереди, чтобы не пытаться бесконечно
        await removeFromSyncQueue(item.id);
      }
    }
    setIsSyncing(false);
    await refreshProjects();
  }, [isOnline, isSyncing, currentProject, refreshProjects]);

  useEffect(() => {
    if (isOnline) {
      handleSync();
    }
  }, [isOnline, handleSync]);

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
      const totalM = materials.reduce((sum, e) => sum + (e.total || 0), 0);
      const totalL = labor.reduce((sum, e) => sum + (e.total || 0), 0);

      const renderItems = (items: Entry[]) => items.map(item => `
        <div class="item">
          <div class="item-header">
            <div class="item-name">${item.name || 'Без названия'}</div>
            <div class="item-price">${(item.total || 0).toLocaleString()} ₽</div>
          </div>
          <div class="item-details">
            ${item.quantity || 0} ${item.unit || ''} × ${item.price || 0} ₽ | ${item.vendor || 'Без поставщика'}
          </div>
          ${item.images && item.images.length > 0 ? `
            <div class="item-photos">
              ${item.images.map(img => `<img src="data:image/jpeg;base64,${img}" />`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Смета: ${project.name}</title><style>body { font-family: sans-serif; padding: 40px; color: #1e293b; max-width: 1000px; margin: 0 auto; }.header { border-bottom: 3px solid #10b981; padding-bottom: 20px; }.summary { display: flex; justify-content: space-around; background: #f8fafc; padding: 20px; border-radius: 16px; margin: 30px 0; }.item { border-bottom: 1px solid #f1f5f9; padding: 20px 0; }.item-photos img { max-width: 200px; border-radius: 8px; margin-right: 10px; }</style></head><body><div class="header"><h1>${project.name}</h1><p>${project.address}</p></div><div class="summary"><div><strong>МАТЕРИАЛЫ</strong><br>${totalM.toLocaleString()} ₽</div><div><strong>РАБОТЫ</strong><br>${totalL.toLocaleString()} ₽</div></div>${renderItems(entries)}</body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Smeta_${project.name}.html`;
      a.click();
      return;
    }

    if (format === 'json') {
      const data = JSON.stringify({ project, entries }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.ais`;
      a.click();
      return;
    }

    const report = `ОТЧЕТ: ${project.name}\n${project.address}\n\nСумма: ${entries.reduce((s, e) => s + (e.total || 0), 0)}₽`;
    if (navigator.share) {
      await navigator.share({ title: project.name, text: report });
    } else {
      await navigator.clipboard.writeText(report);
      alert("Отчет скопирован");
    }
  };

  const handleImportProject = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const newProjectId = generateId();
      await saveProject({ ...data.project, id: newProjectId, archived: false });
      for (const entry of data.entries) {
        await saveEntry({ ...entry, id: generateId(), projectId: newProjectId });
      }
      await refreshProjects();
      alert("Импорт завершен");
    } catch (err) {
      alert("Ошибка импорта");
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-screen-2xl mx-auto bg-slate-950 shadow-2xl overflow-hidden relative border-x border-slate-900">
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { setCurrentProject(null); setInitialAction(null); }} 
        title={currentProject?.name || 'Aiсмета'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImportProject}
      />
      
      <main className="flex-1 overflow-y-auto pb-20 p-4 md:p-6 lg:p-8">
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

      <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
    </div>
  );
};

export default App;
