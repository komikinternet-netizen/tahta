"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine, AudioLines, Bell, BookOpen, Check, ChevronDown, CircleHelp, CloudSun,
  Download, Eye, EyeOff, FileSpreadsheet, FileUp, Flower2, Flame, Globe2, Heart, ImagePlus,
  Languages, Lightbulb, LockKeyhole, LogOut, Mail, MoreHorizontal, Moon, Plus, Search,
  Settings2, Share2, Shovel, Sparkles, Sun, Trees, Upload, UserRound, WandSparkles, Wind, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { type Node } from "@xyflow/react";
import { BoardCanvas, burnNode } from "@/components/BoardCanvas";
import { usePalasStore, type Biome, type Locale, type PalasNodeData, type Weather, type Workspace } from "@/store/usePalasStore";
import { setSoundLevel, startAmbience } from "@/lib/sound";
import { loadSceneBackgrounds, reportStorageError, saveSceneBackground } from "@/lib/storage";
import { getSupabaseClient } from "@/lib/supabase";

const copy = {
  tr: {
    home: "Sığınak", board: "Bizim hikâyemiz", saved: "Az önce kaydedildi", search: "Tahtada ara...",
    memories: "Anılar", ideas: "Fikirler", today: "Bugün", invite: "Davet et", share: "Paylaş",
    add: "Ekle", memory: "Bir anı bırak", idea: "Bir fikir ekle", photo: "Fotoğraf", plant: "Fikir tohumu",
    bottle: "Şişede mesaj", capsule: "Toprak kapsülü", note: "Not", weather: "Hava", biome: "Mekân",
    backyard: "Arka bahçe", loft: "Çatı katı", night: "Gece sarayı", sunny: "Güneşli", autumn: "Sonbahar",
    rainy: "Yağmurlu", love: "Anı modu", work: "Akış modu", assistant: "Saray yardımcısı",
    assistantText: "Fikirlerini buraya bırak. Birlikte büyütelim.", close: "Kapat", guest: "Misafir Gezgin",
    count: "öğe", undo: "Geri al", tidy: "Oto-düzenle", settings: "Ayarlar",
  },
  en: {
    home: "My refuge", board: "Our story", saved: "Saved just now", search: "Search the board...",
    memories: "Memories", ideas: "Ideas", today: "Today", invite: "Invite", share: "Share",
    add: "Add", memory: "Leave a memory", idea: "Add an idea", photo: "Photo", plant: "Idea seed",
    bottle: "Message in a bottle", capsule: "Time capsule", note: "Note", weather: "Weather", biome: "Place",
    backyard: "Backyard", loft: "Warm loft", night: "Night palace", sunny: "Sunny", autumn: "Autumn",
    rainy: "Rainy", love: "Memory mode", work: "Flow mode", assistant: "Palace companion",
    assistantText: "Leave your thoughts here. Let’s grow them together.", close: "Close", guest: "Guest explorer",
    count: "items", undo: "Undo", tidy: "Tidy up", settings: "Settings",
  },
} as const;

type OnboardingProfile = "personal" | "couple" | "work" | "hybrid";

const sceneBackgroundAssets: Record<Biome, string[]> = {
  backyard: ["/backgrounds/cozyBackground.webp", "/backgrounds/cozyBackground.jpg"],
  loft: ["/backgrounds/warmLoft.webp", "/backgrounds/warmLoft.jpg"],
  night: ["/backgrounds/midnightPalace.webp", "/backgrounds/midnightPalace.jpg"],
};

async function findAvailableImage(paths: string[]) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { method: "HEAD" });
      if (response.ok) return path;
    } catch { continue; }
  }
  return undefined;
}

const logoSources = ["/backgrounds/logo.png", "/backgrounds/logo.webp", "/logo.png"];

function MouseInBarkIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 48V25Q4 4 24 4t20 21v23H4Z" fill="#795b43" /><path d="M10 48V27q0-15 14-15t14 15v21H10Z" fill="#40362f" /><circle cx="18" cy="26" r="7" fill="#e6b9b1" /><circle cx="30" cy="26" r="7" fill="#e6b9b1" /><ellipse cx="24" cy="31" rx="12" ry="11" fill="#f1d8bc" /><circle cx="20" cy="30" r="1.5" fill="#584940" /><circle cx="28" cy="30" r="1.5" fill="#584940" /><ellipse cx="24" cy="34" rx="2" ry="1.5" fill="#d88785" /><path d="M5 19q8-2 12 1m26-1q-8-2-12 1" fill="none" stroke="#b68c64" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function PalasLogoMark() {
  const [sourceIndex, setSourceIndex] = useState(0);
  return <span className="brand-mark">{sourceIndex < logoSources.length ? <img src={logoSources[sourceIndex]} alt="" onError={() => setSourceIndex((index) => index + 1)} /> : <MouseInBarkIcon />}</span>;
}

function AuthIntroBackground() {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const sources = ["/backgrounds/intro.webp", "/intro.webp"];
  return sourceIndex < sources.length ? <motion.img key={sources[sourceIndex]} className="auth-intro-image" src={sources[sourceIndex]} alt="" initial={{ scale: 1.015, opacity: .68 }} animate={imageLoaded ? { scale: 1.13, opacity: 1 } : { scale: 1.015, opacity: .68 }} transition={{ scale: { duration: 6, ease: [0.2, 0.65, 0.3, 1] }, opacity: { duration: .8, ease: "easeOut" } }} onLoad={() => setImageLoaded(true)} onError={() => { setImageLoaded(false); setSourceIndex((index) => index + 1); }} /> : null;
}

function GuardianMouse({ covering, peek, eyeOffset }: { covering: boolean; peek: boolean; eyeOffset: number }) {
  return <motion.svg className="guardian-mouse" viewBox="0 0 190 150" role="img" aria-label="Ağaç kovuğundan bakan pastel fare" initial={{ y: 7 }} animate={{ y: [0, -2, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
    <path d="M15 151V91Q15 12 95 12t80 79v60H15Z" fill="#a77d57" stroke="#76563e" strokeWidth="5" />
    <path d="M34 151V96Q34 34 95 34t61 62v55H34Z" fill="#332d2a" stroke="#d0a578" strokeWidth="4" />
    <path d="M22 78q14-5 24-1m98 0q11-4 23 1M22 127q13 5 24 1m98 0q12 4 24-1" fill="none" stroke="#c39566" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="95" cy="111" rx="49" ry="43" fill="#ead2b7" stroke="#b99877" strokeWidth="2" />
    <circle cx="60" cy="83" r="21" fill="#d89091" stroke="#a9666d" strokeWidth="3" /><circle cx="130" cy="83" r="21" fill="#d89091" stroke="#a9666d" strokeWidth="3" />
    <circle cx="60" cy="83" r="12" fill="#f1c7c1" /><circle cx="130" cy="83" r="12" fill="#f1c7c1" />
    <ellipse cx="95" cy="101" rx="40" ry="35" fill="#f5dfc8" stroke="#b99877" strokeWidth="2" />
    <ellipse cx="78" cy="101" rx="5" ry="7" fill="#51463f" /><ellipse cx="112" cy="101" rx="5" ry="7" fill="#51463f" />
    <circle cx={79 + eyeOffset} cy="99" r="1.7" fill="#fff" /><circle cx={113 + eyeOffset} cy="99" r="1.7" fill="#fff" />
    <ellipse cx="95" cy="116" rx="5" ry="3.5" fill="#d88183" />
    <path d="M95 119q-4 7-10 3m10-3q4 7 10 3M56 116l-25-3m25 8-27 4m108-9 25-3m-25 8 27 4" fill="none" stroke="#a88b75" strokeWidth="1.8" strokeLinecap="round" />
    <motion.path d="M59 128q8-18 20-10l13 15q-8 12-21 7-9-3-12-12Z" fill="#ead2b7" stroke="#b99877" strokeWidth="2" animate={{ x: covering ? 0 : peek ? -8 : -3, y: covering ? -38 : peek ? -30 : 0, rotate: covering ? 0 : peek ? -18 : -12 }} transition={{ type: "spring", stiffness: 190, damping: 16 }} style={{ transformOrigin: "78px 132px" }} />
    <motion.path d="M131 128q-8-18-20-10l-13 15q8 12 21 7 9-3 12-12Z" fill="#ead2b7" stroke="#b99877" strokeWidth="2" animate={{ x: covering ? 0 : peek ? 15 : 3, y: covering ? -38 : peek ? -12 : 0, rotate: covering ? 0 : -12 }} transition={{ type: "spring", stiffness: 190, damping: 16 }} style={{ transformOrigin: "112px 132px" }} />
    <ellipse cx="95" cy="145" rx="33" ry="5" fill="#d1a878" />
  </motion.svg>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("tr");
  const [authReady, setAuthReady] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stampDrawerOpen, setStampDrawerOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [ambientOn, setAmbientOn] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [tidyMenu, setTidyMenu] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(true);
  const [inboxText, setInboxText] = useState("");
  const [inboxMessages, setInboxMessages] = useState(["Bugün bunu görünce seni düşündüm. 🌼"]);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile>("couple");
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const newWorkspaceNameRef = useRef<HTMLInputElement>(null);
  const [newWorkspaceBiome, setNewWorkspaceBiome] = useState<Biome>("backyard");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<"tools" | "shortcuts">("tools");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityUnread, setActivityUnread] = useState(false);
  const [activities, setActivities] = useState<{ id: string; text: string; at: number }[]>([]);
  const [sceneBackgrounds, setSceneBackgrounds] = useState<Partial<Record<Biome, string>>>({});
  const [storageToast, setStorageToast] = useState("");
  const sceneUploadRefs = useRef<Partial<Record<Biome, HTMLInputElement | null>>>({});
  const sceneObjectUrls = useRef<string[]>([]);
  const observedNodes = useRef<Node<PalasNodeData>[] | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authCursor, setAuthCursor] = useState(0);
  const [authPassword, setAuthPassword] = useState("");
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [guestName, setGuestName] = useState("S");
  const [userEmail, setUserEmail] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [topUserMenuOpen, setTopUserMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"home" | "memories" | "ideas">("home");
  const [workspaceMenuId, setWorkspaceMenuId] = useState<string | null>(null);
  const [focusNodeIds, setFocusNodeIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundLevel, setVolume] = useState(.7);
  const [backupMessage, setBackupMessage] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);
  const { biome, weather, vibe, theme, setTheme, setBiome, setWeather, setVibe, nodes, edges, addNode, tidyNodes, setNodes, setEdges, resetBoard, workspaces, activeWorkspaceId, switchWorkspace, addWorkspace, renameWorkspace, removeWorkspace, restoreWorkspaces } = usePalasStore();
  const hydrated = usePalasStore((state) => state.hydrated);
  const t = copy[locale];
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];
  const workspaceLabel = (workspace: (typeof workspaces)[number]) => {
    const defaults: Record<string, [string, string]> = { "our-story": ["Bizim hikâyemiz", "Our story"], "summer-trip": ["Yaz yolculuğu", "Summer trip"], "little-dreams": ["Küçük hayaller", "Little dreams"] };
    const defaultNames = defaults[workspace.id];
    if (defaultNames?.includes(workspace.name)) return locale === "tr" ? defaultNames[0] : defaultNames[1];
    return workspace.name;
  };
  const workspaceTitle = activeWorkspace ? workspaceLabel(activeWorkspace) : t.board;

  useEffect(() => {
    let active = true;
    usePalasStore.getState().hydrate();
    const storedSession = localStorage.getItem("palas-session");
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession) as { name?: string; email?: string; guest?: boolean };
        setGuestName(session.name || "Misafir");
        setUserEmail(session.email ?? "");
        setAccessGranted(true);
      } catch { localStorage.removeItem("palas-session"); }
    }
    const client = getSupabaseClient();
    if (!client) { setAuthReady(true); return () => { active = false; }; }
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        const email = data.session.user.email ?? "";
        setGuestName(String(data.session.user.user_metadata?.display_name || email.slice(0, 1).toUpperCase() || "S"));
        setUserEmail(email);
        setAccessGranted(true);
      }
      setAuthReady(true);
    }).catch(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => sceneObjectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    if (!ambientOn) return;
    return startAmbience(weather === "rainy" ? "rain" : weather === "autumn" ? "fire" : "warm");
  }, [ambientOn, weather]);

  useEffect(() => {
    if (!newWorkspaceOpen) return;
    const frame = window.requestAnimationFrame(() => newWorkspaceNameRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [newWorkspaceOpen]);

  useEffect(() => {
    const showStorageToast = () => setStorageToast(locale === "tr" ? "Kaydetme sırasında sorun oluştu. Depolama alanını ve izinleri kontrol et." : "Saving failed. Check browser storage and permissions.");
    const showStorageSynced = () => {
      const now = Date.now();
      setActivities((current) => [{ id: `storage-${now}`, text: locale === "tr" ? "Depolama senkronize edildi" : "Storage synchronized", at: now }, ...current].slice(0, 10));
      setActivityUnread(true);
    };
    window.addEventListener("palas-storage-error", showStorageToast);
    window.addEventListener("palas-storage-synced", showStorageSynced);
    return () => {
      window.removeEventListener("palas-storage-error", showStorageToast);
      window.removeEventListener("palas-storage-synced", showStorageSynced);
    };
  }, [locale]);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    void loadSceneBackgrounds().then(async (saved) => {
      const entries = await Promise.all((Object.entries(sceneBackgroundAssets) as [Biome, string[]][]).map(async ([biome, paths]) => {
        const stored = saved[biome];
        if (stored) {
          const url = URL.createObjectURL(stored);
          objectUrls.push(url);
          return [biome, url] as const;
        }
        return [biome, await findAvailableImage(paths)] as const;
      }));
      if (active) setSceneBackgrounds(Object.fromEntries(entries.filter((entry): entry is readonly [Biome, string] => Boolean(entry[1]))));
    }).catch(reportStorageError);
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const saveSceneImage = async (target: Biome, file?: File) => {
    if (!file) return;
    if (!/\.(webp|jpe?g)$/i.test(file.name) && !["image/webp", "image/jpeg"].includes(file.type)) {
      setStorageToast(locale === "tr" ? "Yalnızca WebP veya JPG görseli seçebilirsin." : "Choose a WebP or JPG image.");
      return;
    }
    try {
      await saveSceneBackground(target, file);
      const url = URL.createObjectURL(file);
      const previous = sceneBackgrounds[target];
      if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
      sceneObjectUrls.current.push(url);
      setSceneBackgrounds((current) => ({ ...current, [target]: url }));
      setBackupMessage(locale === "tr" ? "Arka plan kaydedildi ve sahneye uygulandı." : "Background saved and applied.");
    } catch { reportStorageError(); }
  };

  useEffect(() => {
    if (!hydrated) return;
    const previousNodes = observedNodes.current;
    observedNodes.current = nodes;
    if (!previousNodes) return;
    const newNodes = nodes.filter((node) => !previousNodes.some((previous) => previous.id === node.id));
    const events = newNodes.map((node) => {
      const labels: Record<string, [string, string]> = {
        clothesline: ["Yeni bir Anı İpi kuruldu", "A new memory line was added"],
        fence: ["Yeni bir Çit Alanı açıldı", "A new Fence Area was opened"],
        capsule: ["Yeni bir Toprak Kapsülü oluşturuldu", "A new time capsule was created"],
        plant: ["Bonsai filizlendi", "A bonsai sprouted"],
        sheet: ["Yeni bir CSV tablosu eklendi", "A new CSV table was added"],
        photo: ["Panoya yeni bir fotoğraf eklendi", "A new photo was added to the board"],
      };
      const label = labels[node.data.kind] ?? ["Panoya yeni bir an eklendi", "A new memory was added to the board"];
      return { id: `${node.id}-${Date.now()}`, text: locale === "tr" ? label[0] : label[1], at: Date.now() };
    });
    const newlyHung = nodes.filter((node) => node.data.hangOnLine && !previousNodes.find((previous) => previous.id === node.id)?.data.hangOnLine)
      .map((node) => ({ id: `hung-${node.id}-${Date.now()}`, text: locale === "tr" ? "Yeni bir anı ipe asıldı" : "A new memory was hung", at: Date.now() }));
    const updates = [...newlyHung, ...events];
    if (updates.length) {
      setActivities((current) => [...updates, ...current].slice(0, 10));
      setActivityUnread(true);
    }
  }, [nodes, hydrated, locale]);

  useEffect(() => {
    const closeOverlays = () => {
      setNewWorkspaceOpen(false);
      setProfileOpen(false);
      setSettingsOpen(false);
      setAssistantOpen(false);
      setGuideOpen(false);
      setActivityOpen(false);
      setMenuOpen(false);
      usePalasStore.getState().setActiveTool("select");
    };
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlays();
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const state = usePalasStore.getState();
      if (key === "v") { closeOverlays(); return; }
      if (key === "n" || key === "p" || key === "f" || key === "c") {
        const presets: Record<string, [string, string]> = {
          n: ["note", locale === "tr" ? "Yeni bir not" : "A new note"],
          p: ["photo", locale === "tr" ? "Yeni bir polaroid" : "A new polaroid"],
          f: ["fence", locale === "tr" ? "Yeni bir Çit Alanı" : "A new Fence Area"],
          c: ["clothesline", locale === "tr" ? "Yeni bir Anı İpi" : "A new memory line"],
        };
        state.addNode(...presets[key]);
        setActiveSection("home");
        event.preventDefault();
        return;
      }
      if (key === "s" || key === "u") {
        const tool = key === "s" ? "shovel" : "uv";
        state.setActiveTool(state.activeTool === tool ? "select" : tool);
        event.preventDefault();
        return;
      }
      if (key === "l") {
        const selected = state.nodes.find((node) => node.selected);
        if (!selected) return;
        const locked = !selected.data.positionLocked;
        state.setNodes(state.nodes.map((node) => node.id === selected.id ? { ...node, draggable: !locked, data: { ...node.data, positionLocked: locked } } : node));
        event.preventDefault();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const selected = state.nodes.filter((node) => node.selected);
        if (!selected.length) return;
        event.preventDefault();
        selected.forEach((node) => burnNode(node.id));
        return;
      }
      if (key === "m") { state.setVibe(state.vibe === "memory" ? "work" : "memory"); return; }
      if (key === "d") { state.setTheme(state.theme === "dark" ? "light" : "dark"); return; }
      if (event.key === "?" || key === "h") { setGuideTab("tools"); setGuideOpen((open) => !open); event.preventDefault(); }
    };
    window.addEventListener("keydown", handleGlobalKeydown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeydown, true);
  }, [locale]);

  const addKind = (kind: string, labelOverride?: string) => {
    const labels: Record<string, string> = {
      note: t.memory, idea: locale === "tr" ? "Birlikte yapalım" : "Let’s do this together",
      photo: locale === "tr" ? "Güzel bir gün" : "A lovely day", plant: locale === "tr" ? "Küçük hedefler" : "Little goals",
      bottle: locale === "tr" ? "Sana bir notum var..." : "A note for you...", capsule: locale === "tr" ? "Toprak kapsülü" : "Open on this day",
      vault: locale === "tr" ? "Küçük sığınağımız" : "Our little safe", file: locale === "tr" ? "Bir dosya" : "A file",
      sheet: locale === "tr" ? "Küçük planımız" : "Our little plan", campfire: locale === "tr" ? "Kamp ateşi" : "Campfire",
      coffee: locale === "tr" ? "Kahve molası" : "Coffee break", clothesline: locale === "tr" ? "Anı İpi" : "Memory line",
      fence: locale === "tr" ? "Çit Alanı" : "Fence Area",
      invisible: locale === "tr" ? "Gizli bir not" : "A secret note", stamp: locale === "tr" ? "SENİ SEVİYORUM" : "WITH LOVE",
      napkin: locale === "tr" ? "Kafe peçetesi" : "Cafe napkin",
    };
    const id = addNode(kind, labelOverride ?? labels[kind] ?? t.note);
    setMenuOpen(false);
    return id;
  };

  const exportSnapshot = async (format: "png" | "pdf") => {
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;
    setExportBusy(true);
    try {
      const source = await toPng(viewport, { pixelRatio: 2, cacheBust: true, backgroundColor: biome === "night" ? "#253332" : "#f2f3e7" });
      const image = new Image();
      image.src = source;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Snapshot image could not be opened")); });
      const framed = document.createElement("canvas");
      framed.width = image.width + 84;
      framed.height = image.height + 168;
      const context = framed.getContext("2d");
      if (!context) return;
      context.fillStyle = "#fffdf5";
      context.fillRect(0, 0, framed.width, framed.height);
      context.drawImage(image, 34, 30, image.width + 16, image.height + 16);
      context.fillStyle = "#53634e";
      context.textAlign = "center";
      context.font = "italic 28px Georgia";
      context.fillText("Bizim hikâyemiz", framed.width / 2, framed.height - 50);
      context.font = "12px sans-serif";
      context.fillStyle = "#a09986";
      context.fillText(new Date().toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US"), framed.width / 2, framed.height - 25);
      const framedUrl = framed.toDataURL("image/png");
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `palas-${Date.now()}.png`;
        link.href = framedUrl;
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: framed.width > framed.height ? "landscape" : "portrait", unit: "px", format: [framed.width, framed.height] });
        pdf.addImage(framedUrl, "PNG", 0, 0, framed.width, framed.height);
        pdf.save(`palas-${Date.now()}.pdf`);
      }
    } finally { setExportBusy(false); setExportMenu(false); }
  };

  const createMindMap = () => {
    const topic = assistantText.trim();
    if (!topic) return;
    const labels = locale === "tr"
      ? [topic, "İlk küçük adım", "Birlikte keşfet", "Tarih belirle", "Gerekli olanlar", "Kutlayacağımız an"]
      : [topic, "First little step", "Explore together", "Pick a date", "What we need", "A moment to celebrate"];
    const maxRight = Math.max(0, ...nodes.map((node) => node.position.x + (node.measured?.width ?? 240)));
    const maxBottom = Math.max(0, ...nodes.map((node) => node.position.y + (node.measured?.height ?? 170)));
    const originX = Math.ceil((maxRight + 360) / 340) * 340;
    const originY = Math.ceil((maxBottom + 120) / 250) * 250;
    const ids = labels.map((label, index) => addNode(index ? "idea" : "note", label));
    const store = usePalasStore.getState();
    const positions = [
      { x: originX + 340, y: originY },
      { x: originX, y: originY + 250 },
      { x: originX + 340, y: originY + 250 },
      { x: originX + 680, y: originY + 250 },
      { x: originX + 170, y: originY + 500 },
      { x: originX + 510, y: originY + 500 },
    ];
    store.setNodes(store.nodes.map((node) => {
      const index = ids.indexOf(node.id);
      if (index < 0) return node;
      return { ...node, position: positions[index] };
    }));
    store.setEdges([...store.edges,
      ...[1, 2, 3].map((target) => ({ id: `mind-${ids[0]}-${target}`, source: ids[0], target: ids[target], type: "smoothstep", animated: true, style: { stroke: "#879778", strokeWidth: 2 } })),
      { id: `mind-${ids[1]}-${ids[4]}`, source: ids[1], target: ids[4], type: "smoothstep", animated: true, style: { stroke: "#879778", strokeWidth: 2 } },
      { id: `mind-${ids[3]}-${ids[5]}`, source: ids[3], target: ids[5], type: "smoothstep", animated: true, style: { stroke: "#879778", strokeWidth: 2 } },
    ]);
    setFocusNodeIds(ids);
    setActiveSection("home");
    setAssistantText("");
    setAssistantOpen(false);
  };

  const summarizeBoard = () => {
    const summary = nodes.filter((node) => node.data.kind === "memory" || node.data.kind === "idea").slice(0, 8).map((node) => `• ${node.data.label}`).join("\n");
    const id = addNode("note", `${locale === "tr" ? "Tahtamızdan küçük bir özet" : "A little board summary"}\n${summary || (locale === "tr" ? "Henüz anı yok." : "No memories yet.")}`);
    const maxRight = Math.max(0, ...nodes.map((node) => node.position.x + (node.measured?.width ?? 240)));
    const maxBottom = Math.max(0, ...nodes.map((node) => node.position.y + (node.measured?.height ?? 170)));
    const state = usePalasStore.getState();
    state.setNodes(state.nodes.map((node) => node.id === id ? { ...node, position: { x: Math.ceil((maxRight + 360) / 340) * 340, y: Math.ceil((maxBottom + 120) / 250) * 250 } } : node));
    setFocusNodeIds([id]);
    setActiveSection("home");
    setAssistantOpen(false);
  };

  const createTemplate = (type: "memory" | "work") => {
    const labels = type === "memory"
      ? ["Hayallerimiz", "Planlananlar", "Unutulmaz anılar", "Birlikte büyütelim", "Gelecek yaza aç", "Anı ipimiz"]
      : ["Backlog", "Yapılıyor", "Test", "Tamamlandı", "Sprint yol haritası", "CSV görev tablosu"];
    const kinds = type === "memory"
      ? ["memory", "memory", "memory", "plant", "capsule", "clothesline"]
      : ["memory", "memory", "memory", "memory", "idea", "sheet"];
    const ids = labels.map((label, index) => addNode(kinds[index], label));
    const store = usePalasStore.getState();
    store.setVibe(type);
    store.setNodes(store.nodes.map((node) => {
      const index = ids.indexOf(node.id);
      if (index < 0) return node;
      return { ...node, position: { x: 120 + (index % 3) * 330, y: 120 + Math.floor(index / 3) * 310 } };
    }));
    store.setEdges([...store.edges, ...ids.slice(0, 3).map((id, index) => ({ id: `template-${type}-${id}`, source: id, target: ids[index + 1], type: "smoothstep", style: { stroke: "#879778", strokeWidth: 2 } }))]);
    setMenuOpen(false);
  };

  const receiveFile = (file: File) => {
    const id = addNode("file", file.name);
    const reader = new FileReader();
    reader.onload = () => usePalasStore.getState().updateNode(id, { fileData: String(reader.result), fileName: file.name, fileType: file.type || "application/octet-stream" });
    reader.readAsDataURL(file);
    setInboxOpen(false);
  };

  const downloadBackup = () => {
    const snapshot = usePalasStore.getState();
    const savedWorkspaces = snapshot.workspaces.map((workspace) => workspace.id === snapshot.activeWorkspaceId ? { ...workspace, nodes: snapshot.nodes, edges: snapshot.edges } : workspace);
    const backup = { version: 2, nodes: snapshot.nodes, edges: snapshot.edges, workspaces: savedWorkspaces, activeWorkspaceId: snapshot.activeWorkspaceId, biome: snapshot.biome, weather: snapshot.weather, vibe: snapshot.vibe, theme: snapshot.theme, createdAt: new Date().toISOString() };
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    link.href = url;
    link.download = `palas-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupMessage(locale === "tr" ? "Yedek indirildi." : "Backup downloaded.");
  };

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup: unknown = JSON.parse(await file.text());
      if (typeof backup !== "object" || backup === null || !("nodes" in backup) || !Array.isArray(backup.nodes) || !("edges" in backup) || !Array.isArray(backup.edges)) throw new Error("invalid");
      const candidate = backup as { nodes: typeof nodes; edges: typeof edges; workspaces?: Workspace[]; activeWorkspaceId?: string; biome?: Biome; weather?: Weather; vibe?: "memory" | "work"; theme?: "light" | "dark" };
      const validNodes = (items: typeof nodes) => items.every((node) => typeof node.id === "string" && node.position && typeof node.data?.label === "string");
      if (!validNodes(candidate.nodes)) throw new Error("invalid");
      if (candidate.workspaces && (!candidate.workspaces.length || !candidate.workspaces.every((workspace) => typeof workspace.id === "string" && typeof workspace.name === "string" && Array.isArray(workspace.nodes) && Array.isArray(workspace.edges) && validNodes(workspace.nodes)))) throw new Error("invalid");
      const current = usePalasStore.getState();
      const restoredWorkspaces = candidate.workspaces?.length
        ? candidate.workspaces
        : current.workspaces.map((workspace) => workspace.id === current.activeWorkspaceId ? { ...workspace, nodes: candidate.nodes, edges: candidate.edges } : workspace);
      const restoredActiveId = restoredWorkspaces.some((workspace) => workspace.id === candidate.activeWorkspaceId) ? candidate.activeWorkspaceId! : current.activeWorkspaceId;
      restoreWorkspaces(restoredWorkspaces, restoredActiveId);
      if (candidate.biome && ["backyard", "loft", "night"].includes(candidate.biome)) setBiome(candidate.biome);
      if (candidate.weather && ["sunny", "autumn", "rainy"].includes(candidate.weather)) setWeather(candidate.weather);
      if (candidate.vibe && ["memory", "work"].includes(candidate.vibe)) setVibe(candidate.vibe);
      if (candidate.theme && ["light", "dark"].includes(candidate.theme)) setTheme(candidate.theme);
      setBackupMessage(locale === "tr" ? "Yedek panoya yüklendi." : "Backup restored to the board.");
    } catch { setBackupMessage(locale === "tr" ? "Bu JSON yedeği geçerli değil." : "This JSON backup is invalid."); }
  };

  const createWorkspace = () => {
    setNewWorkspaceName("");
    setNewWorkspaceBiome(biome);
    setNewWorkspaceOpen(true);
  };

  const submitNewWorkspace = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) return;
    addWorkspace(name);
    setBiome(newWorkspaceBiome);
    setActiveSection("home");
    setNewWorkspaceOpen(false);
    const now = Date.now();
    setActivities((current) => [{ id: `palace-${now}`, text: locale === "tr" ? `“${name}” sarayı oluşturuldu` : `Palace “${name}” was created`, at: now }, ...current].slice(0, 10));
    setActivityUnread(true);
  };

  const tryGuideTool = (tool: string) => {
    const state = usePalasStore.getState();
    const examples: Record<string, [string, string]> = {
      clothesline: ["clothesline", locale === "tr" ? "Anı İpi" : "Memory line"],
      capsule: ["capsule", locale === "tr" ? "Toprak Kapsülü" : "Time capsule"],
      fence: ["fence", locale === "tr" ? "Çit Alanı" : "Fence Area"],
      vault: ["vault", locale === "tr" ? "Anı Sandığı" : "Memory safe"],
      campfire: ["campfire", locale === "tr" ? "Kamp ateşi" : "Campfire"],
      bonsai: ["plant", locale === "tr" ? "Bonsai Hedefi" : "Bonsai goal"],
    };
    if (tool === "shovel") state.setActiveTool(state.activeTool === "shovel" ? "select" : "shovel");
    else if (tool === "uv") {
      state.addNode("invisible", locale === "tr" ? "UV ile görünecek gizli not" : "A note revealed by UV light");
      state.setActiveTool("uv");
    } else if (examples[tool]) state.addNode(...examples[tool]);
    setActiveSection("home");
    setGuideOpen(false);
  };

  const signOut = async () => {
    await getSupabaseClient()?.auth.signOut();
    localStorage.removeItem("palas-session");
    setAccessGranted(false);
    setUserMenuOpen(false);
    setTopUserMenuOpen(false);
    setAuthPassword("");
    setUserEmail("");
  };

  const returnToGuest = async () => {
    await getSupabaseClient()?.auth.signOut();
    localStorage.setItem("palas-session", JSON.stringify({ name: "Misafir", guest: true }));
    setGuestName("Misafir");
    setUserEmail("");
    setTopUserMenuOpen(false);
    usePalasStore.getState().hydrate(true);
  };

  const openProfileEditor = () => {
    setProfileName(guestName === "S" ? "" : guestName);
    setProfileEmail(userEmail);
    setProfilePassword("");
    setProfileMessage("");
    setProfileOpen(true);
    setTopUserMenuOpen(false);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = profileName.trim();
    const email = profileEmail.trim();
    if (!name || (guestName !== "Misafir" && !email)) { setProfileMessage(locale === "tr" ? "Ad ve e-posta alanlarını doldur." : "Name and email are required."); return; }
    const client = getSupabaseClient();
    if (profilePassword && (!client || guestName === "Misafir")) {
      setProfileMessage(locale === "tr" ? "Şifre değişikliği için bağlı bir hesapla giriş yapmalısın." : "Sign in to a connected account to change its password.");
      return;
    }
    if (client && guestName !== "Misafir") {
      setAuthBusy(true);
      const { error } = await client.auth.updateUser({ email: email !== userEmail ? email : undefined, password: profilePassword || undefined, data: { display_name: name } });
      setAuthBusy(false);
      if (error) { setProfileMessage(error.message); return; }
    }
    const previous = localStorage.getItem("palas-session");
    let session: { name?: string; email?: string; guest?: boolean } = {};
    if (previous) { try { session = JSON.parse(previous) as typeof session; } catch { session = {}; } }
    localStorage.setItem("palas-session", JSON.stringify({ ...session, name, email }));
    setGuestName(name);
    setUserEmail(email);
    setProfileOpen(false);
    const now = Date.now();
    setActivities((current) => [{ id: `profile-${now}`, text: locale === "tr" ? "Profil bilgileri güncellendi" : "Profile details were updated", at: now }, ...current].slice(0, 10));
    setActivityUnread(true);
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!authName.trim() || !authEmail.trim()) { setAuthMessage(locale === "tr" ? "Adını ve e-posta adresini gir." : "Enter your name and email."); return; }
    const displayName = authName.trim() || authEmail.split("@")[0];
    if (!client) {
      localStorage.setItem("palas-profile", onboardingProfile);
      localStorage.setItem("palas-session", JSON.stringify({ name: displayName, email: authEmail, guest: false }));
      setGuestName(displayName);
      setUserEmail(authEmail);
      setAccessGranted(true);
      usePalasStore.getState().hydrate(true);
      return;
    }
    setAuthBusy(true);
    const result = authMode === "login"
      ? await client.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await client.auth.signUp({ email: authEmail, password: authPassword });
    setAuthBusy(false);
    if (result.error) { setAuthMessage(result.error.message); return; }
    if (authMode === "register" && !result.data.session) {
      setAuthMessage(locale === "tr" ? "Hesabını doğrulamak için e-postanı kontrol et." : "Check your email to confirm your account.");
      return;
    }
    localStorage.setItem("palas-profile", onboardingProfile);
    localStorage.setItem("palas-session", JSON.stringify({ name: displayName, email: authEmail, guest: false }));
    setGuestName(displayName);
    setUserEmail(authEmail);
    setAuthMessage(authMode === "login" ? (locale === "tr" ? "Sarayına hoş geldin." : "Welcome back to your palace.") : (locale === "tr" ? "Hesabını doğrulamak için e-postanı kontrol et." : "Check your email to confirm your account."));
    setAccessGranted(true);
    usePalasStore.getState().hydrate(true);
  };

  if (!authReady) return <main className={`auth-gate-page theme-${theme}`}><AuthIntroBackground /><div className="gate-loading"><PalasLogoMark /><b>palas<span>.</span></b></div></main>;

  if (!accessGranted) return <main className={`auth-gate-page theme-${theme}`}>
    <AuthIntroBackground />
    <button className="gate-theme-toggle" aria-label={theme === "dark" ? "Açık tema" : "Karanlık tema"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
    <motion.section className="auth-modal gate-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
      <a className="gate-brand" href="#palas"><PalasLogoMark /><span>palas<span className="brand-period">.</span><small>{locale === "tr" ? "SICACIK ZİHİN SARAYIN" : "YOUR COZY MIND PALACE"}</small></span></a>
      <div className="gate-arch"><GuardianMouse covering={passwordFocus && !showPassword} peek={passwordFocus && showPassword} eyeOffset={Math.max(-5, Math.min(5, Math.round((authCursor / Math.max(authEmail.length, 1) - .5) * 10)))} /></div>
      <div className="eyebrow">PALAS'A HOŞ GELDİN</div><h2>{authMode === "login" ? (locale === "tr" ? "Sarayına adım at" : "Step into your palace") : (locale === "tr" ? "Kendi sarayını kur" : "Make a palace of your own")}</h2>
      <p>{locale === "tr" ? "Anıların ve hayallerin seni bekliyor." : "Your memories and dreams are waiting."}</p>
      <fieldset className="profile-picker"><legend>{locale === "tr" ? "Bu sarayı nasıl kullanacaksın?" : "How will you use this palace?"}</legend>
        {([
          ["personal", locale === "tr" ? "Kişisel / Sığınak" : "Personal / Sanctuary", locale === "tr" ? "Düşünceler ve günlük" : "Thoughts and journal", <Heart size={15} />],
          ["couple", locale === "tr" ? "İlişki / Çift" : "Couple / Memories", locale === "tr" ? "Anılar ve zaman kapsülü" : "Memories and time capsules", <Flower2 size={15} />],
          ["work", locale === "tr" ? "İş / Takım" : "Work / Team", locale === "tr" ? "Çitler ve hedef takibi" : "Fences and goal tracking", <Wind size={15} />],
          ["hybrid", locale === "tr" ? "Karma Saray" : "Hybrid Palace", locale === "tr" ? "Bütün modüller bir arada" : "Every module together", <Sparkles size={15} />],
        ] as [OnboardingProfile, string, string, React.ReactNode][]).map(([id, title, description, icon]) => <button key={id} type="button" className={`profile-option ${onboardingProfile === id ? "profile-chosen" : ""}`} aria-pressed={onboardingProfile === id} onClick={() => setOnboardingProfile(id)}><span>{icon}</span><b>{title}</b><small>{description}</small></button>)}
      </fieldset>
      <form className="auth-form" onSubmit={submitAuth}>
        <label>{locale === "tr" ? "Adın" : "Your name"}<input autoComplete="name" required value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder={locale === "tr" ? "Sana nasıl seslenelim?" : "What should we call you?"} /></label>
        <label>{locale === "tr" ? "E-posta" : "Email"}<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => { setAuthEmail(event.target.value); setAuthCursor(event.currentTarget.selectionStart ?? event.target.value.length); }} onSelect={(event) => setAuthCursor(event.currentTarget.selectionStart ?? 0)} onFocus={() => setPasswordFocus(false)} placeholder="sen@ornek.com" /></label>
        <label>{locale === "tr" ? "Şifre" : "Password"}<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={6} required={Boolean(getSupabaseClient())} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} onFocus={() => setPasswordFocus(true)} onBlur={() => setPasswordFocus(false)} placeholder={getSupabaseClient() ? "••••••••" : (locale === "tr" ? "Yerel demo için isteğe bağlı" : "Optional in local demo")} /><button type="button" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
        <button className="auth-submit" disabled={authBusy}>{authBusy ? (locale === "tr" ? "Bekle..." : "Please wait...") : authMode === "login" ? (locale === "tr" ? "Giriş yap" : "Sign in") : (locale === "tr" ? "Hesap oluştur" : "Create account")}</button>
        {authMessage && <div className="auth-message" role="status">{authMessage}</div>}
      </form>
      <button className="auth-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthMessage(""); }}>{authMode === "login" ? (locale === "tr" ? "İlk kez mi buradasın? Hesap oluştur" : "New here? Create an account") : (locale === "tr" ? "Zaten hesabın var mı? Giriş yap" : "Already have an account? Sign in")}</button>
      <div className="auth-or"><span />{locale === "tr" ? "ya da" : "or"}<span /></div>
      <button className="guest-entry" onClick={() => { localStorage.setItem("palas-profile", onboardingProfile); localStorage.setItem("palas-session", JSON.stringify({ name: "Misafir", guest: true })); setGuestName("Misafir"); setAccessGranted(true); usePalasStore.getState().hydrate(true); }}>{locale === "tr" ? "✨ Misafir Gezgin olarak keşfet" : "✨ Explore as a guest"}</button>
    </motion.section>
    <button className="gate-language-toggle" onClick={() => setLocale(locale === "tr" ? "en" : "tr")}>{locale === "tr" ? "English" : "Türkçe"}</button>
  </main>;

  return (
    <main className={`palas-app vibe-${vibe} biome-${biome} weather-${weather} theme-${theme}`}>
      <AnimatePresence>{storageToast && <motion.div className="storage-toast" role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}><CircleHelp size={16} /><span>{storageToast}</span><button aria-label={t.close} onClick={() => setStorageToast("")}><X size={14} /></button></motion.div>}</AnimatePresence>
      <aside className="sidebar">
        <a className="brand" href="#board" aria-label="PALAS ana sayfa">
          <PalasLogoMark />
          <span>palas<span className="brand-period">.</span><small>{locale === "tr" ? "SICACIK ZİHİN SARAYIN" : "YOUR COZY MIND PALACE"}</small></span>
        </a>
        <div className="user-menu-wrap"><button className="workspace-switch" onClick={() => setUserMenuOpen(!userMenuOpen)}><span className="avatar avatar-you">{guestName.slice(0, 1).toUpperCase()}</span><span><b>{guestName === "Misafir" ? (locale === "tr" ? "Misafir Gezgin" : "Guest explorer") : guestName}</b><small>{guestName === "Misafir" ? t.guest : (locale === "tr" ? "Sığınaktasın" : "In your refuge")}</small></span><ChevronDown size={15} /></button>{userMenuOpen && <div className="user-menu"><button onClick={() => void signOut()}><LogOut size={14} />{locale === "tr" ? "Çıkış yap" : "Sign out"}</button></div>}</div>
        <nav className="side-nav" aria-label="Ana gezinme">
          <button className={`nav-item ${activeSection === "home" ? "active" : ""}`} onClick={() => setActiveSection("home")}><Heart size={17} />{t.home}<span className="nav-dot" /></button>
          <button className={`nav-item ${activeSection === "memories" ? "active" : ""}`} onClick={() => setActiveSection("memories")}><Flower2 size={17} />{t.memories}<span className="nav-count">{nodes.filter((node) => ["memory", "photo", "bottle", "capsule", "napkin"].includes(node.data.kind)).length}</span></button>
          <button className={`nav-item ${activeSection === "ideas" ? "active" : ""}`} onClick={() => setActiveSection("ideas")}><Lightbulb size={17} />{t.ideas}</button>
        </nav>
        <div className="side-label">{locale === "tr" ? "ÇALIŞMA ALANLARI" : "WORKSPACES"}<button aria-label={locale === "tr" ? "Çalışma alanı ekle" : "Add workspace"} onClick={createWorkspace}><Plus size={14} /></button></div>
        <div className="workspace-list">{workspaces.map((workspace) => <div className={`workspace-row ${workspace.id === activeWorkspaceId ? "row-selected" : ""}`} key={workspace.id}>
          <button className={`board-link ${workspace.id === activeWorkspaceId ? "selected" : ""}`} onClick={() => { switchWorkspace(workspace.id); setActiveSection("home"); setWorkspaceMenuId(null); }}><span className="board-emoji">{workspace.emoji}</span><span>{workspaceLabel(workspace)}</span></button>
          <button className="workspace-more" aria-label={`${workspaceLabel(workspace)} seçenekleri`} onClick={() => setWorkspaceMenuId(workspaceMenuId === workspace.id ? null : workspace.id)}><MoreHorizontal size={16} /></button>
          {workspaceMenuId === workspace.id && <div className="workspace-context-menu"><button onClick={() => { const name = window.prompt(locale === "tr" ? "Pano adını değiştir" : "Rename workspace", workspaceLabel(workspace)); if (name?.trim()) renameWorkspace(workspace.id, name); setWorkspaceMenuId(null); }}>{locale === "tr" ? "Adını değiştir" : "Rename"}</button><button disabled={workspaces.length <= 1} onClick={() => { if (window.confirm(locale === "tr" ? `${workspaceLabel(workspace)} silinsin mi?` : `Delete ${workspaceLabel(workspace)}?`)) removeWorkspace(workspace.id); setWorkspaceMenuId(null); }}>{locale === "tr" ? "Sil" : "Delete"}</button></div>}
        </div>)}</div>
        <button className="new-board" onClick={createWorkspace}><Plus size={16} />{locale === "tr" ? "Yeni bir saray" : "New palace"}</button>
        <div className="sidebar-bottom">
          <div className="tiny-quote"><span>“</span><p>{locale === "tr" ? "Birlikte biriktirdiğimiz her şey, evimiz." : "Everything we gather together becomes home."}</p><small>— PALAS NOTLARI</small></div>
          <button className="nav-item" onClick={() => { setBackupMessage(""); setSettingsOpen(true); }}><Settings2 size={17} />{t.settings}</button>
          <button className="nav-item help-item" onClick={() => { setGuideTab("tools"); setGuideOpen(true); }}><CircleHelp size={17} />{locale === "tr" ? "Gezgin El Kitabı" : "Explorer handbook"}<kbd>?</kbd></button>
        </div>
      </aside>

      <section className="main-panel" id="board">
        <header className="topbar">
          <div className="breadcrumbs"><span>{activeSection === "home" ? t.home : activeSection === "memories" ? t.memories : t.ideas}</span><span className="crumb-slash">/</span><b>{workspaceTitle}</b><span className="saved-status"><Check size={12} />{t.saved}</span></div>
          <div className="top-actions">
            <label className="search-box"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
            <button className="icon-button language-button" title="Türkçe / English" onClick={() => setLocale(locale === "tr" ? "en" : "tr")}><Languages size={17} /><span>{locale.toUpperCase()}</span></button>
            <button type="button" className="icon-button guide-button" title={locale === "tr" ? "Gezgin El Kitabı (?)" : "Explorer handbook (?)"} aria-label={locale === "tr" ? "Gezgin El Kitabı" : "Explorer handbook"} aria-expanded={guideOpen} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setGuideTab("tools"); setGuideOpen(true); }}><BookOpen size={16} /><span>{locale === "tr" ? "Rehber" : "Guide"}</span></button>
            <button className="icon-button theme-toggle" title={theme === "dark" ? (locale === "tr" ? "Açık temaya geç" : "Switch to light mode") : (locale === "tr" ? "Karanlık temaya geç" : "Switch to dark mode")} aria-label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className="activity-wrap"><button className="icon-button activity-button" title={locale === "tr" ? "Saray Günlüğü" : "Palace activity"} aria-label={locale === "tr" ? "Saray Günlüğü" : "Palace activity"} aria-expanded={activityOpen} onClick={() => { setActivityOpen(!activityOpen); setActivityUnread(false); }}><Bell size={17} />{activityUnread && <i className="activity-dot" />}</button>
              <AnimatePresence>{activityOpen && <motion.section className="activity-popover" initial={{ opacity: 0, y: 7, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: .98 }}><header><span><Bell size={14} />{locale === "tr" ? "Saray Günlüğü" : "Palace activity"}</span><button aria-label={t.close} onClick={() => setActivityOpen(false)}><X size={14} /></button></header>{activities.length ? <ul>{activities.map((activity) => <li key={activity.id}><span className="activity-mark" /><div><p>{activity.text}</p><small>{new Date(activity.at).toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}</small></div></li>)}</ul> : <p className="activity-empty">{locale === "tr" ? "Günlüğün şimdilik sessiz." : "Your palace is quiet for now."}</p>}</motion.section>}</AnimatePresence>
            </div>
            <button className={`icon-button mailbox-button ${inboxUnread ? "mail-unread" : ""}`} title={locale === "tr" ? "Posta kutusu" : "Mailbox"} onClick={() => { setInboxOpen(!inboxOpen); setInboxUnread(false); }}><Mail size={17} /><i className="mail-flag" /></button>
            <button className="invite-button" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={15} />{t.invite}</button>
            <div className="export-wrap"><button className="icon-button export-button" title={locale === "tr" ? "Polaroid olarak indir" : "Download snapshot"} onClick={() => setExportMenu(!exportMenu)} disabled={exportBusy}><Download size={16} /></button>{exportMenu && <div className="export-menu"><button onClick={() => void exportSnapshot("png")}>Polaroid PNG</button><button onClick={() => void exportSnapshot("pdf")}>PDF</button></div>}</div>
            <div className="top-user-wrap"><button className="avatar avatar-you top-avatar" aria-label={locale === "tr" ? "Hesap menüsü" : "Account menu"} aria-expanded={topUserMenuOpen} title={locale === "tr" ? "Hesap" : "Account"} onClick={() => setTopUserMenuOpen(!topUserMenuOpen)}>{guestName.slice(0, 1).toUpperCase()}</button>{topUserMenuOpen && <div className="user-menu top-user-menu"><div className="user-menu-identity"><b>{guestName}</b><small>{userEmail || (locale === "tr" ? "Misafir hesabı" : "Guest account")}</small></div><button onClick={openProfileEditor}><UserRound size={14} />{locale === "tr" ? "Profili düzenle" : "Edit profile"}</button><button onClick={() => { downloadBackup(); setTopUserMenuOpen(false); }}><Download size={14} />{locale === "tr" ? "JSON yedeğini indir" : "Export JSON backup"}</button><button onClick={() => { backupInputRef.current?.click(); setTopUserMenuOpen(false); }}><Upload size={14} />{locale === "tr" ? "JSON yedeği yükle" : "Import JSON backup"}</button><button onClick={() => guestName === "Misafir" ? void signOut() : void returnToGuest()}><LogOut size={14} />{guestName === "Misafir" ? (locale === "tr" ? "Oturumu kapat" : "Sign out") : (locale === "tr" ? "Misafir moduna dön" : "Switch to guest mode")}</button></div>}</div>
          </div>
        </header>

        {inboxOpen && <section className="mailbox-popover" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) receiveFile(file); }}>
          <div className="mailbox-heading"><span><Mail size={15} /> {locale === "tr" ? "Posta kutusu" : "Mailbox"}</span><button aria-label={t.close} onClick={() => setInboxOpen(false)}><X size={15} /></button></div>
          {inboxMessages.length > 0 ? <div className="mail-envelope"><span>✉</span><p>{inboxMessages[0]}</p><button onClick={() => { addNode("bottle", inboxMessages[0]); setInboxMessages((messages) => messages.slice(1)); }}>{locale === "tr" ? "Panoya koy" : "Place on board"}</button></div> : <p className="mailbox-empty">{locale === "tr" ? "Şimdilik yeni mektup yok." : "No new letters for now."}</p>}
          <form onSubmit={(event) => { event.preventDefault(); if (!inboxText.trim()) return; setInboxMessages((messages) => [...messages, inboxText.trim()]); setInboxText(""); }}><input value={inboxText} onChange={(event) => setInboxText(event.target.value)} placeholder={locale === "tr" ? "Bir mektup bırak..." : "Leave a letter..."} /><button><Plus size={14} /></button></form>
          <div className="mailbox-drop"><FileUp size={13} />{locale === "tr" ? "Dosyaları buraya bırak" : "Drop files here"}</div>
        </section>}

        <div className="board-heading">
          <div><div className="eyebrow"><span className="eyebrow-leaf">✳</span> {locale === "tr" ? "BİZİM KÜÇÜK DÜNYAMIZ" : "OUR LITTLE WORLD"}</div><h1>{workspaceTitle}<span className="title-sparkle">✳</span></h1><p>{locale === "tr" ? "Güzel şeyleri burada biriktiriyoruz." : "A little place for all the good things."}</p></div>
          <div className="heading-right"><div className="collaborators"><span className="avatar avatar-rose">A</span><span className="avatar avatar-gold">M</span><button className="avatar avatar-add" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Plus size={13} /></button><span className="presence-label">{locale === "tr" ? "yalnızca siz" : "just you"}</span></div><button className="heading-more" aria-label="Diğer seçenekler"><MoreHorizontal size={20} /></button></div>
        </div>

        <div className="canvas-shell">
          <div className="canvas-toolbar top-left-tools">
            <div className="segmented mode-switch" role="group" aria-label="Vibe seçimi">
              <button className={vibe === "memory" ? "chosen" : ""} onClick={() => setVibe("memory")}><Heart size={14} />{t.love}</button>
              <button className={vibe === "work" ? "chosen" : ""} onClick={() => setVibe("work")}><Wind size={14} />{t.work}</button>
            </div>
          </div>
          <div className="canvas-toolbar top-right-tools">
            <div className="select-wrap"><Trees size={14} /><select aria-label={t.biome} value={biome} onChange={(event) => setBiome(event.target.value as Biome)}><option value="backyard">{t.backyard}</option><option value="loft">{t.loft}</option><option value="night">{t.night}</option></select><ChevronDown size={13} /></div>
            <div className="select-wrap weather-select"><CloudSun size={15} /><select aria-label={t.weather} value={weather} onChange={(event) => setWeather(event.target.value as Weather)}><option value="sunny">{t.sunny}</option><option value="autumn">{t.autumn}</option><option value="rainy">{t.rainy}</option></select><ChevronDown size={13} /></div>
            <button className={`sound-toggle ${ambientOn ? "sound-active" : ""}`} aria-label="Ortam sesini aç/kapat" title="Ortam sesi" onClick={() => setAmbientOn(!ambientOn)}><AudioLines size={16} /></button>
          </div>

          <BoardCanvas search={query} locale={locale} focusNodeIds={focusNodeIds} viewFilter={activeSection} backgroundUrl={sceneBackgrounds[biome]} />
          <button className="campfire-bin" aria-label={locale === "tr" ? "Kartı köz çanağına sürükleyerek yak" : "Drag a card here to burn it"} title={locale === "tr" ? "Kartı buraya sürükleyerek yak" : "Drag a card here to burn it"}><Flame size={18} /></button>

          <div className="canvas-bottom-left"><span className="live-dot" />{locale === "tr" ? "Sarayınız size özel" : "Your palace is private"}<span className="bottom-divider" /><span>{nodes.length} {t.count}</span></div>
          <div className="canvas-bottom-right"><button title={t.undo}><ArrowDownToLine size={15} /></button><span>100%</span><button title={locale === "tr" ? "Tuvali ayarla" : "Fit canvas"}><Globe2 size={15} /></button></div>

          <div className="cozy-dock">
            <button className="dock-primary" onClick={() => setMenuOpen(!menuOpen)} title={locale === "tr" ? "Ekle (N)" : "Add (N)"}><Plus size={17} /><span>{t.add}</span></button>
            <span className="dock-divider" />
            {vibe === "memory" ? <>
              <button className="dock-tool" onClick={() => addKind("clothesline")} title={locale === "tr" ? "Anı İpi (C)" : "Memory line (C)"}><span className="dock-glyph">🧺</span><small>{locale === "tr" ? "Anı İpi" : "Memory line"}</small></button>
              <button className="dock-tool" onClick={() => addKind("photo")} title={locale === "tr" ? "Polaroid (P)" : "Polaroid (P)"}><ImagePlus size={18} /><small>Polaroid</small></button>
              <button className="dock-tool" onClick={() => addKind("capsule")} title={locale === "tr" ? "Toprak Kapsülü" : "Time capsule"}><Shovel size={18} /><small>{locale === "tr" ? "Kapsül" : "Capsule"}</small></button>
              <button className="dock-tool" onClick={() => addKind("bottle")} title={t.bottle}><Mail size={18} /><small>{locale === "tr" ? "Şişe" : "Bottle"}</small></button>
            </> : <>
              <button className="dock-tool" onClick={() => addKind("fence")} title={locale === "tr" ? "Çit Alanı (F)" : "Fence Area (F)"}><Trees size={18} /><small>{locale === "tr" ? "Çit Alanı" : "Fence"}</small></button>
              <button className="dock-tool" onClick={() => addKind("plant", locale === "tr" ? "Görev Listesi" : "Task list")} title={locale === "tr" ? "Görev listeleri" : "Task lists"}><Check size={18} /><small>{locale === "tr" ? "Görevler" : "Tasks"}</small></button>
              <button className="dock-tool" onClick={() => addKind("sheet")} title={locale === "tr" ? "CSV Tablosu" : "CSV table"}><FileSpreadsheet size={18} /><small>CSV</small></button>
              <button className="dock-tool" onClick={() => addKind("plant", locale === "tr" ? "Bonsai Hedefleri" : "Bonsai goals")} title={locale === "tr" ? "Bonsai hedef takibi" : "Bonsai goals"}><Flower2 size={18} /><small>Bonsai</small></button>
            </>}
            <span className="dock-divider dock-extra-divider" />
            <button className="dock-tool dock-extra" onClick={() => addKind("vault")} title={locale === "tr" ? "Kilitli kasa" : "Locked safe"}><LockKeyhole size={18} /><small>{locale === "tr" ? "Kasa" : "Safe"}</small></button>
            <button className="dock-tool dock-extra" onClick={() => setTidyMenu(!tidyMenu)} title={t.tidy}><WandSparkles size={18} /><small>{t.tidy}</small></button>
            <span className="dock-divider dock-extra-divider" />
            <button className="dock-ai" onClick={() => setAssistantOpen(true)} title={t.assistant}><Sparkles size={18} /></button>
          </div>

          <AnimatePresence>{tidyMenu && <motion.div className="tidy-menu" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <button onClick={() => { tidyNodes("grid"); setTidyMenu(false); }}><WandSparkles size={14} />{locale === "tr" ? "Izgara düzeni" : "Clean grid"}</button>
            <button onClick={() => { tidyNodes("line"); setTidyMenu(false); }}><Wind size={14} />{locale === "tr" ? "İpe diz" : "String lineup"}</button>
            <button onClick={() => { tidyNodes("cluster"); setTidyMenu(false); }}><Flower2 size={14} />{locale === "tr" ? "Türüne göre kümele" : "Cluster by type"}</button>
          </motion.div>}</AnimatePresence>

          <AnimatePresence>
            {menuOpen && <motion.div className="add-menu" initial={{ opacity: 0, y: 8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .96 }}>
              <div className="add-menu-title">{locale === "tr" ? "Sarayına ne ekleyelim?" : "What shall we add?"}</div>
              <button onClick={() => addKind("note")}><span className="menu-emoji">📝</span><span><b>{t.memory}</b><small>{locale === "tr" ? "Bir düşünce, küçük bir not" : "A thought or little note"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("photo")}><span className="menu-emoji">📸</span><span><b>{t.photo}</b><small>{locale === "tr" ? "Birlikte güzel bir an" : "A moment together"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("plant")}><span className="menu-emoji">🌱</span><span><b>{t.plant}</b><small>{locale === "tr" ? "Adım adım büyüyen hedef" : "A goal that grows"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("bottle")}><span className="menu-emoji">🍾</span><span><b>{t.bottle}</b><small>{locale === "tr" ? "Birine ulaşmasını bekleyen söz" : "A message waiting to be found"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("capsule")}><span className="menu-emoji">🪴</span><span><b>{t.capsule}</b><small>{locale === "tr" ? "Geleceğe saklanan küçük sır" : "A secret for the future"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("vault")}><span className="menu-emoji">🔐</span><span><b>{locale === "tr" ? "Kilitli kasa" : "Locked safe"}</b><small>{locale === "tr" ? "PIN ile korunan özel not" : "A private note protected by PIN"}</small></span><LockKeyhole size={15} /></button>
              <button onClick={() => addKind("sheet")}><span className="menu-emoji">📊</span><span><b>{locale === "tr" ? "CSV tablosu" : "CSV table"}</b><small>{locale === "tr" ? "Dosya ya da Google Sheets" : "Upload or Google Sheets"}</small></span><FileSpreadsheet size={15} /></button>
              <button onClick={() => addKind("file")}><span className="menu-emoji">📎</span><span><b>{locale === "tr" ? "Dosya ekle" : "Attach a file"}</b><small>{locale === "tr" ? "PDF, görsel ve belgeler" : "PDFs, images and documents"}</small></span><FileUp size={15} /></button>
              <button onClick={() => addKind("campfire")}><span className="menu-emoji">🔥</span><span><b>{locale === "tr" ? "Kamp ateşi" : "Campfire"}</b><small>{locale === "tr" ? "İstenmeyen kartları yak" : "Burn away unwanted cards"}</small></span><Flame size={15} /></button>
              <button onClick={() => addKind("coffee")}><span className="menu-emoji">☕</span><span><b>{locale === "tr" ? "Kahve fincanı" : "Coffee cup"}</b><small>{locale === "tr" ? "Bir kahve izi bırak" : "Leave a coffee ring"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("clothesline")}><span className="menu-emoji">🧺</span><span><b>{locale === "tr" ? "Anı İpi" : "Memory line"}</b><small>{locale === "tr" ? "Birden çok anı as" : "Hang several memories"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("fence")}><span className="menu-emoji">🪵</span><span><b>{locale === "tr" ? "Çit Alanı" : "Fence Area"}</b><small>{locale === "tr" ? "Kartlarını bir arada tut" : "Keep related cards together"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("invisible")}><span className="menu-emoji">🔦</span><span><b>{locale === "tr" ? "Gizli mürekkep" : "Invisible ink"}</b><small>{locale === "tr" ? "Üzerine gelince ortaya çıkar" : "Appears when you hover"}</small></span><Plus size={15} /></button>
              <button onClick={() => addKind("napkin")}><span className="menu-emoji">☕</span><span><b>{locale === "tr" ? "Karalama peçetesi" : "Cafe napkin"}</b><small>{locale === "tr" ? "Küçük bir düşünce karala" : "Doodle a little thought"}</small></span><Plus size={15} /></button>
              <button onClick={() => setStampDrawerOpen(!stampDrawerOpen)}><span className="menu-emoji">🕯️</span><span><b>{locale === "tr" ? "Mühür çekmecesi" : "Wax seal drawer"}</b><small>{locale === "tr" ? "Bir mühür seç ve panoya bas" : "Choose a seal for your board"}</small></span><ChevronDown size={15} /></button>
              {stampDrawerOpen && <div className="stamp-drawer">{(locale === "tr" ? ["ONAYLANDI", "BİTTİ", "ÇOK GİZLİ", "SENİ SEVİYORUM", "ACİL"] : ["APPROVED", "DONE", "TOP SECRET", "WITH LOVE", "URGENT"]).map((label) => <button key={label} onClick={() => { addNode("stamp", label); setStampDrawerOpen(false); setMenuOpen(false); }}><span className="stamp-swatch">✳</span>{label}</button>)}</div>}
              <div className="template-menu-label">{locale === "tr" ? "HAZIR ŞABLONLAR" : "STARTER TEMPLATES"}</div>
              <button onClick={() => createTemplate("memory")}><span className="menu-emoji">💌</span><span><b>{locale === "tr" ? "Çift / anı panosu" : "Couple / memory board"}</b><small>{locale === "tr" ? "Anılar, hedefler ve zaman kapsülü" : "Memories, goals and a time capsule"}</small></span><Plus size={15} /></button>
              <button onClick={() => createTemplate("work")}><span className="menu-emoji">📋</span><span><b>{locale === "tr" ? "Agile iş panosu" : "Agile project board"}</b><small>Backlog · Yapılıyor · Test · Tamamlandı</small></span><Plus size={15} /></button>
            </motion.div>}
          </AnimatePresence>
        </div>
        <footer className="workspace-footer"><span><span className="footer-flower">✿</span> {locale === "tr" ? "Yavaşla. Güzel şeyler burada." : "Take your time. The good things are here."}</span><span>PALAS <i>✳</i> 2026</span></footer>
      </section>

      {guideOpen && typeof document !== "undefined" && createPortal(<motion.div className="modal-backdrop guide-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setGuideOpen(false)}>
          <motion.section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" initial={{ y: 18, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: .98 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setGuideOpen(false)}><X size={17} /></button>
            <div className="eyebrow">PALAS / {locale === "tr" ? "GEZGİN EL KİTABI" : "EXPLORER HANDBOOK"}</div>
            <h2 id="guide-title">{locale === "tr" ? "Palas Gezgin El Kitabı" : "Palas Explorer Handbook"}</h2>
            <div className="guide-tabs" role="tablist"><button role="tab" aria-selected={guideTab === "tools"} className={guideTab === "tools" ? "guide-tab-active" : ""} onClick={() => setGuideTab("tools")}>{locale === "tr" ? "Araçlar & Metaforlar" : "Tools & Metaphors"}</button><button role="tab" aria-selected={guideTab === "shortcuts"} className={guideTab === "shortcuts" ? "guide-tab-active" : ""} onClick={() => setGuideTab("shortcuts")}>{locale === "tr" ? "Klavye Kısayolları" : "Keyboard Shortcuts"}</button></div>
            {guideTab === "tools" ? <div className="guide-tool-grid">{[
              { key: "clothesline", title: "Anı İpi", description: "Fotoğraf ve notlarını sürükleyip ipe bırak; mandalla asılıp hafifçe sallansın.", icon: <ImagePlus size={17} /> },
              { key: "shovel", title: "Kürek & Toprak Kapsülü", description: "Bir kartı kürekle toprağa göm; açılma tarihini belirleyip kilitle.", icon: <Shovel size={17} /> },
              { key: "fence", title: "Çit Alanı", description: "Projelerini ve fikirlerini ahşap çitlerle çevrili alanlarda grupla.", icon: <Trees size={17} /> },
              { key: "uv", title: "UV Feneri & Kilitli Kasa", description: "Gizli mürekkep notlarını UV ile bul; özel notlarını PIN’li kasada sakla.", icon: <LockKeyhole size={17} /> },
              { key: "campfire", title: "Kamp Ateşi & Köz Çanağı", description: "İstemediğin kartı ateşe sürükleyerek yak; ateşe tıklayıp odaklan.", icon: <Flame size={17} /> },
              { key: "bonsai", title: "Bonsai Ağacı", description: "Görevlerini tamamlayıp suladıkça hedef ağacının büyümesini izle.", icon: <Flower2 size={17} /> },
            ].map((item) => <article className="guide-tool-card" key={item.key}><span className="guide-tool-icon">{item.icon}</span><div className="guide-tool-copy"><h3>{item.title}</h3><p>{item.description}</p></div><button onClick={() => tryGuideTool(item.key)}>{locale === "tr" ? "Hemen Dene" : "Try it"}</button></article>)}</div> : <div className="guide-shortcuts">{[
              { title: locale === "tr" ? "Tuvale ekle" : "Add to canvas", keys: [["N", locale === "tr" ? "Yapışkan not" : "Sticky note"], ["P", locale === "tr" ? "Polaroid" : "Polaroid"], ["F", locale === "tr" ? "Çit Alanı" : "Fence Area"], ["C", locale === "tr" ? "Anı İpi" : "Memory line"]] },
              { title: locale === "tr" ? "Araçlar" : "Tools", keys: [["S", locale === "tr" ? "Kürek" : "Shovel"], ["U", locale === "tr" ? "UV Feneri" : "UV lantern"], ["L", locale === "tr" ? "Seçileni sabitle" : "Lock selection"], ["Delete / Backspace", locale === "tr" ? "Seçileni yak" : "Burn selection"]] },
              { title: locale === "tr" ? "Görünüm" : "View", keys: [["M", locale === "tr" ? "Anı / Akış modu" : "Memory / Flow mode"], ["D", locale === "tr" ? "Açık / Koyu tema" : "Light / Dark theme"], ["V", locale === "tr" ? "Seçim aracına dön" : "Select tool"], ["Esc", locale === "tr" ? "Aracı sıfırla, pencereyi kapat" : "Reset tool, close dialog"]] },
              { title: locale === "tr" ? "Yardım" : "Help", keys: [["?", locale === "tr" ? "Gezgin El Kitabı" : "Explorer handbook"], ["H", locale === "tr" ? "Gezgin El Kitabı" : "Explorer handbook"]] },
            ].map((group) => <section className="shortcut-group" key={group.title}><h3>{group.title}</h3>{group.keys.map(([key, description]) => <div className="shortcut-row" key={key}><kbd>{key}</kbd><span>{description}</span></div>)}</section>)}</div>}
          </motion.section>
        </motion.div>, document.body)}

      <AnimatePresence>
        {profileOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProfileOpen(false)}>
          <motion.section className="profile-modal" initial={{ y: 20, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, scale: .98 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setProfileOpen(false)}><X size={17} /></button>
            <div className="eyebrow">PALAS / {locale === "tr" ? "HESAP" : "ACCOUNT"}</div><h2>{locale === "tr" ? "Profili Düzenle" : "Edit Profile"}</h2>
            <form onSubmit={saveProfile}><label>{locale === "tr" ? "Kullanıcı adı" : "Name"}<input required maxLength={70} value={profileName} onChange={(event) => setProfileName(event.target.value)} /></label><label>{locale === "tr" ? "E-posta" : "Email"}<input required={guestName !== "Misafir"} type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} /></label><label>{locale === "tr" ? "Yeni şifre" : "New password"}<input type="password" minLength={6} value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} placeholder={locale === "tr" ? "Değiştirmeyeceksen boş bırak" : "Leave blank to keep current password"} /></label>{!getSupabaseClient() && <small className="profile-local-note">{locale === "tr" ? "Yerel hesapta şifre tutulmaz; şifre işlemleri bağlı bir hesap gerektirir." : "Local accounts do not store passwords; password changes need a connected account."}</small>}{profileMessage && <p className="profile-message" role="alert">{profileMessage}</p>}<div className="profile-modal-actions"><button type="button" className="profile-cancel" onClick={() => setProfileOpen(false)}>{t.close}</button><button className="new-palace-submit" disabled={authBusy}><Check size={15} />{locale === "tr" ? "Kaydet" : "Save"}</button></div></form>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {newWorkspaceOpen && typeof document !== "undefined" && createPortal(<motion.div className="modal-backdrop new-palace-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNewWorkspaceOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setNewWorkspaceOpen(false); }}>
          <motion.section className="new-palace-modal" role="dialog" aria-modal="true" aria-labelledby="new-palace-title" initial={{ y: 20, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, scale: .98 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setNewWorkspaceOpen(false)}><X size={17} /></button>
            <div className="eyebrow">PALAS / {locale === "tr" ? "YENİ SARAY" : "NEW PALACE"}</div>
            <h2 id="new-palace-title">{locale === "tr" ? "Yeni Saray Oluştur" : "Create a New Palace"}</h2>
            <form onSubmit={submitNewWorkspace}>
              <label>{locale === "tr" ? "Saray adı" : "Palace name"}<input ref={newWorkspaceNameRef} required maxLength={60} value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder={locale === "tr" ? "Örn. Yaz planlarımız" : "e.g. Summer plans"} /></label>
              <label>{locale === "tr" ? "Biyom" : "Biome"}<select value={newWorkspaceBiome} onChange={(event) => setNewWorkspaceBiome(event.target.value as Biome)}><option value="backyard">{t.backyard}</option><option value="loft">{t.loft}</option><option value="night">{t.night}</option></select></label>
              <button className="new-palace-submit"><Plus size={15} />{locale === "tr" ? "Oluştur" : "Create"}</button>
            </form>
          </motion.section>
        </motion.div>, document.body)}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettingsOpen(false)}>
          <motion.section className="settings-modal" initial={{ y: 20, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, scale: .98 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setSettingsOpen(false)}><X size={17} /></button>
            <div className="eyebrow">PALAS / TERCIHLER</div><h2>{locale === "tr" ? "Ayarlar" : "Settings"}</h2>
            <section className="settings-section"><div><b>{locale === "tr" ? "Varsayılan tema" : "Default biome"}</b><small>{locale === "tr" ? "Bu panonun görünümünü seç" : "Choose this board’s look"}</small></div><select aria-label={locale === "tr" ? "Varsayılan tema" : "Default biome"} value={biome} onChange={(event) => setBiome(event.target.value as Biome)}><option value="backyard">{t.backyard}</option><option value="loft">{t.loft}</option><option value="night">{t.night}</option></select></section>
            <section className="settings-section volume-setting"><div><b>{locale === "tr" ? "Ses efektleri" : "Sound effects"}</b><small>{locale === "tr" ? "Efekt ve ortam sesi seviyesi" : "Effects and ambience volume"}</small></div><input aria-label={locale === "tr" ? "Ses seviyesi" : "Sound level"} type="range" min="0" max="100" value={Math.round(soundLevel * 100)} onChange={(event) => { const level = Number(event.target.value) / 100; setVolume(level); setSoundLevel(level); }} /><span>{Math.round(soundLevel * 100)}%</span></section>
            <section className="scenic-upload-group"><h3>{locale === "tr" ? "🖼️ Arka Plan Görsellerini Eşleştir (cozyBackground / warmLoft / midnightPalace)" : "🖼️ Match scene backgrounds (cozyBackground / warmLoft / midnightPalace)"}</h3>
              {([
                ["backyard", locale === "tr" ? "Arka Bahçe" : "Cozy Garden", "cozyBackground"],
                ["loft", locale === "tr" ? "Teras & Sera" : "Warm Loft", "warmLoft"],
                ["night", locale === "tr" ? "Gece Ormanı" : "Midnight Palace", "midnightPalace"],
              ] as [Biome, string, string][]).map(([target, label, fileBase]) => <section className="settings-section scenic-settings-section" key={target}><div><b>{label}</b><small>{sceneBackgrounds[target] ? (locale === "tr" ? "Sahneye uygulanmaya hazır" : "Ready for the scene") : `${fileBase}.webp / ${fileBase}.jpg`}</small></div><div className="scenic-settings-control">{sceneBackgrounds[target] && <img src={sceneBackgrounds[target]} alt="" />}
                <button type="button" onClick={() => sceneUploadRefs.current[target]?.click()}><Upload size={13} />{locale === "tr" ? "Görsel seç" : "Choose image"}</button>
                <input ref={(element) => { sceneUploadRefs.current[target] = element; }} className="hidden-file" type="file" accept=".webp,.jpg,.jpeg,image/webp,image/jpeg" onChange={(event) => { void saveSceneImage(target, event.target.files?.[0]); event.target.value = ""; }} />
              </div></section>)}
            </section>
            <section className="settings-section"><div><b>{locale === "tr" ? "Yedekleme" : "Backups"}</b><small>{locale === "tr" ? "Pano içeriğini JSON olarak taşı" : "Move board data as JSON"}</small></div><div className="settings-buttons"><button onClick={downloadBackup}><Download size={13} />{locale === "tr" ? "Yedekle" : "Export"}</button><button onClick={() => backupInputRef.current?.click()}><Upload size={13} />{locale === "tr" ? "Yedeği yükle" : "Import"}</button><input ref={backupInputRef} className="hidden-file" type="file" accept="application/json,.json" onChange={importBackup} /></div></section>
            {backupMessage && <div className="settings-message" role="status">{backupMessage}</div>}
            <section className="settings-section"><div><b>{locale === "tr" ? "Supabase bağlantısı" : "Supabase connection"}</b><small>{locale === "tr" ? "Bulut senkronizasyonu" : "Cloud sync"}</small></div><span className={`connection-status ${getSupabaseClient() ? "connected" : "disconnected"}`}><i />{getSupabaseClient() ? (locale === "tr" ? "Anahtarlar tanımlı" : "Credentials configured") : (locale === "tr" ? "Yerel mod" : "Local mode")}</span></section>
            <section className="settings-danger"><div><b>{locale === "tr" ? "Panoyu sıfırla" : "Reset board"}</b><small>{locale === "tr" ? "Demo anılarını geri yükler; mevcut pano içeriği silinir." : "Restore demo memories and remove current board content."}</small></div><button onClick={() => { if (window.confirm(locale === "tr" ? "Pano sıfırlansın mı? Bu işlem mevcut içeriği siler." : "Reset the board? Current content will be removed.")) { resetBoard(); setBackupMessage(locale === "tr" ? "Demo panosu geri yüklendi." : "Demo board restored."); } }}>{locale === "tr" ? "Sıfırla" : "Reset"}</button></section>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {assistantOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssistantOpen(false)}>
          <motion.section className="assistant-modal" initial={{ y: 24, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: .97 }} onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label={t.close} onClick={() => setAssistantOpen(false)}><X size={17} /></button>
            <div className="assistant-orb"><Sparkles size={23} /></div><div className="eyebrow">PALAS YARDIMCISI</div><h2>{locale === "tr" ? "Aklındaki ne?" : "What’s on your mind?"}</h2><p>{t.assistantText}</p>
            <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder={locale === "tr" ? "Bir hayal, plan ya da küçük bir soru..." : "A dream, a plan, or a little question..."} />
            <div className="assistant-actions"><button onClick={createMindMap}><Sparkles size={15} />{locale === "tr" ? "6 fikir haritası oluştur" : "Create a 6-step map"}</button><button className="assistant-summary" onClick={summarizeBoard}><Lightbulb size={14} />{locale === "tr" ? "Tahtayı özetle" : "Summarize board"}</button></div>
            <div className="assistant-privacy">{locale === "tr" ? "Fikirler cihazında kalır. Harita, yazdıklarından yerel olarak üretilir." : "Your thoughts stay on this device. Maps are generated locally."}</div>
          </motion.section>
        </motion.div>}
      </AnimatePresence>

    </main>
  );
}