import type { Project, ProjectSummary } from "./types";

const DB_NAME = "storybook-gen-illustration";
const DB_VERSION = 1;
const PROJECTS = "projects";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) {
        db.createObjectStore(PROJECTS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PROJECTS, "readonly").objectStore(PROJECTS).getAll();
    req.onsuccess = () => {
      const rows = (req.result as Project[]) ?? [];
      const summaries = rows
        .map((p) => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
          createdAt: p.createdAt,
          filename: p.manuscript.filename,
          characterCount: p.characters.length,
          sceneCount: p.storyboard.length,
          imageCount: p.storyboard.reduce((n, s) => n + s.images.length, 0),
          styleName: p.style.name,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(summaries);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PROJECTS, "readonly").objectStore(PROJECTS).get(id);
    req.onsuccess = () => resolve((req.result as Project) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putProject(project: Project): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(PROJECTS, "readwrite");
  tx.objectStore(PROJECTS).put({ ...project, updatedAt: Date.now() });
  await txDone(tx);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(PROJECTS, "readwrite");
  tx.objectStore(PROJECTS).delete(id);
  await txDone(tx);
}
