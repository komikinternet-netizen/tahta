import { getSupabaseClient } from "@/lib/supabase";
import { type AppTheme, type Biome, type PalasNodeData, type Weather, type Workspace } from "@/store/usePalasStore";
import { type Edge, type Node } from "@xyflow/react";

export type BoardSnapshot = {
  nodes: Node<PalasNodeData>[];
  edges: Edge[];
  biome: Biome;
  weather: Weather;
  vibe: "memory" | "work";
  theme?: AppTheme;
  workspaces?: Workspace[];
  activeWorkspaceId?: string;
};

export interface StorageAdapter {
  load(): Promise<BoardSnapshot | null>;
  save(snapshot: BoardSnapshot): Promise<void>;
}

const storageKey = "palas-board-v1";
const databaseName = "palas-local";
const databaseVersion = 1;
const boardStoreName = "boards";
const backgroundStoreName = "backgrounds";
let lastSyncNoticeAt = 0;

function reportStorageSynced() {
  if (typeof window === "undefined" || Date.now() - lastSyncNoticeAt < 20000) return;
  lastSyncNoticeAt = Date.now();
  window.dispatchEvent(new CustomEvent("palas-storage-synced"));
}

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Bu tarayıcı IndexedDB depolamasını desteklemiyor."));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(boardStoreName)) database.createObjectStore(boardStoreName);
      if (!database.objectStoreNames.contains(backgroundStoreName)) database.createObjectStore(backgroundStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Yerel veritabanı açılamadı."));
    request.onblocked = () => reject(new Error("Yerel veritabanı başka bir sekmede kullanılıyor."));
  });
}

async function readEntry<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Yerel kayıt okunamadı."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Yerel kayıt okunamadı."));
  });
}

async function writeEntry(storeName: string, key: IDBValidKey, value: unknown) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value, key);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Yerel kayıt yazılamadı.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Yerel kayıt yazılamadı.")); };
  });
}

export function loadSceneBackgrounds() {
  return Promise.all((["backyard", "loft", "night"] as const).map(async (biome) => [biome, await readEntry<Blob>(backgroundStoreName, biome)] as const))
    .then((entries) => Object.fromEntries(entries.filter((entry): entry is readonly [typeof entry[0], Blob] => Boolean(entry[1]))));
}

export function saveSceneBackground(biome: Biome, image: Blob) {
  return writeEntry(backgroundStoreName, biome, image).then(reportStorageSynced);
}

export function reportStorageError() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("palas-storage-error"));
}

class BrowserStorageAdapter implements StorageAdapter {
  async load() {
    if (typeof window === "undefined") return null;
    const saved = await readEntry<BoardSnapshot>(boardStoreName, "active-board");
    if (saved) return saved;
    const legacy = window.localStorage.getItem(storageKey);
    if (!legacy) return null;
    const snapshot = JSON.parse(legacy) as BoardSnapshot;
    try {
      await writeEntry(boardStoreName, "active-board", snapshot);
      window.localStorage.removeItem(storageKey);
    } catch {
      reportStorageError();
      return snapshot;
    }
    return snapshot;
  }

  async save(snapshot: BoardSnapshot) {
    if (typeof window !== "undefined") {
      await writeEntry(boardStoreName, "active-board", snapshot);
      reportStorageSynced();
    }
  }
}

class SupabaseStorageAdapter implements StorageAdapter {
  private readonly client = getSupabaseClient();
  private readonly fallback = new BrowserStorageAdapter();

  async load() {
    if (!this.client) return this.fallback.load();
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return this.fallback.load();
      const { data, error } = await this.client.from("palas_boards").select("board_state").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !data?.board_state) return this.fallback.load();
      const snapshot = data.board_state as BoardSnapshot;
      await this.fallback.save(snapshot);
      return snapshot;
    } catch { return this.fallback.load(); }
  }

  async save(snapshot: BoardSnapshot) {
    await this.fallback.save(snapshot);
    if (!this.client) return;
    try {
      const { data: { user } } = await this.client.auth.getUser();
      if (!user) return;
      const { data: board } = await this.client.from("palas_boards").select("id").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      const query = this.client.from("palas_boards");
      const payload = { owner_id: user.id, title: "Bizim hikayemiz", board_state: snapshot, updated_at: new Date().toISOString() };
      if (board?.id) await query.update(payload).eq("id", board.id);
      else await query.insert(payload);
    } catch { return; }
  }
}

let adapter: StorageAdapter | null = null;

export function getStorageAdapter() {
  if (!adapter) adapter = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? new SupabaseStorageAdapter() : new BrowserStorageAdapter();
  return adapter;
}