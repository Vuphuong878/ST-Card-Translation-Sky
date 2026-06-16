/* ─── Preset Library — IndexedDB CRUD for saved presets ─── */
import type { SavedPreset } from '../types/card';
import { IDB } from './idb';

const LIBRARY_KEY = 'st-translator-preset-library';

/**
 * Get all saved presets from library.
 */
export async function getAllPresets(): Promise<SavedPreset[]> {
  const presets = await IDB.get<SavedPreset[] | null>(LIBRARY_KEY, null);
  return presets || [];
}

/**
 * Get a preset by ID.
 */
export async function getPresetById(id: string): Promise<SavedPreset | null> {
  const presets = await getAllPresets();
  return presets.find(p => p.id === id) || null;
}

/**
 * Save a preset to the library.
 * If a preset with the same ID exists, it will be replaced.
 */
export async function savePresetToLibrary(preset: SavedPreset): Promise<void> {
  const presets = await getAllPresets();
  const idx = presets.findIndex(p => p.id === preset.id);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  await IDB.set(LIBRARY_KEY, presets);
}

/**
 * Delete a preset from the library.
 */
export async function deletePreset(id: string): Promise<void> {
  const presets = await getAllPresets();
  const filtered = presets.filter(p => p.id !== id);
  await IDB.set(LIBRARY_KEY, filtered);
}

/**
 * Update the lastUsedAt timestamp for a preset.
 */
export async function updatePresetLastUsed(id: string): Promise<void> {
  const presets = await getAllPresets();
  const preset = presets.find(p => p.id === id);
  if (preset) {
    preset.lastUsedAt = Date.now();
    await IDB.set(LIBRARY_KEY, presets);
  }
}

/**
 * Rename a preset.
 */
export async function renamePreset(id: string, newName: string): Promise<void> {
  const presets = await getAllPresets();
  const preset = presets.find(p => p.id === id);
  if (preset) {
    preset.name = newName;
    await IDB.set(LIBRARY_KEY, presets);
  }
}
