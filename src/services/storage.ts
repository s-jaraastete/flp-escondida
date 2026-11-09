import type { Experience, FlpData, Session } from '@/types';
import { DATA_VERSION, buildSeed } from '@/data/seed';

export const DATA_KEY = 'flp-escondida:data';
export const sessionKey = (exp: Experience) => `flp-escondida:session:${exp}`;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible (modo privado): la demo sigue en memoria */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

export function loadData(): FlpData {
  const raw = safeGet(DATA_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as FlpData;
      if (parsed.version === DATA_VERSION && Array.isArray(parsed.slots)) return parsed;
    } catch {
      /* datos corruptos: se regeneran */
    }
  }
  const seed = buildSeed();
  saveData(seed);
  return seed;
}

export function saveData(d: FlpData) {
  safeSet(DATA_KEY, JSON.stringify(d));
}

export function resetData(): FlpData {
  const seed = buildSeed();
  saveData(seed);
  return seed;
}

export function loadSession(exp: Experience): Session | null {
  const raw = safeGet(sessionKey(exp));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}
export function saveSession(exp: Experience, s: Session | null) {
  if (s) safeSet(sessionKey(exp), JSON.stringify(s));
  else safeRemove(sessionKey(exp));
}
