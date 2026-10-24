export const viewPreferencesKey = 'eh-view-preferences-v1';

export function normalizeViewPreferences(value = {}) {
  return {
    motion: ['system', 'reduced', 'full'].includes(value?.motion) ? value.motion : 'system',
    graphics: value?.graphics === 'low' ? 'low' : 'standard',
    controlsSeen: value?.controlsSeen === true,
  };
}

export function readViewPreferences(storage) {
  try { return normalizeViewPreferences(JSON.parse(storage?.getItem(viewPreferencesKey) || '{}')); }
  catch { return normalizeViewPreferences(); }
}

export function saveViewPreferences(storage, value) {
  const preferences = normalizeViewPreferences(value);
  try { storage?.setItem(viewPreferencesKey, JSON.stringify(preferences)); } catch { /* Session controls still work without storage. */ }
  return preferences;
}

export const shouldReduceMotion = (motion, systemReduced) => motion === 'reduced' || (motion === 'system' && systemReduced);
