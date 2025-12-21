
import React, { useState, useEffect, useCallback } from 'react';
import { Project, Entry, EntryType } from './types';
import { getProjects, saveProject, getEntriesByProject, deleteProject, generateId, getFullProjectData, saveEntry } from './db';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Header from './components/Header';

const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [initialAction, setInitialAction] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materialTotals, setMaterialTotals] = useState<Record<string, number>>({});
  const [laborTotals, setLaborTotals] = useState<Record<string, number>>({});
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
  }, [refreshProjects]);

  const handleExport = async (project: Project, format: 'text' | 'html' | 'json') => {
    const data = await getFullProjectData(project.id);
    const dateStr = new Date().toLocaleDateString('ru-RU');
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.ais`;
      a.click();
      URL.revokeObjectURL(url);
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
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_смета.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      const mTotal = data.entries.filter(e => e.type === EntryType.MATERIAL).reduce((s, e) => s + (e.total || 0), 0);
      const lTotal = data.entries.filter(e => e.type === EntryType.LABOR).reduce((s, e) => s + (e.total || 0), 0);

      const renderSection = (title: string, entries: Entry[]) => `
        <div class="section">
          <h2>${title}</h2>
          <table>
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Итого</th>
                <th>Поставщик</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr>
                  <td>
                    <strong>${e.name || 'Без названия'}</strong>
                    ${e.images && e.images.length > 0 ? `
                      <div class="photo-grid">
                        ${e.images.map(img => `<img src="data:image/jpeg;base64,${img}" />`).join('')}
                      </div>
                    ` : ''}
                  </td>
                  <td>${e.quantity || 0} ${e.unit || ''}</td>
                  <td>${(e.price || 0).toLocaleString()} ₽</td>
                  <td>${(e.total || 0).toLocaleString()} ₽</td>
                  <td>${e.vendor || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Отчет: ${project.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 40px; background: #f9f9f9; }
            .report-container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.05); border-radius: 8px; }
            h1 { color: #10b981; margin-bottom: 5px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
            .meta { margin-bottom: 30px; font-size: 0.9em; color: #666; }
            .totals { display: flex; gap: 20px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .total-card { flex: 1; }
            .total-card span { display: block; font-size: 0.8em; text-transform: uppercase; color: #94a3b8; font-weight: bold; }
            .total-card strong { font-size: 1.5em; color: #0f172a; }
            .section { margin-bottom: 50px; }
            h2 { font-size: 1.2em; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; border-left: 4px solid #10b981; padding-left: 15px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background: #f1f5f9; padding: 12px; font-size: 0.85em; text-transform: uppercase; color: #64748b; }
            td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            .photo-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
            .photo-grid img { width: 120px; height: 120px; object-cover; border-radius: 6px; border: 1px solid #e2e8f0; }
            @media print { body { background: white; padding: 0; } .report-container { box-shadow: none; width: 100%; max-width: none; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="report-container">
            <h1>${project.name}</h1>
            <div class="meta">
              <div>📍 Адрес: ${project.address || 'Не указан'}</div>
              <div>📅 Дата отчета: ${dateStr}</div>
            </div>
            
            <div class="totals">
              <div class="total-card"><span>Материалы</span><strong>${mTotal.toLocaleString()} ₽</strong></div>
              <div class="total-card"><span>Работы</span><strong>${lTotal.toLocaleString()} ₽</strong></div>
              <div class="total-card"><span>Итого</span><strong style="color: #10b981">${(mTotal + lTotal).toLocaleString()} ₽</strong></div>
            </div>

            ${renderSection('МАТЕРИАЛЫ', data.entries.filter(e => e.type === EntryType.MATERIAL))}
            ${renderSection('РАБОТЫ', data.entries.filter(e => e.type === EntryType.LABOR))}

            <div style="text-align: center; margin-top: 50px; font-size: 0.7em; color: #cbd5e1; font-family: monospace;">
              Сформировано в приложении smeta AI
            </div>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}_отчет.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
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
            onShare={handleExport}
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
