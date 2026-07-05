/**
 * Folder cache — mirror each project to a JSON file in the project folder (via the dev
 * server, /api/card-cache/*), so work survives F5 / tab close / switching browsers.
 * IndexedDB is per-browser; these files are not.
 *
 * Design is ADDITIVE and safe: mirroring is fire-and-forget and never blocks or mutates
 * IndexedDB. Restore only runs when IndexedDB is EMPTY (fresh browser), so it can never
 * overwrite existing local work.
 */
import type { ProjectRecord } from './db';

// Only meaningful in dev (the dev server provides the endpoint). Harmless no-op otherwise.
const enabled = (): boolean => Boolean((import.meta as any).env && !(import.meta as any).env.PROD);

/** Fire-and-forget: write/overwrite this project's JSON snapshot in the folder. */
export function mirrorProject(project: ProjectRecord): void {
  if (!enabled() || !project?.id) return;
  fetch('/api/card-cache/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: project.id, data: project }),
  }).catch(() => { /* backup is best-effort — never disrupt the app */ });
}

/** Remove a project's folder snapshot (on delete). Fire-and-forget. */
export function removeProjectMirror(id: string): void {
  if (!enabled() || !id) return;
  fetch('/api/card-cache/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: id }),
  }).catch(() => { /* ignore */ });
}

interface FolderListItem { key: string; savedAt: number }

/** List project snapshots present in the folder. */
export async function listFolderProjects(): Promise<FolderListItem[]> {
  if (!enabled()) return [];
  try {
    const r = await fetch('/api/card-cache/list');
    if (!r.ok) return [];
    const data = await r.json();
    return data?.ok && Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

/** Load one project's full record from the folder. */
export async function loadFolderProject(id: string): Promise<ProjectRecord | null> {
  if (!enabled() || !id) return null;
  try {
    const r = await fetch(`/api/card-cache/load?key=${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    const data = await r.json();
    return data?.ok && data.data ? (data.data as ProjectRecord) : null;
  } catch {
    return null;
  }
}
