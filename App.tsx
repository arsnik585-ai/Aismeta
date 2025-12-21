
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
  
  // State for preview
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
      let text = `ПРОЕКТ: ${project.name}\nАДРЕС: ${project.address}\nДАТА ОТЧЕТА: ${dateStr}\n\n`;
      text += `--- МАТЕРИАЛЫ ---\n`;
      data.entries.filter(e => e.type === EntryType.MATERIAL).forEach(e => {
        text += `- ${e.name}: ${e.quantity} ${e.unit} x ${e.price} = ${e.total} руб. (${e.vendor || '-'})\n`;
      });
      text += `\n--- РАБОТЫ ---\n`;
      data.entries.filter(e => e.type === EntryType.LABOR).forEach(e => {
        text += `- ${e.name}: ${e.quantity} ${e.unit} x ${e.price} = ${e.total} руб. (${e.vendor || '-'})\n`;
      });
      previewContent = text;
      blob = new Blob([text], { type: 'text/plain' });
      fileName = `${project.name}_смета.txt`;
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
                <th style="width: 80px;">Кол-во</th>
                <th style="width: 100px;">Цена</th>
                <th style="width: 120px;">Итого</th>
                <th>Поставщик</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>
                    <div style="font-weight: 600; font-size: 1.1em; color: #1e293b;">${e.name || 'Без названия'}</div>
                    ${e.images && e.images.length > 0 ? `
                      <div class="photo-grid">
                        ${e.images.map(img => `<img src="data:image/jpeg;base64,${img}" />`).join('')}
                      </div>
                    ` : ''}
                  </td>
                  <td>${e.quantity || 0} ${e.unit || ''}</td>
                  <td style="white-space: nowrap;">${(e.price || 0).toLocaleString()} ₽</td>
                  <td style="white-space: nowrap; font-weight: 600; color: #10b981;">${(e.total || 0).toLocaleString()} ₽</td>
                  <td style="color: #64748b; font-size: 0.9em;">${e.vendor || '-'}</td>
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
          <title>Смета: ${project.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; padding: 20px; background: #f8fafc; margin: 0; }
            .report-container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            header { border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 32px; }
            h1 { font-size: 2.5em; margin: 0; color: #0f172a; letter-spacing: -0.025em; }
            .meta { margin-top: 12px; color: #64748b; font-size: 0.95em; display: flex; flex-direction: column; gap: 4px; }
            .totals-grid { display: grid; grid-template-cols: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
            .total-card { background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .total-card.highlight { background: #ecfdf5; border-color: #10b981; }
            .total-card span { display: block; font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 4px; }
            .total-card strong { font-size: 1.75em; color: #0f172a; display: block; }
            .total-card.highlight strong { color: #059669; }
            .section { margin-bottom: 48px; }
            h2 { font-size: 1.25em; font-weight: 700; color: #334155; margin-bottom: 20px; border-left: 4px solid #10b981; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; background: #f8fafc; padding: 12px; font-size: 0.75em; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .photo-grid { display: grid; grid-template-cols: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 12px; }
            .photo-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; transition: transform 0.2s; cursor: pointer; }
            .photo-grid img:hover { transform: scale(1.05); }
            @media print { 
              body { background: white; padding: 0; }
              .report-container { box-shadow: none; width: 100%; max-width: none; padding: 0; }
              .total-card { border: 1px solid #ddd; }
              .photo-grid { grid-template-cols: repeat(4, 1fr); }
            }
            @media (max-width: 600px) {
              .report-container { padding: 20px; }
              h1 { font-size: 1.75em; }
              table, thead, tbody, th, td, tr { display: block; }
              th { display: none; }
              td { padding: 12px 0; border-bottom: 2px solid #f1f5f9; }
              td::before { content: attr(data-label); display: block; font-weight: bold; color: #64748b; font-size: 0.75em; text-transform: uppercase; margin-bottom: 4px; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <header>
              <h1>${project.name}</h1>
              <div class="meta">
                <span>📍 Адрес: <strong>${project.address || 'Не указан'}</strong></span>
                <span>📅 Сформировано: <strong>${dateStr}</strong></span>
              </div>
            </header>
            
            <div class="totals-grid">
              <div class="total-card"><span>Материалы</span><strong>${mTotal.toLocaleString()} ₽</strong></div>
              <div class="total-card"><span>Работы</span><strong>${lTotal.toLocaleString()} ₽</strong></div>
              <div class="total-card highlight"><span>Общий Итог</span><strong>${(mTotal + lTotal).toLocaleString()} ₽</strong></div>
            </div>

            ${renderSection('МАТЕРИАЛЫ', data.entries.filter(e => e.type === EntryType.MATERIAL))}
            ${renderSection('РАБОТЫ', data.entries.filter(e => e.type === EntryType.LABOR))}

            <footer style="text-align: center; margin-top: 60px; padding-top: 24px; border-top: 1px solid #f1f5f9; font-size: 0.8em; color: #94a3b8;">
              Отчет подготовлен в приложении <strong>smeta</strong>
            </footer>
          </div>
        </body>
        </html>
      `;
      previewContent = htmlContent;
      blob = new Blob([htmlContent], { type: 'text/html' });
      fileName = `${project.name}_смета.html`;
    }

    setExportPreview({
      format,
      content: previewContent,
      project,
      blob,
      fileName
    });
  };

  const handleExecuteExport = async () => {
    if (!exportPreview) return;

    const { blob, fileName, project } = exportPreview;

    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: blob.type })] })) {
      try {
        const file = new File([blob], fileName, { type: blob.type });
        await navigator.share({
          files: [file],
          title: `Смета: ${project.name}`,
          text: `Отчет по объекту: ${project.name}`,
        });
        setExportPreview(null);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
      }
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
        
        if (!data.project || !Array.isArray(data.entries)) {
          throw new Error("Неверный формат файла .ais");
        }

        const newProjectId = generateId();
        const importedProject = { 
          ...data.project, 
          id: newProjectId, 
          name: `${data.project.name} (Импорт)`,
          archived: false,
          createdAt: Date.now()
        };

        await saveProject(importedProject);
        
        for (const entry of data.entries) {
          const newEntryId = generateId();
          await saveEntry({ 
            ...entry, 
            id: newEntryId, 
            projectId: newProjectId, 
            archived: false 
          });
        }
        
        setViewingArchive(false);
        await refreshProjects();
        alert("Проект успешно импортирован");
      } catch (err) {
        console.error(err);
        alert("Ошибка при импорте. Проверьте файл .ais");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col max-w-5xl mx-auto shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-slate-900">
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { 
          setCurrentProject(null); 
          setInitialAction(null); 
          refreshProjects();
        }}
        title={currentProject ? currentProject.name : 'smeta'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImport} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
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
            onShare={handlePrepareExport}
            onQuickAction={(p, a) => {
                setCurrentProject(p);
                setInitialAction(a);
            }}
            viewingArchive={viewingArchive}
          />
        )}
      </main>

      {/* Export Preview Modal */}
      {exportPreview && (
        <div className="fixed inset-0 bg-slate-950/98 z-[100] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
              <div>
                <h3 className="text-xl font-bold text-emerald-400 coding-font tracking-tighter uppercase flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ПРЕДПРОСМОТР ОТЧЕТА
                </h3>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-1">Формат: {exportPreview.format.toUpperCase()} • {exportPreview.project.name}</p>
              </div>
              <button 
                onClick={() => setExportPreview(null)}
                className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4 md:p-8">
              {exportPreview.format === 'html' ? (
                <div className="w-full h-full bg-white rounded-xl overflow-hidden border border-slate-800">
                  <iframe 
                    title="Report Preview" 
                    srcDoc={exportPreview.content} 
                    className="w-full h-full border-none"
                  />
                </div>
              ) : (
                <pre className="text-xs md:text-sm text-emerald-500 coding-font whitespace-pre-wrap leading-relaxed bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-inner">
                  {exportPreview.content}
                </pre>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => setExportPreview(null)}
                className="flex-1 bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 uppercase text-xs tracking-widest active:scale-95 transition-all"
              >
                ОТМЕНА
              </button>
              <button 
                onClick={handleExecuteExport}
                className="flex-1 bg-emerald-600 py-4 rounded-2xl font-bold text-white uppercase text-xs tracking-widest shadow-xl shadow-emerald-950/20 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                ОТПРАВИТЬ ОТЧЕТ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
