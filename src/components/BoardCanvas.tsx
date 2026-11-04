"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addEdge, Background, BackgroundVariant, Controls, Handle, MiniMap, NodeResizer, Position, ReactFlow, ReactFlowProvider, applyNodeChanges, useNodeId, useOnViewportChange, useReactFlow, type Connection, type Node, type NodeChange, type NodeProps, type NodeTypes } from "@xyflow/react";
import Papa from "papaparse";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Check, CloudUpload, Flame, Flower2, Heart, ImagePlus, Lock, LockKeyhole, Mail, MessageCircle, MoreHorizontal, MousePointer2, Plus, Send, Shovel, Sparkles, Sprout, Trash2, Unlock, Upload, X } from "lucide-react";
import { type ActiveTool, type Locale, type PalasNodeData, usePalasStore } from "@/store/usePalasStore";
import { decryptVault, encryptVault, isEncryptedVault, type EncryptedVault } from "@/lib/crypto";
import { playCozySound } from "@/lib/sound";

type CanvasProps = { search: string; locale: Locale; focusNodeIds?: string[]; viewFilter?: "home" | "memories" | "ideas"; backgroundUrl?: string };

function ScenicWorldBackground({ imageUrl }: { imageUrl: string }) {
  return (
    <div
      className="react-flow__background-image-container pointer-events-none select-none"
      style={{
        position: "absolute",
        left: "-2500px",
        top: "-1500px",
        width: "8000px",
        height: "6000px",
        zIndex: -1,
      }}
    >
      <img
        src={imageUrl}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "32px",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function clotheslineWidth(count: number) {
  return Math.max(650, count * 230 + 100);
}

function clotheslinePosition(line: Node<PalasNodeData>, count: number, index: number) {
  const width = clotheslineWidth(count);
  const step = width / (count + 1);
  return { x: line.position.x + step * (index + 1) - 115, y: line.position.y + 67 + (index % 2) * 5 };
}

export function burnNode(id: string, origin = { x: .5, y: .55 }) {
  const store = usePalasStore.getState();
  const node = store.nodes.find((item) => item.id === id);
  if (!node || node.data.burning) return;
  store.setNodes(store.nodes.map((item) => item.id === id ? { ...item, className: "is-burning", data: { ...item.data, burning: true } } : item));
  playCozySound("fire");
  confetti({ particleCount: 22, spread: 42, origin, colors: ["#6f685c", "#9b7955", "#eb9a58", "#e4bd70"] });
  window.setTimeout(() => {
    const current = usePalasStore.getState();
    let remaining = current.nodes.filter((item) => item.id !== id);
    if (node.data.kind === "fence") {
      remaining = remaining.map((item) => item.parentId === id ? { ...item, parentId: undefined, extent: undefined, position: { x: item.position.x + node.position.x, y: item.position.y + node.position.y } } : item);
    }
    if (node.data.kind === "clothesline") {
      remaining = remaining.map((item) => item.data.hangOnLine === id ? { ...item, data: { ...item.data, hanging: false, hangOnLine: undefined } } : item);
    } else if (node.data.hangOnLine) {
      const line = remaining.find((item) => item.id === node.data.hangOnLine);
      const lineCards = remaining.filter((item) => item.data.hangOnLine === node.data.hangOnLine);
      if (line) remaining = remaining.map((item) => {
        const index = lineCards.findIndex((card) => card.id === item.id);
        return index < 0 ? item : { ...item, position: clotheslinePosition(line, lineCards.length, index) };
      });
    }
    current.setNodes(remaining);
    current.setEdges(current.edges.filter((edge) => edge.source !== id && edge.target !== id));
  }, 400);
}

function PalasNode({ id, data, selected }: NodeProps<Node<PalasNodeData>>) {
  const [letterOpen, setLetterOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [develop, setDevelop] = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [vaultText, setVaultText] = useState("");
  const [vaultError, setVaultError] = useState("");
  const [capsuleNotice, setCapsuleNotice] = useState("");
  const [capsuleShaking, setCapsuleShaking] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [planeFlight, setPlaneFlight] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLInputElement>(null);
  const { updateNode, setNodes, toggleCampfireFocus, addNode } = usePalasStore();
  const allNodes = usePalasStore((state) => state.nodes);
  const lineCards = allNodes.filter((node) => node.data.hangOnLine === id);
  const kind = data.kind;
  const tr = usePalasStore((state) => state.vibe === "memory");
  const completed = data.tasks?.filter((task) => task.done).length ?? 0;
  const progress = data.tasks?.length ? Math.round((completed / data.tasks.length) * 100) : 0;

  const removeNode = () => burnNode(id);
  const updateTask = (index: number) => {
    const tasks = (data.tasks ?? []).map((task, taskIndex) => taskIndex === index ? { ...task, done: !task.done } : task);
    updateNode(id, { tasks });
    if (tasks.length && tasks.every((task) => task.done)) confetti({ particleCount: 48, spread: 48, origin: { y: .72 }, colors: ["#e99774", "#e6bb62", "#739a76"] });
  };

  const title = <input className="node-title nodrag" aria-label="Kart başlığı" value={data.label} onChange={(event) => updateNode(id, { label: event.target.value })} onPointerDown={(event) => event.stopPropagation()} />;
  const imageUpload = <input ref={fileRef} className="hidden-file" type="file" accept="image/*" onChange={(event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNode(id, { imageUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }} />;
  const fileUpload = <input ref={uploadRef} className="hidden-file" type="file" onChange={(event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNode(id, { fileData: String(reader.result), fileName: file.name, fileType: file.type || "application/octet-stream" });
    reader.readAsDataURL(file);
  }} />;

  if (kind === "plant") return <div className={`palas-node plant-node ${selected ? "node-selected" : ""}`}>
    <div className="node-topline"><span className="node-kicker"><Flower2 size={12} /> BİRLİKTE BÜYÜYELİM</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>
    {title}
    <div className="plant-art"><div className={`plant-glow ${progress === 100 ? "glowing" : ""}`}><Sprout size={48 + Math.floor(progress / 20) * 4} strokeWidth={1.4} /></div><div className="plant-pot"><span /></div></div>
    <div className="plant-progress"><span style={{ width: `${progress}%` }} /></div>
    <div className="task-list nodrag">{(data.tasks ?? []).map((task, index) => <label key={`${task.text}-${index}`}><input type="checkbox" checked={task.done} onChange={() => updateTask(index)} /><span>{task.text}</span></label>)}</div>
    <button className="water-button nodrag" onClick={() => {
      const tasks = data.tasks ?? [];
      const next = tasks.findIndex((task) => !task.done);
      if (next >= 0) updateTask(next);
      else if (tasks.length) confetti({ particleCount: 45, spread: 55, origin: { y: .7 } });
    }}><span>✿</span> {tr ? "Sulama kabı" : "Water plant"}<small>{progress}%</small></button>
    <HandleLabel />
  </div>;

  if (kind === "photo") return <motion.div className={`palas-node photo-node ${selected ? "node-selected" : ""} ${data.hanging ? "hanging-card" : ""} ${data.burning ? "burning-card" : ""}`} animate={data.hanging ? { rotate: [-2.5, 2.5, -2.5], scale: .6 } : data.burning ? { scale: 0, opacity: 0, rotate: 18 } : {}} transition={data.hanging ? { type: "spring", stiffness: 45, damping: 5, repeat: Infinity, repeatType: "mirror" } : { duration: .4 }} whileHover={data.hanging ? { scale: .85 } : { rotate: [-1, 1, -1], transition: { repeat: 1, duration: .18 } }} onMouseMove={() => setDevelop((value) => Math.min(100, value + 5))}>
    {data.hanging && <Clothespin />}
    <div className="photo-image" style={data.imageUrl ? { backgroundImage: `url(${data.imageUrl})` } : undefined}>
      {!data.imageUrl && <div className="photo-scene"><span className="sun-disc" /><span className="hill hill-back" /><span className="hill hill-front" /><span className="photo-spark">✦</span></div>}
      <div className="develop-blur" style={{ opacity: data.imageUrl ? 0 : 1 - develop / 100 }} />
      {!data.imageUrl && develop < 100 && <button className="develop-hint nodrag" onClick={() => setDevelop((value) => Math.min(100, value + 35))}><Sparkles size={12} />{tr ? "Salla, fotoğraf çıksın" : "Shake to develop"}</button>}
      {imageUpload}
      <button className="photo-upload nodrag" title={tr ? "Fotoğraf yükle" : "Upload a photo"} onClick={() => fileRef.current?.click()}><ImagePlus size={14} /></button>
    </div>
    {title}<div className="photo-date">{tr ? "BİR GÜN, BİZİM GÜNÜMÜZ" : "A DAY, OUR DAY"} <span>✦</span></div>
    <HandleLabel />
  </motion.div>;

  if (kind === "bottle") return <div className="bottle-wrap">
    <button className="bottle-node" onClick={() => setLetterOpen(true)} aria-label={data.label}><span className="bottle-glass"><span className="bottle-paper" /><span className="bottle-neck" /><span className="bottle-cork" /></span><span className="bottle-caption">{tr ? "sana, sevgiyle" : "to you, with love"}</span></button>
    <div className="bottle-label">{data.label}</div>
    <AnimatePresence>{letterOpen && <motion.div className="letter-backdrop nodrag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLetterOpen(false)}><motion.div className="letter-paper" initial={{ y: 16, rotate: -3 }} animate={{ y: 0, rotate: 0 }} exit={{ y: 12 }} onClick={(event) => event.stopPropagation()}><button className="letter-close" onClick={() => setLetterOpen(false)}><X size={15} /></button><span className="letter-stamp">✿</span><div className="letter-date">BİR NOT, SANA</div><h3>{data.label}</h3><textarea value={data.body ?? ""} onChange={(event) => updateNode(id, { body: event.target.value })} placeholder={tr ? "Mektubunu buraya yaz..." : "Write your letter here..."} /><div className="letter-sign">sevgiyle, <span>♡</span></div></motion.div></motion.div>}</AnimatePresence>
    <HandleLabel />
  </div>;

  if (kind === "capsule") return <div className={`palas-node capsule-node ${selected ? "node-selected" : ""}`}>
    <div className="node-topline"><span className="node-kicker"><Shovel size={12} /> TOPRAK KAPSÜLÜ</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>
    <button className={`mound-art nodrag ${revealed ? "mound-open" : ""} ${capsuleShaking ? "mound-shake" : ""}`} onClick={(event) => {
      event.stopPropagation();
      playCozySound("dig");
      if (data.buriedOriginal) {
        const original = data.buriedOriginal;
        setNodes(usePalasStore.getState().nodes.map((node) => node.id === id ? { ...node, type: resolveNodeType(original.kind), data: original } : node));
        usePalasStore.getState().setActiveTool("select");
        return;
      }
      if (data.lockedUntil && data.lockedUntil > Date.now() && !data.unlockForced) {
        setRevealed(false);
        setCapsuleNotice(tr ? `Bu kapsül ${new Date(data.lockedUntil).toLocaleString("tr-TR")} tarihinde açılacak!` : `This capsule opens on ${new Date(data.lockedUntil).toLocaleString()}!`);
        setCapsuleShaking(true);
        window.setTimeout(() => setCapsuleShaking(false), 520);
        return;
      }
      setRevealed(!revealed);
    }}><span className="mound-sprout">🌱</span><span className="mound-x">×</span><span className="mound-dirt" /></button>
    {title}
    <div className="capsule-description">{revealed ? data.body : capsuleNotice || (data.buriedOriginal ? (tr ? "Kürekle çıkarmak için toprağa dokun" : "Tap the mound to unearth") : (tr ? "Açmak için toprağa dokun" : "Tap the soil to unearth"))}</div>
    {!data.buriedOriginal && <>
      <input className="capsule-date nodrag" aria-label={tr ? "Açılma tarihi" : "Unlock date"} type="datetime-local" value={data.plantedAt ? new Date(data.plantedAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(event) => { setCapsuleNotice(""); updateNode(id, { plantedAt: event.target.value ? new Date(event.target.value).getTime() : undefined, lockedUntil: undefined, unlockForced: false }); }} />
      {data.lockedUntil && !data.unlockForced ? <div className="capsule-lock-row"><button className="capsule-lock-button nodrag" onClick={(event) => { event.stopPropagation(); setCapsuleNotice(tr ? `Bu kapsül ${new Date(data.lockedUntil!).toLocaleString("tr-TR")} tarihinde açılacak!` : `This capsule opens on ${new Date(data.lockedUntil!).toLocaleString()}!`); }}><LockKeyhole size={11} /> {tr ? "Kilitli (tarihe kadar)" : "Locked until date"}</button><button className="capsule-force-button nodrag" onClick={(event) => { event.stopPropagation(); updateNode(id, { unlockForced: true }); setCapsuleNotice(""); }}>{tr ? "Kilidi zorla aç" : "Force unlock"}</button></div> : <button className="capsule-lock-button nodrag" disabled={!data.plantedAt} onClick={(event) => { event.stopPropagation(); if (data.plantedAt) { updateNode(id, { lockedUntil: data.plantedAt, unlockForced: false }); setCapsuleNotice(""); } }}><LockKeyhole size={11} /> {tr ? "Tarihe kadar kilitle" : "Lock until date"}</button>}
    </>}
    <HandleLabel />
  </div>;

  if (kind === "vault") return <div className={`palas-node vault-node ${selected ? "node-selected" : ""}`}>
    <div className="node-topline"><span className="node-kicker"><LockKeyhole size={12} /> {tr ? "KÜÇÜK SIĞINAK" : "LITTLE SAFE"}</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>
    <div className="safe-art"><div className="safe-dial"><span>✳</span></div><div className="safe-handle" /></div>{title}
    {!vaultOpen ? <form className="pin-form nodrag" onSubmit={async (event) => {
      event.preventDefault();
      setVaultError("");
      if (pin.length < 4) { setVaultError(tr ? "En az 4 karakter" : "Use at least 4 characters"); return; }
      try {
        if (isEncryptedVault(data.body)) {
          const clear = await decryptVault(JSON.parse(data.body) as EncryptedVault, pin);
          setVaultText(clear);
        } else setVaultText(data.body ?? "");
        playCozySound("cork");
        setVaultOpen(true);
      } catch { setVaultError(tr ? "PIN yanlış" : "Incorrect PIN"); }
    }}><input aria-label="4 haneli PIN" maxLength={32} type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="••••" /><button>{isEncryptedVault(data.body) ? (tr ? "Aç" : "Open") : (tr ? "PIN belirle" : "Set PIN")}</button><small>{vaultError}</small></form> : <div className="vault-inside nodrag"><textarea value={vaultText} onChange={(event) => setVaultText(event.target.value)} placeholder={tr ? "Sırrını buraya yaz..." : "Write a secret..."} /><button onClick={async () => {
      updateNode(id, { body: JSON.stringify(await encryptVault(vaultText, pin)) });
      setVaultOpen(false);
      setPin("");
    }}>{tr ? "Şifrele ve kilitle" : "Encrypt & lock"}</button></div>}
    <HandleLabel />
  </div>;

  if (kind === "campfire") return <div className="campfire-node nodrag" role="button" tabIndex={0} data-no-bury title={tr ? "Odak Modunu Aç/Kapat" : "Toggle focus mode"} onClick={(event) => { event.stopPropagation(); toggleCampfireFocus(); playCozySound("fire"); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggleCampfireFocus(); playCozySound("fire"); } }}><span className="fire-glow" /><span className="fire-emoji">🔥</span><b>{data.label}</b><small>{tr ? "Odak Modunu Aç/Kapat" : "Toggle focus mode"}</small><HandleLabel /></div>;

  if (kind === "coffee") return <div className="palas-node coffee-node"><div className="coffee-steam">〰 〰</div><div className="coffee-cup">☕</div>{title}<button className="coffee-ring nodrag" data-no-bury onClick={(event) => {
    event.stopPropagation();
    const stainId = addNode("stain", tr ? "Bir kahve izi" : "A coffee ring");
    const state = usePalasStore.getState();
    const cup = state.nodes.find((node) => node.id === id);
    if (cup) state.setNodes(state.nodes.map((node) => node.id === stainId ? { ...node, position: { x: cup.position.x + 82, y: cup.position.y + 84 } } : node));
    playCozySound("stamp");
  }}>{tr ? "Kahve Lekesi Bırak" : "Leave a ring"}</button><HandleLabel /></div>;

  if (kind === "clothesline") {
    const lineWidth = clotheslineWidth(lineCards.length);
    return <div className="clothesline-node" style={{ width: lineWidth }}>
    <svg className="clothesline-art" viewBox={`0 0 ${lineWidth} 142`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id={`wood-${id}`} x1="0" x2="1"><stop offset="0" stopColor="#765338" /><stop offset=".48" stopColor="#c39461" /><stop offset="1" stopColor="#805c3d" /></linearGradient></defs><path d={`M28 34 Q${lineWidth / 2} 97 ${lineWidth - 28} 34`} fill="none" stroke="#9f7048" strokeWidth="3" strokeLinecap="round" /><path d={`M28 34 Q${lineWidth / 2} 94 ${lineWidth - 28} 34`} fill="none" stroke="#dab990" strokeWidth="1" strokeDasharray="2 4" /><rect x="18" y="7" width="19" height="127" rx="6" fill={`url(#wood-${id})`} /><rect x={lineWidth - 37} y="7" width="19" height="127" rx="6" fill={`url(#wood-${id})`} /><path d={`M20 17h15M${lineWidth - 35} 17h15M20 118h15M${lineWidth - 35} 118h15`} stroke="#d7b184" strokeWidth="1.5" opacity=".8" /><ellipse cx="27.5" cy="8" rx="9.5" ry="4" fill="#d3a976" /><ellipse cx={lineWidth - 27.5} cy="8" rx="9.5" ry="4" fill="#d3a976" /></svg>
    <button className="line-hang-button nodrag" data-no-bury onClick={(event) => {
      event.stopPropagation();
      const state = usePalasStore.getState();
      const line = state.nodes.find((node) => node.id === id);
      const candidate = state.nodes.find((node) => node.id !== id && ["memory", "note", "idea", "photo", "file"].includes(node.data.kind) && !node.data.hanging && !node.data.buriedOriginal);
      if (!line || !candidate) return;
      const lineIds = [...state.nodes.filter((node) => node.data.hangOnLine === id).map((node) => node.id), candidate.id];
      state.setNodes(state.nodes.map((node) => {
        const index = lineIds.indexOf(node.id);
        return index < 0 ? node : { ...node, position: clotheslinePosition(line, lineIds.length, index), data: { ...node.data, hanging: true, hangOnLine: id } };
      }));
      playCozySound("rustle");
    }}><Plus size={12} /> Anı As</button><HandleLabel /></div>;
    }

  if (kind === "fence") return <div className={`fence-area-node ${selected ? "fence-selected" : ""}`}>
    <NodeResizer minWidth={380} minHeight={250} isVisible={selected} lineClassName="fence-resize-line" handleClassName="fence-resize-handle" onResizeEnd={(_, size) => {
      const state = usePalasStore.getState();
      state.setNodes(state.nodes.map((node) => node.id === id ? { ...node, style: { ...node.style, width: size.width, height: size.height } } : node));
    }} />
    <svg className="fence-area-art" viewBox="0 0 500 320" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id={`fence-wood-${id}`} width="34" height="30" patternUnits="userSpaceOnUse"><path d="M5 29 6 8 10 2 14 8 15 29M22 29 23 8 27 2 31 8 32 29" fill="#c79a69" stroke="#8f6948" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 16h5M25 16h5" stroke="#e1bd8b" strokeWidth="1" /></pattern></defs><rect x="3" y="3" width="494" height="30" fill={`url(#fence-wood-${id})`} /><rect x="3" y="287" width="494" height="30" fill={`url(#fence-wood-${id})`} /><rect x="3" y="3" width="30" height="314" fill={`url(#fence-wood-${id})`} /><rect x="467" y="3" width="30" height="314" fill={`url(#fence-wood-${id})`} /><rect x="5" y="5" width="490" height="310" fill="none" stroke="#805d40" strokeWidth="4" strokeDasharray="2 3" /></svg>
    <input className="fence-area-title nodrag" aria-label="Çit alanı adı" value={data.label} onChange={(event) => updateNode(id, { label: event.target.value })} onPointerDown={(event) => event.stopPropagation()} />
    <HandleLabel />
  </div>;

  if (kind === "file") return <motion.div className={`palas-node file-node ${data.hanging ? "hanging-card" : ""}`} animate={data.hanging ? { rotate: [-2.5, 2.5, -2.5], scale: .6 } : {}} transition={data.hanging ? { type: "spring", stiffness: 45, damping: 5, repeat: Infinity, repeatType: "mirror" } : { duration: .3 }} whileHover={data.hanging ? { scale: .85 } : undefined}>{data.hanging && <Clothespin />}<div className="node-topline"><span className="node-kicker"><CloudUpload size={12} /> {tr ? "DOSYA" : "FILE"}</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>{title}{data.fileData ? <div className="file-preview nodrag">{data.fileType?.startsWith("image/") ? <img src={data.fileData} alt={data.fileName ?? "Yüklenen dosya"} /> : data.fileType === "application/pdf" ? <iframe title={data.fileName ?? "PDF önizleme"} src={data.fileData} /> : <div className="file-document">📄<span>{data.fileName}</span></div>}<a href={data.fileData} download={data.fileName ?? "palas-dosyasi"}><Upload size={13} />{tr ? "İndir" : "Download"}</a></div> : <button className="file-drop nodrag" onClick={() => uploadRef.current?.click()}><Upload size={18} /><span>{tr ? "Dosya seç" : "Choose a file"}</span></button>}{fileUpload}<HandleLabel /></motion.div>;

  if (kind === "sheet") return <div className="palas-node sheet-node"><div className="node-topline"><span className="node-kicker"><CloudUpload size={12} /> CSV / SHEETS</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>{title}
    <form className="sheet-url nodrag" onSubmit={(event) => { event.preventDefault(); setSheetError(""); Papa.parse<string[]>(sheetUrl, { download: true, skipEmptyLines: true, complete: (result) => updateNode(id, { rows: result.data }), error: () => setSheetError(tr ? "CSV bağlantısı okunamadı" : "Could not read CSV URL") }); }}><input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder="Google Sheets CSV URL" /><button aria-label="Bağlantıyı aç"><Send size={12} /></button></form>
    <input ref={sheetRef} className="hidden-file" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) Papa.parse<string[]>(file, { skipEmptyLines: true, complete: (result) => updateNode(id, { rows: result.data }) }); }} />
    {sheetError && <small className="sheet-error">{sheetError}</small>}
    <button className="sheet-upload nodrag" onClick={() => sheetRef.current?.click()}><Upload size={12} />{tr ? "CSV yükle" : "Upload CSV"}</button>
    <div className="sheet-table-wrap nodrag"><table><tbody>{(data.rows ?? [["Görev", "Durum"], ["İlk küçük adım", "Bekliyor"]]).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><input aria-label={`${rowIndex + 1}. satır, ${cellIndex + 1}. sütun`} value={cell} onChange={(event) => { const rows = (data.rows ?? [["Görev", "Durum"], ["İlk küçük adım", "Bekliyor"]]).map((values) => [...values]); rows[rowIndex][cellIndex] = event.target.value; updateNode(id, { rows }); }} /></td>)}</tr>)}</tbody></table></div>
    <button className="sheet-add-row nodrag" onClick={() => updateNode(id, { rows: [...(data.rows ?? [["Görev", "Durum"], ["İlk küçük adım", "Bekliyor"]]), ["Yeni satır", "Planlandı"]] })}><Plus size={12} />{tr ? "Satır ekle" : "Add row"}</button><HandleLabel /></div>;

  if (kind === "invisible") return <div className="palas-node invisible-node" title={tr ? "UV ışığı altında görünür" : "Visible under UV light"}><Sparkles size={13} />{title}<HandleLabel /></div>;

  if (kind === "stamp") return <div className="stamp-node"><span className="stamp-ring">{data.label}</span><HandleLabel /></div>;

  if (kind === "stain") return <div className="coffee-stain-node" title={data.label}><span /><HandleLabel /></div>;

  if (kind === "napkin") return <div className={`palas-node memory-node napkin-node ${selected ? "node-selected" : ""}`}>
    <div className="node-topline"><span className="node-kicker">☕ {tr ? "KAFE PEÇETESİ" : "CAFE NAPKIN"}</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>
    {title}<textarea className="node-body nodrag" value={data.body ?? ""} placeholder={tr ? "Bir şeyler karala..." : "Doodle a thought..."} onChange={(event) => updateNode(id, { body: event.target.value })} onPointerDown={(event) => event.stopPropagation()} /><HandleLabel />
  </div>;

  const isIdea = kind === "idea";
  return <motion.div className={`palas-node memory-node ${isIdea ? "idea-node" : ""} ${selected ? "node-selected" : ""} ${data.hanging ? "hanging-card" : ""} ${data.burning ? "burning-card" : ""}`} animate={data.hanging ? { rotate: [-2.5, 2.5, -2.5], scale: .6 } : data.burning ? { scale: 0, opacity: 0, rotate: -16 } : {}} transition={data.hanging ? { type: "spring", stiffness: 45, damping: 5, repeat: Infinity, repeatType: "mirror" } : { duration: .4 }} whileHover={data.hanging ? { scale: .85 } : undefined}>
    {data.hanging && <Clothespin />}
    <div className="node-topline"><span className="node-kicker">{isIdea ? <><Sparkles size={12} /> KÜÇÜK BİR HAYAL</> : <><Heart size={12} /> BUGÜNDEN BİR ANI</>}</span><button className="node-delete nodrag" aria-label="Sil" onClick={removeNode}><MoreHorizontal size={16} /></button></div>
    {title}
    <textarea className="node-body nodrag" aria-label="Kart metni" value={data.body ?? ""} placeholder={tr ? "Bu anı biraz anlat..." : "Tell a little more..."} onChange={(event) => updateNode(id, { body: event.target.value })} onPointerDown={(event) => event.stopPropagation()} />
    <div className="node-footer"><span className="node-date">{tr ? "BUGÜN, GÜZEL BİR GÜN" : "TODAY, A LOVELY DAY"}</span><span className="node-heart">♡</span></div>
    <div className="note-actions nodrag"><button title={tr ? "Uçur" : "Fly note"} onClick={() => { playCozySound("rustle"); setPlaneFlight(true); }}><Send size={12} />{tr ? "Uçur" : "Fly"}</button><button title={tr ? "Şişeye koy" : "Put in bottle"} onClick={() => { const bottleId = addNode("bottle", data.label); usePalasStore.getState().updateNode(bottleId, { body: data.body }); }}><Mail size={12} />{tr ? "Şişeye koy" : "Bottle"}</button><button title={tr ? "Mühür ekle" : "Add wax seal"} onClick={() => { const stampId = addNode("stamp", tr ? "SENİ SEVİYORUM" : "WITH LOVE"); const current = usePalasStore.getState().nodes.find((node) => node.id === id); if (current) setNodes(usePalasStore.getState().nodes.map((node) => node.id === stampId ? { ...node, position: { x: current.position.x + 185, y: current.position.y + 52 } } : node)); playCozySound("stamp"); }}><Heart size={12} />{tr ? "Mühür" : "Seal"}</button></div>
    <AnimatePresence>{planeFlight && <motion.div className="plane-flight" initial={{ x: 0, y: 0, rotate: 0, scale: 1 }} animate={{ x: 245, y: -115, rotate: 360, scale: .8 }} transition={{ duration: .85, ease: [0.2, 0.8, 0.25, 1] }} onAnimationComplete={() => { const current = usePalasStore.getState().nodes.find((node) => node.id === id); if (current) setNodes(usePalasStore.getState().nodes.map((node) => node.id === id ? { ...node, position: { x: current.position.x + 250, y: current.position.y - 115 } } : node)); setPlaneFlight(false); }}><Send size={24} /></motion.div>}</AnimatePresence>
    <HandleLabel />
  </motion.div>;
}

function Clothespin() {
  return <svg className="clothespin-svg" viewBox="0 0 22 34" aria-hidden="true"><path d="M7 1h8l1 11-2 4 2 16H6l2-16-2-4z" fill="#d2a16a" stroke="#8d6544" strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 13h8M8 16h6M10 2v10" fill="none" stroke="#f1d2a3" strokeWidth="1.4" strokeLinecap="round" /><path d="M8 17l3 2 3-2" fill="none" stroke="#8d6544" strokeWidth="1.2" /></svg>;
}

function HandleLabel() {
  const nodeId = useNodeId();
  const setActiveTool = usePalasStore((state) => state.setActiveTool);
  const node = usePalasStore((state) => state.nodes.find((item) => item.id === nodeId));
  const buryOrRestore = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!node) return;
    const state = usePalasStore.getState();
    if (node.data.buriedOriginal) {
      const original = node.data.buriedOriginal;
      state.setNodes(state.nodes.map((item) => item.id === node.id ? { ...item, type: resolveNodeType(original.kind), data: original } : item));
    } else if (!(node.data.lockedUntil && node.data.lockedUntil > Date.now() && !node.data.unlockForced)) {
      state.setNodes(state.nodes.map((item) => item.id === node.id ? { ...item, type: "capsule", data: { ...item.data, kind: "capsule", buriedOriginal: { ...item.data, kind: String(item.type) } } } : item));
      playCozySound("dig");
    }
    setActiveTool("select");
  };
  const deleteNode = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (nodeId) burnNode(nodeId);
  };
  const togglePositionLock = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!node) return;
    const locked = !node.data.positionLocked;
    usePalasStore.getState().setNodes(usePalasStore.getState().nodes.map((item) => item.id === node.id ? { ...item, draggable: !locked, data: { ...item.data, positionLocked: locked } } : item));
  };
  return <><Handle type="target" position={Position.Top} /><Handle type="source" position={Position.Bottom} />{nodeId && <div className="node-action-bar nodrag" data-no-bury onPointerDown={(event) => event.stopPropagation()}><button title={node?.data.buriedOriginal ? "Topraktan çıkar" : "Göm"} aria-label={node?.data.buriedOriginal ? "Topraktan çıkar" : "Göm"} onClick={buryOrRestore}><Shovel size={13} /></button><button title={node?.data.positionLocked ? "Konum kilidini aç" : "Konumu sabitle"} aria-label={node?.data.positionLocked ? "Konum kilidini aç" : "Konumu sabitle"} onClick={togglePositionLock}>{node?.data.positionLocked ? <Lock size={13} /> : <Unlock size={13} />}</button><button title="Sil" aria-label="Sil" onClick={deleteNode}><Trash2 size={13} /></button></div>}</>;
}

function resolveNodeType(kind: string) {
  return ["photo", "plant", "bottle", "capsule", "vault", "campfire", "coffee", "clothesline", "fence", "file", "invisible", "stamp", "sheet", "napkin", "stain"].includes(kind) ? kind : "memory";
}

const nodeTypes: NodeTypes = { memory: PalasNode, photo: PalasNode, plant: PalasNode, bottle: PalasNode, capsule: PalasNode, vault: PalasNode, campfire: PalasNode, coffee: PalasNode, clothesline: PalasNode, fence: PalasNode, file: PalasNode, invisible: PalasNode, stamp: PalasNode, sheet: PalasNode, napkin: PalasNode, stain: PalasNode };

function BoardCanvasContent({ search, locale, focusNodeIds = [], viewFilter = "home", backgroundUrl }: CanvasProps) {
  const nodes = usePalasStore((state) => state.nodes);
  const edges = usePalasStore((state) => state.edges);
  const campfireFocus = usePalasStore((state) => state.campfireFocus);
  const activeTool = usePalasStore((state) => state.activeTool);
  const setNodes = usePalasStore((state) => state.setNodes);
  const setEdges = usePalasStore((state) => state.setEdges);
  const reactFlow = useReactFlow<Node<PalasNodeData>>();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; screenX: number; screenY: number; nodeId?: string } | null>(null);
  const [canvasExtent, setCanvasExtent] = useState<[[number, number], [number, number]]>([[0, 0], [Infinity, Infinity]]);

  useOnViewportChange({ onChange: (viewport) => {
    const flowElement = document.querySelector<HTMLElement>(".react-flow");
    if (!flowElement || !viewport.zoom) return;
    const bounds = flowElement.getBoundingClientRect();
    usePalasStore.getState().setCanvasCenter({
      x: (bounds.width / 2 - viewport.x) / viewport.zoom,
      y: (bounds.height / 2 - viewport.y) / viewport.zoom,
    });
  } });

  useEffect(() => {
    const flowElement = document.querySelector<HTMLElement>(".react-flow");
    if (!flowElement) return;
    const observer = new ResizeObserver(([entry]) => {
      setCanvasExtent([[0, 0], [entry.contentRect.width / .3, entry.contentRect.height / .3]]);
    });
    observer.observe(flowElement);
    return () => observer.disconnect();
  }, []);
  const filteredNodes = useMemo(() => nodes.map((node) => {
    const textMatches = !search.trim() || `${node.data.label} ${node.data.body ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const categoryMatches = viewFilter === "home" || (viewFilter === "memories"
      ? ["memory", "photo", "bottle", "capsule", "napkin"].includes(node.data.kind)
      : ["idea", "plant", "sheet"].includes(node.data.kind));
    return { ...node, hidden: !textMatches || !categoryMatches };
  }), [nodes, search, viewFilter]);

  useEffect(() => {
    if (!focusNodeIds.length) return;
    const frame = window.requestAnimationFrame(() => { void reactFlow.fitView({ nodes: focusNodeIds.map((id) => ({ id })), padding: .24, duration: 650 }); });
    return () => window.cancelAnimationFrame(frame);
  }, [focusNodeIds, reactFlow]);
  const onNodesChange = useCallback((changes: NodeChange<Node<PalasNodeData>>[]) => {
    const removedIds = new Set(changes.filter((change) => change.type === "remove").map((change) => change.id));
    if (removedIds.size) setEdges(edges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)));
    const nextNodes = applyNodeChanges(changes, nodes) as Node<PalasNodeData>[];
    const lineDeltas = new Map<string, { x: number; y: number }>();
    changes.forEach((change) => {
      if (change.type !== "position" || !change.position) return;
      const previous = nodes.find((node) => node.id === change.id);
      if (!previous || previous.data.kind !== "clothesline") return;
      lineDeltas.set(change.id, { x: change.position.x - previous.position.x, y: change.position.y - previous.position.y });
    });
    setNodes(nextNodes.map((node) => {
      const delta = node.data.hangOnLine ? lineDeltas.get(node.data.hangOnLine) : undefined;
      return delta ? { ...node, position: { x: node.position.x + delta.x, y: node.position.y + delta.y } } : node;
    }));
  }, [nodes, edges, setNodes, setEdges]);
  const onConnect = useCallback((connection: Connection) => setEdges(addEdge({ ...connection, type: "smoothstep", animated: true, style: { stroke: "#879778", strokeWidth: 2 } }, edges)), [edges, setEdges]);
  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, dragged: Node<PalasNodeData>) => {
    const nodeElements = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"));
    const draggedElement = nodeElements.find((element) => element.dataset.id === dragged.id);
    if (!draggedElement) return;
    const draggedRect = draggedElement.getBoundingClientRect();
    const emberBowl = document.querySelector<HTMLElement>(".campfire-bin");
    const bowlRect = emberBowl?.getBoundingClientRect();
    if (bowlRect && draggedRect.left < bowlRect.right && draggedRect.right > bowlRect.left && draggedRect.top < bowlRect.bottom && draggedRect.bottom > bowlRect.top) {
      burnNode(dragged.id, { x: (bowlRect.left + bowlRect.width / 2) / window.innerWidth, y: (bowlRect.top + bowlRect.height / 2) / window.innerHeight });
      return;
    }
    const collision = nodes.find((target) => {
      if (target.id === dragged.id || !["clothesline", "campfire", "fence"].includes(target.data.kind)) return false;
      const targetElement = nodeElements.find((element) => element.dataset.id === target.id);
      if (!targetElement) return false;
      const bounds = targetElement.getBoundingClientRect();
      return draggedRect.left < bounds.right && draggedRect.right > bounds.left && draggedRect.top < bounds.bottom && draggedRect.bottom > bounds.top;
    });
    if (!collision) return;
    if (collision.data.kind === "campfire") {
      if (dragged.data.kind === "campfire") return;
      burnNode(dragged.id, { x: (draggedRect.left + draggedRect.width / 2) / window.innerWidth, y: (draggedRect.top + draggedRect.height / 2) / window.innerHeight });
      return;
    }
    if (collision.data.kind === "fence") {
      if (dragged.data.kind === "fence" || dragged.data.kind === "campfire") return;
      const child = { ...dragged, parentId: collision.id, extent: "parent" as const, position: { x: dragged.position.x - collision.position.x, y: dragged.position.y - collision.position.y } };
      const nextNodes = nodes.filter((node) => node.id !== dragged.id).map((node) => node.id === collision.id ? { ...node, zIndex: 0 } : node);
      const parentIndex = nextNodes.findIndex((node) => node.id === collision.id);
      nextNodes.splice(parentIndex + 1, 0, { ...child, zIndex: 1 });
      setNodes(nextNodes);
      return;
    }
    if (!["memory", "note", "idea", "photo", "file"].includes(dragged.data.kind) || dragged.data.hanging) return;
    const lineIds = [...nodes.filter((node) => node.data.hangOnLine === collision.id).map((node) => node.id), dragged.id];
    setNodes(nodes.map((node) => {
      const index = lineIds.indexOf(node.id);
      return index < 0 ? node : { ...node, position: clotheslinePosition(collision, lineIds.length, index), data: { ...node.data, hanging: true, hangOnLine: collision.id } };
    }));
    playCozySound("rustle");
  }, [nodes, setNodes, setEdges]);

  const openContextMenu = useCallback((event: MouseEvent | React.MouseEvent, nodeId?: string) => {
    if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
    event.preventDefault();
    const flowElement = document.querySelector<HTMLElement>(".react-flow");
    if (!flowElement) return;
    const bounds = flowElement.getBoundingClientRect();
    setContextMenu({ x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - 205)), y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - 230)), screenX: event.clientX, screenY: event.clientY, nodeId });
  }, []);

  const addNodeAtContext = (kind: string, label: string) => {
    if (!contextMenu) return;
    const position = reactFlow.screenToFlowPosition({ x: contextMenu.screenX, y: contextMenu.screenY });
    const store = usePalasStore.getState();
    const id = store.addNode(kind, label);
    store.setNodes(usePalasStore.getState().nodes.map((node) => node.id === id ? { ...node, position } : node));
    setContextMenu(null);
  };

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const point = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".react-flow__node[data-id]");
    const targetId = targetElement?.dataset.id;
    const targetNode = targetId ? usePalasStore.getState().nodes.find((node) => node.id === targetId) : undefined;
    const line = targetNode?.data.kind === "clothesline" ? targetNode : undefined;
    const isImage = file.type.startsWith("image/");
    const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
    const kind = isImage ? "photo" : isText ? "memory" : "file";
    const id = usePalasStore.getState().addNode(kind, file.name);
    const store = usePalasStore.getState();
    let updated = store.nodes.map((node) => node.id === id ? { ...node, position: point, data: { ...node.data, ...(isImage ? { fileName: file.name } : {}) } } : node);
    if (line) {
      const lineIds = [...updated.filter((node) => node.data.hangOnLine === line.id).map((node) => node.id), id];
      updated = updated.map((node) => {
        const index = lineIds.indexOf(node.id);
        return index < 0 ? node : { ...node, position: clotheslinePosition(line, lineIds.length, index), data: { ...node.data, hanging: true, hangOnLine: line.id } };
      });
      playCozySound("rustle");
    }
    store.setNodes(updated);
    if (isText) {
      void file.text().then((body) => usePalasStore.getState().updateNode(id, { body }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => usePalasStore.getState().updateNode(id, isImage
      ? { imageUrl: String(reader.result), fileName: file.name }
      : { fileData: String(reader.result), fileName: file.name, fileType: file.type || "application/octet-stream" });
    reader.readAsDataURL(file);
  }, [reactFlow]);

  const handleNodeClick = useCallback((event: React.MouseEvent, clickedNode: Node<PalasNodeData>) => {
    const target = event.target;
    if (target instanceof Element && target.closest("button, input, textarea, select, a, [data-no-bury]")) return;
    if (activeTool !== "shovel") return;
    if (clickedNode.data.buriedOriginal) {
      const original = clickedNode.data.buriedOriginal;
      const type = resolveNodeType(original.kind);
      setNodes(nodes.map((node) => node.id === clickedNode.id ? { ...node, type, data: original } : node));
      usePalasStore.getState().setActiveTool("select");
      playCozySound("dig");
      return;
    }
    if (clickedNode.data.lockedUntil && clickedNode.data.lockedUntil > Date.now() && !clickedNode.data.unlockForced) { playCozySound("dig"); return; }
    setNodes(nodes.map((node) => node.id === clickedNode.id ? { ...node, type: "capsule", data: { ...node.data, kind: "capsule", buriedOriginal: { ...node.data, kind: String(node.type) } } } : node));
    usePalasStore.getState().setActiveTool("select");
    playCozySound("dig");
  }, [activeTool, nodes, setNodes]);

  return <><ReactFlow nodes={filteredNodes} edges={edges} onNodesChange={onNodesChange} onNodeClick={handleNodeClick} onNodeContextMenu={(event, node) => openContextMenu(event, node.id)} onPaneContextMenu={(event) => openContextMenu(event)} onPaneClick={() => setContextMenu(null)} onNodeDragStop={onNodeDragStop} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} onEdgesChange={(changes) => setEdges(changes.reduce((list, change) => change.type === "remove" ? list.filter((edge) => edge.id !== change.id) : list, edges))} onConnect={onConnect} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: .18 }} minZoom={.3} maxZoom={1.5} translateExtent={canvasExtent} deleteKeyCode={null} proOptions={{ hideAttribution: true }} defaultEdgeOptions={{ type: "smoothstep" }}>
    {backgroundUrl && <ScenicWorldBackground imageUrl={backgroundUrl} />}
    <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--canvas-dot)" />
    <Controls showInteractive={false} position="bottom-right" />
    <MiniMap position="top-right" pannable zoomable nodeColor={(node) => node.type === "plant" ? "#9eb695" : node.type === "photo" ? "#e9b88c" : "#e7d8b8"} />
    <div className="canvas-hint">{locale === "tr" ? "Kartları sürükle, anılarına yer aç" : "Drag your cards and make room for memories"}</div>
    {contextMenu && <section className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onPointerDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <strong>{contextMenu.nodeId ? (locale === "tr" ? "Kart seçenekleri" : "Card options") : (locale === "tr" ? "Buraya ekle" : "Add here")}</strong>
      {contextMenu.nodeId ? <>
        <button onClick={() => {
          const current = usePalasStore.getState();
          const selected = current.nodes.find((node) => node.id === contextMenu.nodeId);
          if (selected) {
            const locked = !selected.data.positionLocked;
            current.setNodes(current.nodes.map((node) => node.id === selected.id ? { ...node, draggable: !locked, data: { ...node.data, positionLocked: locked } } : node));
          }
          setContextMenu(null);
        }}><LockKeyhole size={13} />{locale === "tr" ? "Konumu sabitle / aç" : "Lock / unlock position"}</button>
        <button className="context-danger" onClick={() => { burnNode(contextMenu.nodeId!); setContextMenu(null); }}><Flame size={13} />{locale === "tr" ? "Közde yak" : "Burn away"}</button>
      </> : <>
        <button onClick={() => addNodeAtContext("note", locale === "tr" ? "Yeni bir not" : "A new note")}><Plus size={13} />{locale === "tr" ? "Yapışkan not" : "Sticky note"}</button>
        <button onClick={() => addNodeAtContext("photo", locale === "tr" ? "Yeni bir polaroid" : "A new polaroid")}><Plus size={13} />{locale === "tr" ? "Polaroid" : "Polaroid"}</button>
        <button onClick={() => addNodeAtContext("clothesline", locale === "tr" ? "Anı İpi" : "Memory line")}><Plus size={13} />{locale === "tr" ? "Anı İpi" : "Memory line"}</button>
        <button onClick={() => addNodeAtContext("fence", locale === "tr" ? "Çit Alanı" : "Fence Area")}><Plus size={13} />{locale === "tr" ? "Çit Alanı" : "Fence Area"}</button>
      </>}
    </section>}
  </ReactFlow>{campfireFocus && <div className="campfire-vignette" aria-hidden="true" />}</>;
}

export function BoardCanvas(props: CanvasProps) {
  const activeTool = usePalasStore((state) => state.activeTool);
  const theme = usePalasStore((state) => state.theme);
  const setActiveTool = usePalasStore((state) => state.setActiveTool);
  const [spotlight, setSpotlight] = useState({ x: -300, y: -300 });
  const [peers, setPeers] = useState<Record<string, { x: number; y: number; name: string; updatedAt: number }>>({});
  const [burst, setBurst] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: string; name: string; text: string }[]>();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const peerId = useRef("");
  const lastPresenceSent = useRef(0);
  const presenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    peerId.current = `palas-${crypto.randomUUID()}`;
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("palas-presence");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<{ type: string; id: string; x?: number; y?: number; name?: string; text?: string }>) => {
      const message = event.data;
      if (message.id === peerId.current) return;
      if (message.type === "cursor") setPeers((current) => ({ ...current, [message.id]: { x: message.x ?? 0, y: message.y ?? 0, name: message.name ?? "Misafir", updatedAt: Date.now() } }));
      if (message.type === "leave") setPeers((current) => { const next = { ...current }; delete next[message.id]; return next; });
      if (message.type === "highfive") {
        setBurst(`${message.id}-${Date.now()}`);
        confetti({ particleCount: 34, spread: 66, origin: { x: .5, y: .53 }, colors: ["#e88d8a", "#e8c568", "#88a77b"] });
      }
      if (message.type === "chat" && message.text) setChatMessages((current) => [...(current ?? []).slice(-7), { id: message.id, name: message.name ?? "Misafir", text: message.text ?? "" }]);
    };
    const cleanupPeers = window.setInterval(() => setPeers((current) => Object.fromEntries(Object.entries(current).filter(([, peer]) => Date.now() - peer.updatedAt < 5000))), 2500);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape" && usePalasStore.getState().activeTool !== "select") { usePalasStore.getState().setActiveTool("select"); return; }
      if (event.key === "/") { event.preventDefault(); setChatOpen(true); }
      if (event.key === "Escape") setChatOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearInterval(cleanupPeers);
      channel.postMessage({ type: "leave", id: peerId.current });
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const sendHighFive = useCallback(() => {
    setBurst(`local-${Date.now()}`);
    confetti({ particleCount: 44, spread: 72, origin: { x: .5, y: .55 }, colors: ["#e88d8a", "#e8c568", "#88a77b"] });
    channelRef.current?.postMessage({ type: "highfive", id: peerId.current });
    if (presenceTimer.current) clearTimeout(presenceTimer.current);
    presenceTimer.current = setTimeout(() => setBurst(""), 1600);
  }, []);

  const moveSpotlight = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setSpotlight({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    if (Date.now() - lastPresenceSent.current > 45) {
      lastPresenceSent.current = Date.now();
      channelRef.current?.postMessage({ type: "cursor", id: peerId.current, name: "Saray sakini", x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height });
    }
  }, []);
  const toggleTool = useCallback((tool: ActiveTool) => setActiveTool(activeTool === tool ? "select" : tool), [activeTool, setActiveTool]);
  const sendChat = (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatText.trim()) return;
    const message = { type: "chat", id: peerId.current, name: "Saray sakini", text: chatText.trim() };
    setChatMessages((current) => [...(current ?? []).slice(-7), { id: message.id, name: message.name, text: message.text }]);
    channelRef.current?.postMessage(message);
    setChatText("");
  };
  return <div className={`react-flow-wrap tool-${activeTool} ${props.backgroundUrl ? "has-scenic-background" : ""}`} onPointerMove={moveSpotlight}>
    <ReactFlowProvider><BoardCanvasContent {...props} /></ReactFlowProvider>
    {activeTool === "uv" && <div className={`uv-lantern ${theme === "dark" ? "uv-lantern-dark" : ""}`} style={{ background: `radial-gradient(circle 145px at ${spotlight.x}px ${spotlight.y}px, transparent 0 72px, ${theme === "dark" ? "rgba(5, 8, 24, .93)" : "rgba(25, 30, 48, .72)"} 145px)` }} />}
    <div className="tool-modes"><button className={activeTool === "shovel" ? "tool-active" : ""} title={props.locale === "tr" ? "Kürek (S)" : "Shovel (S)"} onClick={() => toggleTool("shovel")}><Shovel size={15} /></button><button className={activeTool === "uv" ? "tool-active" : ""} title={props.locale === "tr" ? "UV Fener (U)" : "UV lantern (U)"} onClick={() => toggleTool("uv")}><Sparkles size={15} /></button></div>
    <div className="presence-actions"><button title={props.locale === "tr" ? "H tuşu: kalp gönder" : "Press H to send a heart"} onClick={sendHighFive}><Heart size={15} /></button><button title={props.locale === "tr" ? "/ tuşu: kısa sohbet" : "Press / for quick chat"} onClick={() => setChatOpen(!chatOpen)}><MessageCircle size={15} /></button></div>
    {Object.entries(peers).map(([id, peer]) => <div className="peer-cursor" key={id} style={{ left: `${peer.x * 100}%`, top: `${peer.y * 100}%` }}><MousePointer2 size={17} fill="#e89980" /><span>{peer.name}</span></div>)}
    {burst && <motion.div key={burst} className="heart-burst" initial={{ opacity: 0, scale: .4, y: 8 }} animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 1], y: [8, -14, -38] }} transition={{ duration: 1.35 }}>♡</motion.div>}
    {chatOpen && <motion.section className="cursor-chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><header><span><MessageCircle size={13} /> {props.locale === "tr" ? "Kısa sohbet" : "Quick chat"}</span><button aria-label="Kapat" onClick={() => setChatOpen(false)}><X size={14} /></button></header><div className="chat-messages">{(chatMessages ?? []).length ? (chatMessages ?? []).map((message, index) => <p key={`${message.id}-${index}`}><b>{message.name}</b>{message.text}</p>) : <small>{props.locale === "tr" ? "Aynı panodaki kişilere merhaba de." : "Say hello to people on this board."}</small>}</div><form onSubmit={sendChat}><input autoFocus value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={props.locale === "tr" ? "Bir şey yaz..." : "Write something..."} /><button aria-label="Gönder"><Send size={14} /></button></form></motion.section>}
  </div>;
}