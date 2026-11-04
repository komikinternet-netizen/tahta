import { create } from "zustand";
import { type Edge, type Node } from "@xyflow/react";
import { getStorageAdapter, reportStorageError } from "@/lib/storage";

export type Biome = "backyard" | "loft" | "night";
export type Weather = "sunny" | "autumn" | "rainy";
export type Locale = "tr" | "en";
export type ActiveTool = "select" | "shovel" | "uv";
export type AppTheme = "light" | "dark";
export type Workspace = { id: string; name: string; emoji: string; nodes: Node<PalasNodeData>[]; edges: Edge[] };
export type PalasNodeData = {
  label: string;
  kind: string;
  body?: string;
  tasks?: { text: string; done: boolean }[];
  plantedAt?: number;
  imageUrl?: string;
  rows?: string[][];
  fileData?: string;
  fileName?: string;
  fileType?: string;
  buriedOriginal?: Omit<PalasNodeData, "buriedOriginal">;
  hanging?: boolean;
  hangOnLine?: string;
  burning?: boolean;
  positionLocked?: boolean;
  unlockForced?: boolean;
  lockedUntil?: number;
};

type PalasState = {
  nodes: Node<PalasNodeData>[];
  edges: Edge[];
  biome: Biome;
  weather: Weather;
  vibe: "memory" | "work";
  theme: AppTheme;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  campfireFocus: boolean;
  activeTool: ActiveTool;
  hydrated: boolean;
  setNodes: (nodes: Node<PalasNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setCanvasCenter: (center: { x: number; y: number }) => void;
  addNode: (kind: string, label: string) => string;
  updateNode: (id: string, update: Partial<PalasNodeData>) => void;
  setBiome: (biome: Biome) => void;
  setWeather: (weather: Weather) => void;
  setVibe: (vibe: "memory" | "work") => void;
  setTheme: (theme: AppTheme) => void;
  switchWorkspace: (id: string) => void;
  addWorkspace: (name: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  removeWorkspace: (id: string) => void;
  restoreWorkspaces: (workspaces: Workspace[], activeWorkspaceId: string) => void;
  toggleCampfireFocus: () => void;
  setActiveTool: (tool: ActiveTool) => void;
  tidyNodes: (mode?: "grid" | "line" | "cluster") => void;
  hydrate: (force?: boolean) => void;
  resetBoard: () => void;
};

const sampleNodes: Node<PalasNodeData>[] = [
  { id: "memory-1", type: "memory", position: { x: 180, y: 126 }, data: { kind: "memory", label: "O gün sahilde kaybolmuştuk", body: "Sonra gün batımını izleyip hiç acele etmemiştik. 🌅" }, draggable: true },
  { id: "polaroid-1", type: "photo", position: { x: 532, y: 103 }, data: { kind: "photo", label: "Ayvalık, yaz 2025", imageUrl: "" }, draggable: true },
  { id: "idea-1", type: "memory", position: { x: 860, y: 163 }, data: { kind: "idea", label: "Birlikte bir seramik atölyesine gidelim", body: "Ellerimiz çamur, aklımız başka yerde. ☕" }, draggable: true },
  { id: "plant-1", type: "plant", position: { x: 248, y: 397 }, data: { kind: "plant", label: "Birlikte büyütelim", tasks: [{ text: "Yeni bir yer keşfet", done: true }, { text: "Pazar kahvesi", done: false }, { text: "Bir mektup yaz", done: false }] }, draggable: true },
  { id: "bottle-1", type: "bottle", position: { x: 642, y: 405 }, data: { kind: "bottle", label: "Sana bir notum var...", body: "Bugün de en sevdiğim yer senin yanın." }, draggable: true },
  { id: "memory-2", type: "capsule", position: { x: 954, y: 418 }, data: { kind: "capsule", label: "Gelecek yaz aç", body: "Bu yazın sonunda kendimize soralım: en çok neye güldük?" }, draggable: true },
];

const cloneNodes = (nodes: Node<PalasNodeData>[]) => nodes.map((node) => ({ ...node, position: { ...node.position }, data: { ...node.data } }));
const defaultWorkspaces: Workspace[] = [
  { id: "our-story", name: "Bizim hikâyemiz", emoji: "🌿", nodes: cloneNodes(sampleNodes), edges: [] },
  { id: "summer-trip", name: "Yaz yolculuğu", emoji: "🗺️", nodes: cloneNodes(sampleNodes.slice(0, 3)).map((node, index) => ({ ...node, id: `summer-${index}`, position: { x: node.position.x + 80, y: node.position.y + 30 }, data: { ...node.data, label: ["Ayvalık'a dönüş", "Deniz kenarı", "Gün batımında dondurma"][index] } })), edges: [] },
  { id: "little-dreams", name: "Küçük hayaller", emoji: "✨", nodes: cloneNodes(sampleNodes.slice(2, 5)).map((node, index) => ({ ...node, id: `dream-${index}`, position: { x: node.position.x + 120, y: node.position.y + 50 } })), edges: [] },
];

let channel: BroadcastChannel | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let storageListenerBound = false;
let canvasCenter = { x: 700, y: 380 };
const storageAdapter = getStorageAdapter();

export const usePalasStore = create<PalasState>((set, get) => {
  const persist = () => {
    if (typeof window === "undefined") return;
    const state = get();
    const workspaces = state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? { ...workspace, nodes: state.nodes, edges: state.edges } : workspace);
    if (workspaces !== state.workspaces) set({ workspaces });
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const { nodes, edges, biome, weather, vibe, theme, workspaces: savedWorkspaces, activeWorkspaceId } = get();
      const snapshot = { nodes, edges, biome, weather, vibe, theme, workspaces: savedWorkspaces, activeWorkspaceId };
      void storageAdapter.save(snapshot).catch(reportStorageError);
      channel?.postMessage(snapshot);
    }, 120);
  };
  return {
    nodes: sampleNodes,
    edges: [],
    biome: "backyard",
    weather: "sunny",
    vibe: "memory",
    theme: "light",
    workspaces: defaultWorkspaces,
    activeWorkspaceId: "our-story",
    campfireFocus: false,
    activeTool: "select",
    hydrated: false,
    setNodes: (nodes) => { set({ nodes }); persist(); },
    setEdges: (edges) => { set({ edges }); persist(); },
    setCanvasCenter: (center) => { canvasCenter = center; },
    addNode: (kind, label) => {
      const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const size = kind === "fence" ? { width: 520, height: 340 }
        : kind === "clothesline" ? { width: 650, height: 170 }
          : kind === "photo" ? { width: 190, height: 210 }
            : kind === "bottle" ? { width: 140, height: 170 }
              : { width: 230, height: 150 };
      const node: Node<PalasNodeData> = {
        id, type: ["photo", "plant", "bottle", "capsule", "vault", "campfire", "coffee", "clothesline", "fence", "file", "invisible", "stamp", "sheet", "napkin"].includes(kind) ? kind : "memory",
        position: { x: canvasCenter.x - size.width / 2 + (Math.random() - .5) * 70, y: canvasCenter.y - size.height / 2 + (Math.random() - .5) * 54 },
        ...(kind === "fence" ? { style: { width: 520, height: 340 } } : {}),
        data: {
          kind,
          label,
          ...(kind === "plant" ? { tasks: [{ text: "İlk küçük adım", done: false }] } : {}),
          ...(kind === "capsule" ? { plantedAt: Date.now() + 86400000 * 7 } : {}),
          ...(kind === "sheet" ? { rows: [["Görev", "Durum"], ["İlk küçük adım", "Bekliyor"]] } : {}),
        },
      };
      set((state) => ({ nodes: [...state.nodes, node] }));
      persist();
      return id;
    },
    updateNode: (id, update) => { set((state) => ({ nodes: state.nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...update } } : node) })); persist(); },
    setBiome: (biome) => { set({ biome }); persist(); },
    setWeather: (weather) => { set({ weather }); persist(); },
    setVibe: (vibe) => { set({ vibe }); persist(); },
    setTheme: (theme) => { set({ theme }); persist(); },
    switchWorkspace: (id) => {
      const state = get();
      const workspaces = state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? { ...workspace, nodes: state.nodes, edges: state.edges } : workspace);
      const target = workspaces.find((workspace) => workspace.id === id);
      if (!target) return;
      set({ workspaces, activeWorkspaceId: id, nodes: target.nodes, edges: target.edges });
      persist();
    },
    addWorkspace: (name) => {
      const state = get();
      const workspaces = state.workspaces.map((workspace) => workspace.id === state.activeWorkspaceId ? { ...workspace, nodes: state.nodes, edges: state.edges } : workspace);
      const id = `palace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const workspace: Workspace = { id, name, emoji: "🏡", nodes: [], edges: [] };
      set({ workspaces: [...workspaces, workspace], activeWorkspaceId: id, nodes: [], edges: [] });
      persist();
      return id;
    },
    renameWorkspace: (id, name) => {
      const nextName = name.trim();
      if (!nextName) return;
      set((state) => ({ workspaces: state.workspaces.map((workspace) => workspace.id === id ? { ...workspace, name: nextName } : workspace) }));
      persist();
    },
    removeWorkspace: (id) => {
      const state = get();
      if (state.workspaces.length <= 1) return;
      const workspaces = state.workspaces.filter((workspace) => workspace.id !== id);
      if (id === state.activeWorkspaceId) {
        const next = workspaces[0];
        set({ workspaces, activeWorkspaceId: next.id, nodes: next.nodes, edges: next.edges });
      } else set({ workspaces });
      persist();
    },
    restoreWorkspaces: (workspaces, activeWorkspaceId) => {
      const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
      if (!active || !workspaces.length) return;
      set({ workspaces, activeWorkspaceId, nodes: active.nodes, edges: active.edges });
      persist();
    },
    toggleCampfireFocus: () => set((state) => ({ campfireFocus: !state.campfireFocus })),
    setActiveTool: (activeTool) => set({ activeTool }),
    resetBoard: () => {
      set({ nodes: cloneNodes(sampleNodes), edges: [], biome: "backyard", weather: "sunny", vibe: "memory", campfireFocus: false, activeTool: "select" });
      persist();
    },
    tidyNodes: (mode = "grid") => {
      set((state) => ({ nodes: state.nodes.map((node, index) => {
        if (mode === "line") return { ...node, position: { x: 100 + index * 270, y: 240 + Math.sin(index * .8) * 65 } };
        if (mode === "cluster") {
          const cluster = node.data.kind === "photo" || node.data.kind === "memory" ? 0 : node.data.kind === "plant" || node.data.kind === "idea" ? 1 : 2;
          const within = state.nodes.slice(0, index).filter((item) => (item.data.kind === "photo" || item.data.kind === "memory" ? 0 : item.data.kind === "plant" || item.data.kind === "idea" ? 1 : 2) === cluster).length;
          return { ...node, position: { x: 105 + cluster * 380 + (within % 2) * 200, y: 125 + Math.floor(within / 2) * 255 } };
        }
        return { ...node, position: { x: 145 + (index % 3) * 340, y: 115 + Math.floor(index / 3) * 300 } };
      }) }));
      persist();
    },
    hydrate: (force = false) => {
      if (typeof window === "undefined" || (get().hydrated && !force)) return;
      void storageAdapter.load().then((saved) => {
        if (saved) {
          const savedData = saved as Partial<PalasState>;
          const workspaces = savedData.workspaces?.length ? savedData.workspaces : defaultWorkspaces.map((workspace) => workspace.id === "our-story" ? { ...workspace, nodes: savedData.nodes ?? workspace.nodes, edges: savedData.edges ?? workspace.edges } : workspace);
          const activeWorkspaceId = workspaces.some((workspace) => workspace.id === savedData.activeWorkspaceId) ? savedData.activeWorkspaceId! : workspaces[0].id;
          const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId)!;
          set({ ...savedData, workspaces, activeWorkspaceId, nodes: active.nodes, edges: active.edges, theme: savedData.theme ?? "light", hydrated: true });
        }
        else {
          const profile = window.localStorage.getItem("palas-profile");
          const workFence: Node<PalasNodeData> = { id: "profile-fence", type: "fence", position: { x: 120, y: 120 }, style: { width: 1060, height: 540 }, data: { kind: "fence", label: "Sprint Hedefleri" } };
          const workNodes: Node<PalasNodeData>[] = [
            workFence,
            { id: "profile-backlog", type: "memory", parentId: workFence.id, extent: "parent", position: { x: 28, y: 72 }, data: { kind: "memory", label: "Backlog", body: "Sıradaki işler" } },
            { id: "profile-doing", type: "memory", parentId: workFence.id, extent: "parent", position: { x: 270, y: 72 }, data: { kind: "memory", label: "Yapılıyor", body: "Üzerinde çalışılanlar" } },
            { id: "profile-test", type: "memory", parentId: workFence.id, extent: "parent", position: { x: 512, y: 72 }, data: { kind: "memory", label: "Test", body: "Gözden geçirilecekler" } },
            { id: "profile-done", type: "memory", parentId: workFence.id, extent: "parent", position: { x: 754, y: 72 }, data: { kind: "memory", label: "Tamamlandı", body: "Biten işler" } },
            { id: "profile-tasks", type: "plant", parentId: workFence.id, extent: "parent", position: { x: 28, y: 285 }, data: { kind: "plant", label: "Görev Listesi", tasks: [{ text: "İlk küçük adım", done: false }, { text: "Gözden geçir", done: false }] } },
            { id: "profile-sheet", type: "sheet", parentId: workFence.id, extent: "parent", position: { x: 280, y: 285 }, data: { kind: "sheet", label: "Sprint Tablosu", rows: [["Görev", "Durum"], ["İlk küçük adım", "Bekliyor"]] } },
            { id: "profile-bonsai", type: "plant", position: { x: 1280, y: 440 }, data: { kind: "plant", label: "Bonsai Hedefleri", tasks: [{ text: "Haftalık hedef", done: false }] } },
          ];
          const coupleNodes: Node<PalasNodeData>[] = [
            { id: "profile-clothesline", type: "clothesline", position: { x: 1180, y: 110 }, data: { kind: "clothesline", label: "Anı İpi" } },
            { id: "profile-vault", type: "vault", position: { x: 1190, y: 360 }, data: { kind: "vault", label: "Anı Sandığı" } },
          ];
          const hybridNodes = [...cloneNodes(sampleNodes), ...coupleNodes, ...workNodes];
          const initialNodes = profile === "work" ? workNodes : profile === "personal" ? cloneNodes(sampleNodes.slice(0, 3)) : profile === "hybrid" ? hybridNodes : [...cloneNodes(sampleNodes), ...coupleNodes];
          const workspaces = defaultWorkspaces.map((workspace) => workspace.id === "our-story" ? { ...workspace, nodes: initialNodes, edges: [] } : workspace);
          const vibe = profile === "work" ? "work" : "memory";
          set({ nodes: initialNodes, edges: [], workspaces, activeWorkspaceId: "our-story", vibe, hydrated: true });
        }
      }).catch(() => { set({ hydrated: true }); reportStorageError(); });
      if ("BroadcastChannel" in window && !channel) {
        channel = new BroadcastChannel("palas-sync");
        channel.onmessage = (event: MessageEvent<Partial<PalasState>>) => set({ ...event.data, hydrated: true });
      }
      if (!storageListenerBound) {
        window.addEventListener("storage", (event) => {
          if (event.key !== "palas-board-v1" || !event.newValue) return;
          try { set({ ...JSON.parse(event.newValue), hydrated: true }); } catch { return; }
        });
        storageListenerBound = true;
      }
    },
  };
});