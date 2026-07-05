/**
 * Persistent state for the "AI Sinh theo Batch" run, so switching page/tab in the card
 * tool does NOT lose the in-progress generation or its logs. The run loop lives in the
 * BatchGeneratorPanel callback but reads/writes THIS store (not component state), so it
 * survives the panel unmounting on navigation; the panel just re-subscribes on remount.
 */
import { create } from 'zustand';
import type { BatchProgress } from '../lib/ai/batchGenerator';

interface BatchRunState {
  isRunning: boolean;
  isPaused: boolean;
  stopped: boolean;
  progress: BatchProgress | null;
  logs: string[];

  setIsRunning: (v: boolean) => void;
  setPaused: (v: boolean) => void;
  setStopped: (v: boolean) => void;
  setProgress: (p: BatchProgress | null) => void;
  addLog: (msg: string) => void;
  /** Clear logs + progress and arm a fresh run (isRunning stays as set by caller). */
  beginRun: () => void;
}

export const useBatchRunStore = create<BatchRunState>((set) => ({
  isRunning: false,
  isPaused: false,
  stopped: false,
  progress: null,
  logs: [],

  setIsRunning: (v) => set({ isRunning: v }),
  setPaused: (v) => set({ isPaused: v }),
  setStopped: (v) => set({ stopped: v }),
  setProgress: (p) => set({ progress: p }),
  addLog: (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
  beginRun: () => set({ logs: [], progress: null, stopped: false, isPaused: false }),
}));
