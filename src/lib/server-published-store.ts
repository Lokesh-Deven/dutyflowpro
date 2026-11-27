import fs from 'fs';
import path from 'path';
import { SeatingAllocationRecord } from './student-seating-types';

export interface PublishedWorkspaceData {
  subjects?: any[];
  studentsBySubject?: Record<string, any[]>;
  rooms?: any[];
}

export interface InstitutionPublishedRecord {
  institutionCode: string;
  institutionId?: string;
  institutionName?: string;
  updatedAt: string;
  allocations: SeatingAllocationRecord[];
  workspace?: PublishedWorkspaceData;
}

export interface PublishedStoreSchema {
  version: number;
  institutions: Record<string, InstitutionPublishedRecord>;
}

const DATA_DIR = path.join(process.cwd(), '.dutyflow_data');
const STORE_PATH = path.join(DATA_DIR, 'published_seating_store.json');

// In-memory cache for ultra-fast multi-platform responses
let memoryStore: PublishedStoreSchema | null = null;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[PublishedStore] Could not create data directory:', err);
  }
}

function loadStore(): PublishedStoreSchema {
  if (memoryStore) return memoryStore;

  ensureDataDir();
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.institutions === 'object') {
        memoryStore = parsed;
        return memoryStore!;
      }
    }
  } catch (err) {
    console.warn('[PublishedStore] Could not read published store file, initializing fresh:', err);
  }

  memoryStore = {
    version: 1,
    institutions: {},
  };
  return memoryStore;
}

function saveStore(): void {
  if (!memoryStore) return;
  ensureDataDir();
  try {
    const tmpPath = `${STORE_PATH}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(memoryStore, null, 2), 'utf8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.warn('[PublishedStore] Could not save store file:', err);
  }
}

function normalizeCode(code?: string): string {
  const clean = (code || '').trim();
  if (!clean) return '001';
  return clean.length <= 3 ? clean.padStart(3, '0') : clean;
}

/**
 * Persists a published seating allocation and associated workspace rosters
 * to shared server storage accessible by computer, tablet, and mobile devices.
 */
export function savePublishedAllocationServer(params: {
  allocation: SeatingAllocationRecord;
  institutionCode?: string;
  institutionId?: string;
  institutionName?: string;
  workspace?: PublishedWorkspaceData;
}): SeatingAllocationRecord {
  const store = loadStore();
  const code = normalizeCode(params.institutionCode);
  const now = new Date().toISOString();

  const currentInst = store.institutions[code] || {
    institutionCode: code,
    institutionId: params.institutionId || undefined,
    institutionName: params.institutionName || 'Institution',
    updatedAt: now,
    allocations: [],
    workspace: { subjects: [], studentsBySubject: {}, rooms: [] },
  };

  const markedAlloc: SeatingAllocationRecord = {
    ...params.allocation,
    isPublished: true,
    status: 'Published',
    publishedAt: params.allocation.publishedAt || now,
    updatedAt: now,
  };

  const existingIdx = currentInst.allocations.findIndex((a) => a.id === markedAlloc.id);
  if (existingIdx >= 0) {
    currentInst.allocations[existingIdx] = markedAlloc;
  } else {
    currentInst.allocations.unshift(markedAlloc);
  }

  currentInst.updatedAt = now;
  if (params.institutionId && !currentInst.institutionId) {
    currentInst.institutionId = params.institutionId;
  }
  if (params.institutionName && currentInst.institutionName === 'Institution') {
    currentInst.institutionName = params.institutionName;
  }

  // Merge workspace student rosters
  if (params.workspace) {
    const existingWs = currentInst.workspace || {};
    currentInst.workspace = {
      subjects: params.workspace.subjects || existingWs.subjects || [],
      studentsBySubject: {
        ...(existingWs.studentsBySubject || {}),
        ...(params.workspace.studentsBySubject || {}),
      },
      rooms: params.workspace.rooms || existingWs.rooms || [],
    };
  }

  store.institutions[code] = currentInst;
  saveStore();

  return markedAlloc;
}

/**
 * Marks an allocation as unpublished in the shared server store.
 */
export function unpublishAllocationServer(params: {
  allocationId: string;
  institutionCode?: string;
  institutionId?: string;
}): boolean {
  const store = loadStore();
  const code = normalizeCode(params.institutionCode);
  const inst = store.institutions[code];
  if (!inst) return false;

  let found = false;
  inst.allocations = inst.allocations.map((a) => {
    if (a.id === params.allocationId) {
      found = true;
      return {
        ...a,
        isPublished: false,
        status: 'Draft',
        updatedAt: new Date().toISOString(),
      };
    }
    return a;
  });

  if (found) {
    inst.updatedAt = new Date().toISOString();
    saveStore();
  }
  return found;
}

/**
 * Removes an allocation completely from the shared server store.
 */
export function deleteAllocationServer(params: {
  allocationId: string;
  institutionCode?: string;
  institutionId?: string;
}): boolean {
  const store = loadStore();
  const code = normalizeCode(params.institutionCode);
  const inst = store.institutions[code];
  if (!inst) return false;

  const prevLen = inst.allocations.length;
  inst.allocations = inst.allocations.filter((a) => a.id !== params.allocationId);

  if (inst.allocations.length !== prevLen) {
    inst.updatedAt = new Date().toISOString();
    saveStore();
    return true;
  }
  return false;
}

/**
 * Retrieves all published allocations and workspace rosters for a given institution code.
 */
export function getPublishedDataServer(
  institutionCode?: string,
  institutionId?: string
): {
  allocations: SeatingAllocationRecord[];
  workspace: PublishedWorkspaceData | null;
  institutionName?: string;
  institutionId?: string;
  institutionCode: string;
} {
  const store = loadStore();
  const code = normalizeCode(institutionCode);

  let inst = store.institutions[code];

  // If not found directly by code, check by institutionId
  if (!inst && institutionId) {
    for (const item of Object.values(store.institutions)) {
      if (item.institutionId === institutionId) {
        inst = item;
        break;
      }
    }
  }

  // Fallback to default '001' if specific code not found and 001 exists
  if (!inst && code !== '001' && store.institutions['001']) {
    inst = store.institutions['001'];
  }

  if (!inst) {
    return {
      allocations: [],
      workspace: null,
      institutionCode: code,
    };
  }

  // Filter STRICTLY for published allocations
  const publishedAllocations = (inst.allocations || []).filter(
    (a) => a && (a.isPublished === true || a.status === 'Published')
  );

  return {
    allocations: publishedAllocations,
    workspace: inst.workspace || null,
    institutionName: inst.institutionName,
    institutionId: inst.institutionId,
    institutionCode: inst.institutionCode,
  };
}
