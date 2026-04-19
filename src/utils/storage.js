/**
 * Profile-based storage system
 * Each profile has its own set of tasks stored under a namespaced key
 */

const PROFILES_KEY = 'quest-tracker-profiles';
const ACTIVE_PROFILE_KEY = 'quest-tracker-active-profile';

// ==================== PROFILES ====================

export function loadProfiles() {
  try {
    const data = localStorage.getItem(PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function setActiveProfileId(id) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function createProfile(name, color) {
  const profiles = loadProfiles();
  const id = 'profile-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const profile = {
    id,
    name,
    color: color || '#7c3aed',
    createdAt: new Date().toISOString(),
  };
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

export function deleteProfile(id) {
  const profiles = loadProfiles().filter(p => p.id !== id);
  saveProfiles(profiles);
  // Clean up tasks for this profile
  localStorage.removeItem(`quest-tracker-tasks-${id}`);
  // If this was the active profile, clear it
  if (getActiveProfileId() === id) {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export function updateProfile(id, updates) {
  const profiles = loadProfiles().map(p =>
    p.id === id ? { ...p, ...updates } : p
  );
  saveProfiles(profiles);
}

// ==================== TASKS (per profile) ====================

export function loadTasks(profileId) {
  if (!profileId) return null;
  try {
    const data = localStorage.getItem(`quest-tracker-tasks-${profileId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveTasks(tasks, profileId) {
  if (!profileId) return;
  localStorage.setItem(`quest-tracker-tasks-${profileId}`, JSON.stringify(tasks));
}

// ==================== MIGRATION ====================
// Migrate old single-user data to the first profile

export function migrateOldData() {
  const oldData = localStorage.getItem('quest-tracker-tasks');
  if (!oldData) return null;

  // Create a default profile from old data
  const profile = createProfile('Мій профіль', '#7c3aed');
  localStorage.setItem(`quest-tracker-tasks-${profile.id}`, oldData);
  // Remove old key
  localStorage.removeItem('quest-tracker-tasks');
  setActiveProfileId(profile.id);
  return profile;
}

// ==================== IMPORT / EXPORT ====================

export function exportTasksJSON(tasks) {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quest-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importTasksJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
