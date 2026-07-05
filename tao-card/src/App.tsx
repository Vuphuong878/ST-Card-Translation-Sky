import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy } from 'react';
import { AppShell } from './components/layout/AppShell';
import { CopilotPanel } from './components/copilot/CopilotPanel';
import { useCardStore } from './store/cardStore';
import { ToastContainer } from './components/common/ToastContainer';

const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CardEditorPage = lazy(() => import('./pages/CardEditorPage').then(m => ({ default: m.CardEditorPage })));
const LorebookPage = lazy(() => import('./pages/LorebookPage').then(m => ({ default: m.LorebookPage })));
const RegexLabPage = lazy(() => import('./pages/RegexLabPage').then(m => ({ default: m.RegexLabPage })));
const MVUZODPage = lazy(() => import('./pages/MVUZODPage').then(m => ({ default: m.MVUZODPage })));
const EJSStudioPage = lazy(() => import('./pages/EJSStudioPage').then(m => ({ default: m.EJSStudioPage })));
const WikiPage = lazy(() => import('./pages/WikiPage').then(m => ({ default: m.WikiPage })));
const AutoCreatorPage = lazy(() => import('./pages/AutoCreatorPage').then(m => ({ default: m.AutoCreatorPage })));

function AppInit() {
  const { createNewProject, loadProject, refreshProjectList } = useCardStore();

  useEffect(() => {
    const init = async () => {
      await refreshProjectList();
      let allProjects = useCardStore.getState().projects;

      // Fresh browser (empty IndexedDB) → try restoring from the folder cache so work done
      // in another browser / before a data wipe isn't lost. Only runs when empty, so it can
      // never overwrite existing local projects.
      if (allProjects.length === 0) {
        try {
          const { listFolderProjects, loadFolderProject } = await import('./lib/db/folderCache');
          const { putProjectRecord } = await import('./lib/db/projectRepo');
          const items = await listFolderProjects();
          let restored = 0;
          for (const it of items) {
            const rec = await loadFolderProject(it.key);
            if (rec && rec.id && rec.card) { await putProjectRecord(rec); restored++; }
          }
          if (restored > 0) {
            await refreshProjectList();
            allProjects = useCardStore.getState().projects;
          }
        } catch { /* folder cache unavailable — fall through to a new project */ }
      }

      if (allProjects.length === 0) {
        await createNewProject('New Character');
      } else {
        await loadProject(allProjects[0].id);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/auto-creator" element={<AutoCreatorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/editor" element={<CardEditorPage />} />
          <Route path="/lorebook" element={<LorebookPage />} />
          <Route path="/regex" element={<RegexLabPage />} />
          <Route path="/mvuzod" element={<MVUZODPage />} />
          <Route path="/ejs-studio" element={<EJSStudioPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Route>
      </Routes>
      <CopilotPanel />
      <ToastContainer />
    </BrowserRouter>
  );
}
