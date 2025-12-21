
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
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.ais`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'text') {
      let text = `ПРОЕКТ: ${project.name}\nАДРЕС: ${project.address}\n\n`;
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
    }
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Comprehensive check for .ais structure
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
        
        // Save entries sequentially to ensure data integrity
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
