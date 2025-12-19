
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType, SyncQueueItem } from './types';
import { getProjects, saveProject, getEntriesByProject, saveEntry, getSyncQueue, removeFromSyncQueue, addToSyncQueue, deleteProject, deleteEntry, generateId, getFullProjectData } from './db';
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
      } catch (e) {
        console.error("Sync Error:", item.id, e);
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

  const exportAsHTML = (project: Project, entries: Entry[]) => {
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Смета: ${project.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; max-width: 1000px; margin: 0 auto; background-color: #fff; }
          .header { border-bottom: 3px solid #10b981; padding-bottom: 24px; margin-bottom: 40px; }
          .header h1 { margin: 0; color: #0f172a; font-size: 28px; }
          .header p { margin: 8px 0 0; color: #64748b; font-size: 14px; }
          .summary { display: flex; justify-content: space-around; background: #f8fafc; padding: 24px; border-radius: 16px; margin-bottom: 48px; border: 1px solid #e2e8f0; }
          .summary div { text-align: center; }
          .summary strong { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .summary span { font-size: 20px; font-weight: 800; color: #0f172a; }
          .section-title { font-size: 18px; font-weight: 800; border-left: 6px solid #10b981; padding-left: 14px; margin: 48px 0 24px; color: #0f172a; letter-spacing: -0.02em; }
          .item { border-bottom: 1px solid #f1f5f9; padding: 24px 0; page-break-inside: avoid; }
          .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
          .item-name { font-weight: 700; font-size: 16px; color: #1e293b; flex: 1; margin-right: 20px; }
          .item-price { font-weight: 800; font-size: 16px; color: #059669; white-space: nowrap; }
          .item-details { font-size: 13px; color: #64748b; margin-top: 4px; }
          .item-photos { display: grid; grid-template-cols: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 20px; }
          .item-photos img { width: 100%; height: auto; max-height: 400px; object-fit: contain; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .footer { margin-top: 80px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 40px; }
          @media print { 
            body { padding: 20px; }
            .summary { background: none; border: 1px solid #e2e8f0; }
            .item-photos { grid-template-cols: repeat(2, 1fr); }
            .item-photos img { max-height: 300px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${project.name}</h1>
          <p>${project.address || 'Адрес не указан'}</p>
          <small style="color: #94a3b8; font-size: 11px;">Сформировано: ${new Date().toLocaleDateString('ru')} в приложении AiСмета</small>
        </div>
        <div class="summary">
          <div><strong>МАТЕРИАЛЫ</strong> <span>${totalM.toLocaleString()} ₽</span></div>
          <div><strong>РАБОТЫ</strong> <span>${totalL.toLocaleString()} ₽</span></div>
          <div><strong>ИТОГО</strong> <span style="color: #10b981;">${(totalM + totalL).toLocaleString()} ₽</span></div>
        </div>
        ${materials.length > 0 ? `<div class="section-title">МАТЕРИАЛЫ</div>${renderItems(materials)}` : ''}
        ${labor.length > 0 ? `<div class="section-title">РАБОТЫ</div>${renderItems(labor)}` : ''}
        <div class="footer">AiСмета - Автономное управление строительством • ai-smeta.ru</div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Smeta_${project.name}_${new Date().toISOString().slice(0,10)}.html`;
    a.click();
  };

  const handleProjectShare = async (project: Project, format: 'text' | 'html' | 'json') => {
    const { entries } = await getFullProjectData(project.id);
    
    if (format === 'html') {
      exportAsHTML(project, entries);
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

    const materials = entries.filter(e => e.type === EntryType.MATERIAL);
    const labor = entries.filter(e => e.type === EntryType.LABOR);
    const totalM = materials.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalL = labor.reduce((sum, e) => sum + (e.total || 0), 0);

    let report = `ОТЧЕТ: ${project.name.toUpperCase()}\nАДРЕС: ${project.address}\n\n`;
    if (materials.length > 0) {
      report += `[МАТЕРИАЛЫ: ${totalM}₽]\n` + materials.map(m => `• ${m.name}: ${m.total}₽`).join('\n') + '\n\n';
    }
    if (labor.length > 0) {
      report += `[РАБОТЫ: ${totalL}₽]\n` + labor.map(l => `• ${l.name}: ${l.total}₽`).join('\n') + '\n\n';
    }
    report += `ОБЩАЯ СУММА: ${totalM + totalL}₽\nAiСмета`;

    if (navigator.share) {
      try {
        await navigator.share({ title: project.name, text: report });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(report);
      alert("Отчет скопирован");
    }
  };

  const handleImportProject = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.project || !data.entries) throw new Error("Invalid format");

      const newProjectId = generateId();
      const newProject: Project = {
        ...data.project,
        id: newProjectId,
        name: `${data.project.name} (Импорт)`,
        createdAt: Date.now(),
        archived: false
      };

      await saveProject(newProject);
      for (const entry of data.entries) {
        await saveEntry({
          ...entry,
          id: generateId(),
          projectId: newProjectId
        });
      }

      await refreshProjects();
      alert("Проект успешно импортирован");
    } catch (err) {
      alert("Ошибка при импорте файла");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-950 shadow-2xl overflow-hidden relative">
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { setCurrentProject(null); setInitialAction(null); }} 
        title={currentProject?.name || 'Aiсмета'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImportProject}
      />
      
      <main className="flex-1 overflow-y-auto pb-20 p-4">
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
