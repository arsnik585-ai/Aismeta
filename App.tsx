
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType, AppSettings } from './types';
import { getProjects, saveProject, getEntriesByProject, deleteProject, generateId, getFullProjectData, saveEntry, getSettings, saveSettings, DEFAULT_SETTINGS } from './db';
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
  const [settings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  
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
    const loadData = async () => {
      const s = await getSettings();
      setAppSettings(s);
      refreshProjects();
    };
    loadData();
  }, [refreshProjects]);

  // Apply styles based on settings
  useEffect(() => {
    const root = document.documentElement;
    const themes = {
      coding: {
        bg: '#020617',
        card: '#0f172a',
        innerBg: '#020617',
        btn: '#10b981',
        btnSecondary: '#1e293b',
        btnText: '#ffffff',
        text: '#f1f5f9',
        border: 'rgba(16, 185, 129, 0.2)',
        muted: '#64748b'
      },
      midnight: {
        bg: '#000000',
        card: '#0f172a',
        innerBg: '#000000',
        btn: '#2563eb',
        btnSecondary: '#111827',
        btnText: '#ffffff',
        text: '#e2e8f0',
        border: 'rgba(37, 99, 235, 0.3)',
        muted: '#475569'
      },
      gray: {
        bg: '#94a3b8', // Slate-400
        card: '#f1f5f9', // Slate-50 (Slightly gray card)
        innerBg: 'transparent',
        btn: '#10b981',
        btnSecondary: '#e2e8f0',
        btnText: '#ffffff',
        text: '#020617', // Black for readability
        border: '#cbd5e1', // Slate-300
        muted: '#334155' // Slate-700
      }
    };
    const c = themes[settings.theme] || themes.coding;
    
    root.style.setProperty('--app-bg', c.bg);
    root.style.setProperty('--app-card', c.card);
    root.style.setProperty('--app-inner-bg', c.innerBg);
    root.style.setProperty('--app-primary', c.btn);
    root.style.setProperty('--app-secondary-bg', c.btnSecondary);
    root.style.setProperty('--app-primary-text', c.btnText);
    root.style.setProperty('--app-text', c.text);
    root.style.setProperty('--app-border', c.border);
    root.style.setProperty('--app-muted', c.muted);
    
    // Theme indicator for CSS
    if (settings.theme === 'gray') {
      root.setAttribute('data-theme', 'gray');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [settings.theme]);

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handlePrepareExport = async (project: Project, format: 'text' | 'html' | 'json') => {
    const data = await getFullProjectData(project.id);
    const dateStr = new Date().toLocaleDateString('ru-RU');
    
    let blob: Blob;
    let fileName: string;
    let previewContent: string = "";

    const totalIncomes = (data.project.incomes || []).reduce((sum, inc) => sum + inc.amount, 0);
    const mTotal = data.entries.filter(e => e.type === EntryType.MATERIAL).reduce((s, e) => s + (e.total || 0), 0);
    const lTotal = data.entries.filter(e => e.type === EntryType.LABOR).reduce((s, e) => s + (e.total || 0), 0);
    const totalSpent = mTotal + lTotal;
    const balance = totalIncomes - totalSpent;

    if (format === 'json') {
      previewContent = JSON.stringify(data, null, 2);
      blob = new Blob([previewContent], { type: 'application/json' });
      fileName = `${project.name}.ais`;
    } else if (format === 'text') {
      let text = `ОТЧЕТ: ${project.name}\nАДРЕС: ${project.address}\nДАТА: ${dateStr}\n\n`;
      text += `ФИНАНСЫ:\n`;
      text += `- Общий приход от заказчика: ${totalIncomes.toLocaleString()} руб.\n`;
      text += `- Израсходовано: ${totalSpent.toLocaleString()} руб.\n`;
      text += `- Остаток: ${balance.toLocaleString()} руб.\n\n`;
      
      text += `${settings.labels.materialTab}:\n`;
      data.entries.filter(e => e.type === EntryType.MATERIAL).forEach(e => {
        text += `- ${e.name}: ${e.quantity || 1} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });
      text += `\n${settings.labels.laborTab}:\n`;
      data.entries.filter(e => e.type === EntryType.LABOR).forEach(e => {
        text += `- ${e.name}: ${e.quantity || 1} ${e.unit || ''} x ${e.price || 0} = ${e.total || 0} руб.\n`;
      });
      previewContent = text;
      blob = new Blob([text], { type: 'text/plain' });
      fileName = `${project.name}_отчет.txt`;
    } else {
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
                  <td class="center">${e.quantity || 1} ${e.unit || ''}</td>
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
            .totals { display: flex; gap: 10px; margin-bottom: 25px; flex-wrap: wrap; }
            .total-item { flex: 1; min-width: 120px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
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
              <div class="total-item"><span>Общий приход от заказчика</span><strong>${totalIncomes.toLocaleString()} ₽</strong></div>
              <div class="total-item"><span>${settings.labels.materialTab}</span><strong>${mTotal.toLocaleString()} ₽</strong></div>
              <div class="total-item"><span>${settings.labels.laborTab}</span><strong>${lTotal.toLocaleString()} ₽</strong></div>
              <div class="total-item" style="border-color:${balance < 0 ? '#ef4444' : '#10b981'}">
                <span>${balance < 0 ? 'Перерасход' : 'Остаток'}</span>
                <strong style="color:${balance < 0 ? '#ef4444' : '#059669'}">${Math.abs(balance).toLocaleString()} ₽</strong>
              </div>
            </div>

            ${(data.project.incomes || []).length > 0 ? `
              <div class="section">
                <h2>История приходов</h2>
                <table>
                  <thead><tr><th>Дата</th><th>Сумма</th></tr></thead>
                  <tbody>
                    ${data.project.incomes!.sort((a,b)=>a.date-b.date).map(inc => `
                      <tr><td>${new Date(inc.date).toLocaleDateString('ru-RU')}</td><td class="bold">${inc.amount.toLocaleString()} ₽</td></tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${renderSection(settings.labels.materialTab.toUpperCase(), data.entries.filter(e => e.type === EntryType.MATERIAL))}
            ${renderSection(settings.labels.laborTab.toUpperCase(), data.entries.filter(e => e.type === EntryType.LABOR))}
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

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm("Удалить этот объект безвозвратно?")) {
      await deleteProject(id);
      await refreshProjects();
    }
  };

  return (
    <div className={`min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex flex-col max-w-6xl mx-auto shadow-2xl border-x border-[var(--app-border)]`}>
      <Header 
        isDetail={!!currentProject} 
        onBack={() => { setCurrentProject(null); setInitialAction(null); refreshProjects(); }}
        title={currentProject ? currentProject.name : 'smeta'}
        viewingArchive={viewingArchive}
        onToggleArchive={() => setViewingArchive(!viewingArchive)}
        onImport={handleImport} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setShowSettings(true)}
        settings={settings}
      />
      <main className="flex-1 p-3 md:p-6 overflow-y-auto no-scrollbar">
        {currentProject ? (
          <ProjectDetail 
            project={currentProject} 
            initialAction={initialAction}
            activeTab={activeTab}
            onDataChange={refreshProjects}
            settings={settings}
            onTabChange={setActiveTab}
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
            onPermanentDelete={handlePermanentDelete}
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
            settings={settings}
          />
        )}
      </main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-[var(--app-card)] border border-[var(--app-border)] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-[var(--app-border)] flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[var(--app-primary)] uppercase tracking-widest font-mono">Настройки</h3>
                  <button onClick={() => setShowSettings(false)} className="text-[var(--app-muted)] hover:text-[var(--app-text)]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[var(--app-muted)] uppercase tracking-widest">Тема оформления</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {(['coding', 'midnight', 'gray'] as const).map(t => (
                          <button key={t} onClick={() => handleUpdateSettings({...settings, theme: t})} className={`py-2 px-1 text-[9px] font-bold rounded-lg border transition-all ${settings.theme === t ? 'bg-[var(--app-primary)] border-[var(--app-primary)] text-[var(--app-primary-text)]' : 'bg-[var(--app-secondary-bg)] border-[var(--app-border)] text-[var(--app-muted)]'}`}>
                            {t.toUpperCase()}
                          </button>
                        ))}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[var(--app-muted)] uppercase tracking-widest">Текстовые обозначения</h4>
                    <div className="space-y-2">
                        {Object.entries(settings.labels).map(([key, value]) => (
                          <div key={key} className="flex flex-col gap-1">
                             <span className="text-[8px] text-[var(--app-muted)] font-mono uppercase">{key}</span>
                             <input 
                              value={value}
                              onChange={(e) => handleUpdateSettings({...settings, labels: {...settings.labels, [key]: e.target.value}})}
                              className="bg-[var(--app-inner-bg)] border border-[var(--app-border)] rounded-lg p-2 text-xs text-[var(--app-text)] outline-none focus:border-[var(--app-primary)]"
                             />
                          </div>
                        ))}
                    </div>
                  </section>
              </div>
              <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-inner-bg)]/50">
                <button onClick={() => setShowSettings(false)} className="w-full bg-[var(--app-primary)] py-3 rounded-xl font-bold text-[var(--app-primary-text)] uppercase text-[10px] tracking-widest">ГОТОВО</button>
              </div>
           </div>
        </div>
      )}

      {exportPreview && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--app-card)] border border-[var(--app-border)] w-full max-w-4xl h-[90vh] rounded-[2rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[var(--app-border)] flex justify-between items-center bg-[var(--app-inner-bg)]/50 backdrop-blur-md">
              <h3 className="text-sm font-bold text-[var(--app-primary)] coding-font uppercase">ПРЕДПРОСМОТР_ОТЧЕТА</h3>
              <button onClick={() => setExportPreview(null)} className="p-2 text-[var(--app-muted)] hover:text-[var(--app-text)]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-auto bg-white p-2">
              {exportPreview.format === 'html' ? (
                <iframe title="Preview" srcDoc={exportPreview.content} className="w-full h-full border-none" />
              ) : (
                <pre className="text-xs text-[#10b981] coding-font whitespace-pre-wrap p-4 bg-slate-950">{exportPreview.content}</pre>
              )}
            </div>
            <div className="p-4 border-t border-[var(--app-border)] bg-[var(--app-inner-bg)]/50 flex gap-3">
              <button onClick={() => setExportPreview(null)} className="flex-1 bg-[var(--app-secondary-bg)] py-3 rounded-xl font-bold text-[var(--app-muted)] uppercase text-[10px]">ОТМЕНА</button>
              <button onClick={handleExecuteExport} className="flex-1 bg-[var(--app-primary)] py-3 rounded-xl font-bold text-[var(--app-primary-text)] uppercase text-[10px] shadow-lg">ОТПРАВИТЬ</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        :root {
          --app-bg: #020617;
          --app-card: #0f172a;
          --app-inner-bg: #020617;
          --app-primary: #10b981;
          --app-secondary-bg: #1e293b;
          --app-primary-text: #ffffff;
          --app-text: #f1f5f9;
          --app-border: rgba(16, 185, 129, 0.2);
          --app-muted: #64748b;
        }
        body {
          background-color: var(--app-bg);
          color: var(--app-text);
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .bg-slate-900 { background-color: var(--app-card) !important; }
        .bg-slate-950 { background-color: var(--app-bg) !important; }
        .border-slate-800, .border-slate-700 { border-color: var(--app-border) !important; }
        .text-emerald-500, .text-emerald-400 { color: var(--app-primary) !important; }
        .bg-emerald-600 { background-color: var(--app-primary) !important; color: var(--app-primary-text) !important; }
        .bg-slate-800 { background-color: var(--app-secondary-bg) !important; }
        .text-slate-300, .text-slate-400, .text-slate-500 { color: var(--app-muted) !important; }
        .text-white { color: var(--app-text) !important; }
        
        input, textarea { 
          color: var(--app-text) !important; 
          background-color: transparent !important;
        }
        input::placeholder, textarea::placeholder { 
          color: var(--app-muted) !important; 
          opacity: 0.5; 
        }

        /* Standard dark backgrounds for overlays */
        .bg-slate-950\/50 { background-color: rgba(2, 6, 23, 0.5) !important; }
        .bg-slate-950\/40 { background-color: rgba(2, 6, 23, 0.4) !important; }
        .bg-emerald-950 { background-color: #064e3b !important; }

        /* GRAY THEME SPECIFIC OVERRIDES */
        html[data-theme='gray'] body {
          background-image: none !important;
          background-color: #94a3b8 !important;
        }
        html[data-theme='gray'] .bg-slate-950\/50,
        html[data-theme='gray'] .bg-slate-950\/40,
        html[data-theme='gray'] .bg-emerald-950,
        html[data-theme='gray'] .bg-slate-950\/90 { 
          background-color: transparent !important; 
          border-color: #cbd5e1 !important;
        }
        html[data-theme='gray'] .bg-emerald-950 {
          background-color: transparent !important;
          border: none !important;
          padding: 0 !important;
        }
        html[data-theme='gray'] .bg-emerald-950 span {
          color: #1e293b !important;
          font-weight: 700 !important;
          background: transparent !important;
          border: none !important;
        }
        html[data-theme='gray'] .bg-slate-950\/40 {
          background-color: transparent !important;
          border: 1px solid #cbd5e1 !important;
        }
        html[data-theme='gray'] .bg-slate-950\/50 {
          background-color: transparent !important;
          border: 1px solid #cbd5e1 !important;
        }
        html[data-theme='gray'] .bg-slate-900 {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
          border-color: #cbd5e1 !important;
          background-color: #f1f5f9 !important;
        }
        html[data-theme='gray'] .text-emerald-400 {
          color: #059669 !important;
        }
        html[data-theme='gray'] input, html[data-theme='gray'] textarea {
          color: #020617 !important;
          font-weight: 600 !important;
        }
        html[data-theme='gray'] .bg-slate-950 {
          background-color: #f1f5f9 !important;
        }
        html[data-theme='gray'] .border-slate-800 {
          border-color: #cbd5e1 !important;
        }
        html[data-theme='gray'] header.bg-slate-900 {
          background-color: #f1f5f9 !important;
          border-bottom-color: #94a3b8 !important;
        }
        html[data-theme='gray'] .text-white {
          color: #020617 !important;
        }
        html[data-theme='gray'] .text-slate-300, html[data-theme='gray'] .text-slate-400 {
          color: #020617 !important;
        }
        /* Dashboard date icon color */
        html[data-theme='gray'] .text-emerald-600 {
          color: #059669 !important;
        }
        /* Remove gray backgrounds on move buttons */
        html[data-theme='gray'] .bg-slate-950\/50.p-0.5 {
            background-color: transparent !important;
            border-color: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default App;
