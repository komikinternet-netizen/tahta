export type CozySound = "shutter" | "rustle" | "dig" | "stamp" | "cork" | "fire" | "rain";
export type Ambience = "warm" | "rain" | "fire" | "pulse";

let audioContext: AudioContext | null = null;
let soundLevel = 0.7;
const ambienceGains = new Set<GainNode>();

export function setSoundLevel(level: number) {
  soundLevel = Math.max(0, Math.min(1, level));
  const context = getContext();
  if (!context) return;
  ambienceGains.forEach((gain) => gain.gain.setTargetAtTime(.012 * soundLevel, context.currentTime, .04));
}

function getContext() {
  if (typeof window === "undefined") return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

export function playCozySound(sound: CozySound) {
  const context = getContext();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const settings: Record<CozySound, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
    shutter: { frequency: 880, duration: .07, type: "square", volume: .025 },
    rustle: { frequency: 260, duration: .16, type: "triangle", volume: .014 },
    dig: { frequency: 115, duration: .2, type: "sine", volume: .04 },
    stamp: { frequency: 72, duration: .09, type: "triangle", volume: .04 },
    cork: { frequency: 420, duration: .12, type: "triangle", volume: .03 },
    fire: { frequency: 68, duration: .3, type: "sawtooth", volume: .008 },
    rain: { frequency: 510, duration: .24, type: "sine", volume: .006 },
  };
  const soundSettings = settings[sound];
  oscillator.type = soundSettings.type;
  oscillator.frequency.setValueAtTime(soundSettings.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, soundSettings.frequency * .58), now + soundSettings.duration);
  gain.gain.setValueAtTime(soundSettings.volume * soundLevel, now);
  gain.gain.exponentialRampToValueAtTime(.0001, now + soundSettings.duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + soundSettings.duration);
}

export function startAmbience(mode: Ambience) {
  const context = getContext();
  if (!context) return () => undefined;
  const master = context.createGain();
  master.gain.value = .012 * soundLevel;
  master.connect(context.destination);
  ambienceGains.add(master);
  const oscillators: OscillatorNode[] = [];
  const frequencies: Record<Ambience, number[]> = { warm: [110, 164.81], rain: [164, 221], fire: [55, 82], pulse: [110, 220] };
  frequencies[mode].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const voice = context.createGain();
    oscillator.type = mode === "pulse" ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    voice.gain.value = index ? .36 : .64;
    oscillator.connect(voice).connect(master);
    oscillator.start();
    oscillators.push(oscillator);
  });
  return () => {
    master.gain.setTargetAtTime(.0001, context.currentTime, .08);
    oscillators.forEach((oscillator) => oscillator.stop(context.currentTime + .3));
    window.setTimeout(() => ambienceGains.delete(master), 400);
  };
}