
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType } from './types';
import { getProjects, saveProject, getEntriesByProject, deleteProject, generateId, getFullProjectData, saveEntry } from './db';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Header from './components/Header';

interface ExportPreview {
  format: 'text' | 'html' | 'json';
  content: string;
  project: Project;
  blob: Blob;
  fileName: string;
}

const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materialTotals, setMaterialTotals] = useState<Record<string, number>>({});
  const [laborTotals, setLaborTotals] = useState<Record<string, number>>({});
  const [viewingArchive, setViewingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<EntryType>(EntryType.MATERIAL);
  
  const [exportPreview, setExportPreview] = useState<ExportPreview | null>(null);

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
  }, [refreshProjects]);

  const handlePrepareExport = async (project: Project, format: 'text' | 'html' | 'json') => {
    const data = await getFullProjectData(project.id);
    const dateStr = new Date().toLocaleDateString('ru-RU');
    
    let blob: Blob;
    let fileName: string;
    let previewContent: string = "";

    if (format === 'json') {
      previewContent = JSON.stringify(data, null, 2);
      blob = new Blob([previewContent], { type: 'application/json' });
      fileName = `${project.name}.ais`;
    } else if (format === 'text') {
      let text = `ОТЧЕТ: ${project.name}\nАДРЕС: ${project.address}\nДАТА: ${dateStr}\n\n`;
      text += `МАТЕРИАЛЫ:\n`;
      data.entries.filter(e => e.type === EntryType.MATERIAL).forEach(e => {
        text += `- ${e.name}: ${e.quantity || 0} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });
      text += `\nРАБОТЫ:\n`;
      data.entries.filter(e => e.type === EntryType.LABOR).forEach(e => {
        text += `- ${e.name}: ${e.quantity || 0} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });
      previewContent = text;
      blob = new Blob([text], { type: 'text/plain' });
      fileName = `${project.name}_отчет.txt`;
    } else {
      const mTotal = data.entries.filter(e => e.type === EntryType.MATERIAL).reduce((s, e) => s + (e.total || 0), 0);
      const lTotal = data.entries.filter(e => e.type === EntryType.LABOR).reduce((s, e) => s + (e.total || 0), 0);

      const renderSection = (title: string, entries: Entry[]) => `
        <div class="section">
          <h2>${title}</h2>
          <table>
            <thead>
              <tr>
                <th>Наименование</th>
                <th style="width: 70px;">Кол-во</th>
                <th style="width: 90px;">Цена</th>
                <th style="width: 100px;">Итого</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>
                    <div class="entry-name">${e.name || 'Без названия'}</div>
                    ${e.images && e.images.length > 0 ? `
                      <div class="photo-grid">
                        ${e.images.map(img => `<img src="data:image/jpeg;base64,${img}" />`).join('')}
                      </div>
                    ` : ''}
                  </td>
                  <td class="center">${e.quantity || 0} ${e.unit || ''}</td>
                  <td class="nowrap">${(e.price || 0).toLocaleString()} ₽</td>
                  <td class="nowrap bold text-emerald">${(e.total || 0).toLocaleString()} ₽</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 15px; background: #fff; margin: 0; font-size: 13px; }
            .report-container { max-width: 800px; margin: 0 auto; }
            header { border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            h1 { font-size: 1.5em; margin: 0; color: #0f172a; }
            .meta { margin-top: 5px; color: #64748b; font-size: 0.85em; }
            .totals { display: flex; gap: 10px; margin-bottom: 25px; }
            .total-item { flex: 1; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .total-item span { display: block; font-size: 0.65em; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
            .total-item strong { font-size: 1.2em; color: #0f172a; }
            .section { margin-bottom: 30px; }
            h2 { font-size: 1em; font-weight: 700; color: #475569; margin-bottom: 10px; border-left: 3px solid #10b981; padding-left: 8px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #f1f5f9; padding: 8px; font-size: 0.7em; text-transform: uppercase; color: #64748b; }
            td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .entry-name { font-weight: 600; font-size: 1.05em; color: #0f172a; }
            .photo-grid { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
            .photo-grid img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; }
            .nowrap { white-space: nowrap; }
            .bold { font-weight: 700; }
            .text-emerald { color: #059669; }
            .center { text-align: center; }
            @media print { body { padding: 0; } .report-container { max-width: none; } }
          </style>
        </head>
        <body>
          <div class="report-container">
            <header>
              <h1>${project.name}</h1>
              <div class="meta">📍 ${project.address || 'Адрес не указан'} • 📅 ${dateStr}</div>
            </header>
            <div class="totals">
              <div class="total-item"><span>Мат</span><strong>${mTotal.toLocaleString()} ₽</strong></div>
              <div class="total-item"><span>Раб</span><strong>${lTotal.toLocaleString()} ₽</strong></div>
              <div class="total-item" style="border-color:#10b981"><span>Итого</span><strong>${(mTotal + lTotal).toLocaleString()} ₽</strong></div>
            </div>
            ${renderSection('МАТЕРИАЛЫ', data.entries.filter(e => e.type === EntryType.MATERIAL))}
            ${renderSection('РАБОТЫ', data.entries.filter(e => e.type === EntryType.LABOR))}
          </div>
        </body>
        </html>
      `;
      previewContent = htmlContent;
      blob = new Blob([htmlContent], { type: 'text/html' });
      fileName = `${project.name}_смета.html`;
    }

    setExportPreview({ format, content: previewContent, project, blob, fileName });
  };

  const handleExecuteExport = async () => {
    if (!exportPreview) return;
    const { blob, fileName, project } = exportPreview;
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
      try {
        await navigator.share({
          files: [new File([blob], fileName, { type: blob.type })],
          title: `Смета: ${project.name}`
        });
        setExportPreview(null);
        return;
      } catch (err) { if ((err as Error).name !== 'AbortError') console.error('Share failed:', err); }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportPreview(null);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (!data.project || !Array.isArray(data.entries)) throw new Error("Format error");
        const newProjectId = generateId();
        await saveProject({ ...data.project, id: newProjectId, archived: false, createdAt: Date.now() });
        for (const entry of data.entries) {
          await saveEntry({ ...entry, id: generateId(), projectId: newProjectId, archived: false });
        }
        await refreshProjects();
        alert("Импортировано");
      } catch (err) { alert("Ошибка импорта"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col max-w-5xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-slate-900">
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { setCurrentProject(null); setInitialAction(null); refreshProjects(); }}
        title={currentProject ? currentProject.name : 'smeta'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImport} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 p-3 md:p-6 overflow-y-auto no-scrollbar">
        {currentProject ? (
          <ProjectDetail 
            project={currentProject} 
            initialAction={initialAction}
            activeTab={activeTab}
            onDataChange={refreshProjects}
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
                if (p) { await saveProject({ ...p, archived: !p.archived }); await refreshProjects(); }
            }}
            onPermanentDelete={async (id) => {
                if (window.confirm("Удалить проект?")) { await deleteProject(id); await refreshProjects(); }
            }}
            onDuplicate={async (p) => {
                const newId = generateId();
                await saveProject({ ...p, id: newId, name: `${p.name} (Копия)`, createdAt: Date.now() });
                await refreshProjects();
            }}
            onRename={async (id, n, a) => {
                const p = projects.find(item => item.id === id);
                if (p) { await saveProject({ ...p, name: n, address: a }); await refreshProjects(); }
            }}
            onShare={handlePrepareExport}
            onQuickAction={(p, a) => { setCurrentProject(p); setInitialAction(a); }}
            viewingArchive={viewingArchive}
          />
        )}
      </main>
      {exportPreview && (
        <div className="fixed inset-0 bg-slate-950/98 z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[90vh] rounded-[2rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
              <h3 className="text-sm font-bold text-emerald-400 coding-font uppercase">ПРЕДПРОСМОТР_ОТЧЕТА</h3>
              <button onClick={() => setExportPreview(null)} className="p-2 text-slate-500 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-2">
              {exportPreview.format === 'html' ? (
                <iframe title="Preview" srcDoc={exportPreview.content} className="w-full h-full border-none" />
              ) : (
                <pre className="text-xs text-emerald-500 coding-font whitespace-pre-wrap p-4 bg-slate-950">{exportPreview.content}</pre>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3">
              <button onClick={() => setExportPreview(null)} className="flex-1 bg-slate-800 py-3 rounded-xl font-bold text-slate-400 uppercase text-[10px]">ОТМЕНА</button>
              <button onClick={handleExecuteExport} className="flex-1 bg-emerald-600 py-3 rounded-xl font-bold text-white uppercase text-[10px] shadow-lg">ОТПРАВИТЬ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
