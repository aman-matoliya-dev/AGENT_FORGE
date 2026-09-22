import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, ReactNode } from 'react';
import type { DeviceSpecs } from '../data/hardware';
import type { AgentConfig } from '../data/codegen';
import type { AgentType } from '../data/models';

interface AppState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  device: DeviceSpecs | null;
  setDevice: (d: DeviceSpecs | null) => void;
  agentType: AgentType;
  setAgentType: (t: AgentType) => void;
  agents: AgentConfig[];
  saveAgent: (a: AgentConfig) => void;
  deleteAgent: (id: string) => void;
  done: string[];                    // completed lesson ids
  toggleLesson: (id: string) => void;
  brainPref: 'local' | 'api' | null;
  setBrainPref: (b: 'local' | 'api') => void;
}

const Ctx = createContext<AppState | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full/blocked */ }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => load('af:theme', 'dark'));
  const [device, setDeviceRaw] = useState<DeviceSpecs | null>(() => load('af:device', null));
  const [agentType, setAgentTypeRaw] = useState<AgentType>(() => load('af:agentType', 'general'));
  const [agents, setAgents] = useState<AgentConfig[]>(() => load('af:agents', []));
  const [done, setDone] = useState<string[]>(() => load('af:done', []));
  const [brainPref, setBrainPrefRaw] = useState<'local' | 'api' | null>(() => load('af:brain', null));

  useEffect(() => save('af:device', device), [device]);
  useEffect(() => save('af:agentType', agentType), [agentType]);
  useEffect(() => save('af:agents', agents), [agents]);
  useEffect(() => save('af:done', done), [done]);
  useEffect(() => save('af:brain', brainPref), [brainPref]);
  useLayoutEffect(() => {
    save('af:theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const value = useMemo<AppState>(() => ({
    theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    device, setDevice: setDeviceRaw,
    agentType, setAgentType: setAgentTypeRaw,
    agents,
    saveAgent: (a) => setAgents((prev) => {
      const i = prev.findIndex((x) => x.id === a.id);
      if (i >= 0) { const next = [...prev]; next[i] = a; return next; }
      return [a, ...prev];
    }),
    deleteAgent: (id) => setAgents((prev) => prev.filter((x) => x.id !== id)),
    done, toggleLesson: (id) => setDone((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]),
    brainPref, setBrainPref: setBrainPrefRaw,
  }), [theme, device, agentType, agents, done, brainPref]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
