/**
 * Firebase Realtime Database & Auth Integration Layer
 * Optimized for Firebase Free (Spark) Plan:
 * - Minimal bandwidth usage by syncing state transitions instead of timer ticks
 * - Flat tree structure to avoid deep recursive reads
 * - Ephemeral message pruning
 * - Dual-mode: Native Firebase SDK when config is provided + In-Memory/Broadcast fallback for instant sandbox preview
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  push,
  get,
  remove,
  off,
  Database,
  Unsubscribe,
} from 'firebase/database';
import { UserProfile, RoomState, ChatMessage } from '../types/game';

export interface FirebaseConfigParams {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'mafia_firebase_config';
const STORAGE_KEY_USER_PROFILE = 'mafia_user_profile';

// Helper to normalize and sanitize common URL formats
export function sanitizeFirebaseConfig(config: FirebaseConfigParams): FirebaseConfigParams {
  const projectId = config.projectId?.trim() || '';
  let authDomain = config.authDomain?.trim() || '';
  let databaseURL = config.databaseURL?.trim() || '';

  // Fix authDomain if missing scheme or starts with ://
  if (authDomain.startsWith('://')) {
    authDomain = projectId ? `${projectId}.firebaseapp.com` : authDomain.replace('://', '');
  } else if (authDomain === 'firebaseapp.com' && projectId) {
    authDomain = `${projectId}.firebaseapp.com`;
  } else if (!authDomain && projectId) {
    authDomain = `${projectId}.firebaseapp.com`;
  }

  // Fix databaseURL if missing subdomain
  if (databaseURL === 'https://firebaseio.com' || databaseURL.startsWith('://') || !databaseURL) {
    databaseURL = projectId
      ? `https://${projectId}-default-rtdb.firebaseio.com`
      : 'https://firebaseio.com';
  }

  return {
    ...config,
    apiKey: config.apiKey?.trim() || '',
    authDomain,
    databaseURL,
    projectId,
    storageBucket: config.storageBucket?.trim(),
    messagingSenderId: config.messagingSenderId?.trim(),
    appId: config.appId?.trim(),
    measurementId: config.measurementId?.trim(),
  };
}

// Default / stored config
export function getSavedFirebaseConfig(): FirebaseConfigParams | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (raw) {
      return sanitizeFirebaseConfig(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Failed to parse saved Firebase config', e);
  }

  // Check Vite environment variables
  const env = (import.meta as any).env || {};
  if (env.VITE_FIREBASE_API_KEY) {
    const projectId = env.VITE_FIREBASE_PROJECT_ID || '';
    const rawConfig: FirebaseConfigParams = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
      databaseURL:
        env.VITE_FIREBASE_DATABASE_URL ||
        (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : ''),
      projectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
    };
    return sanitizeFirebaseConfig(rawConfig);
  }
  return null;
}

export function saveFirebaseConfig(config: FirebaseConfigParams) {
  const sanitized = sanitizeFirebaseConfig(config);
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(sanitized));
  window.location.reload();
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  window.location.reload();
}

// Global instances
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;

const currentConfig = getSavedFirebaseConfig();
export const isLiveFirebase = Boolean(
  currentConfig?.apiKey && currentConfig?.databaseURL
);

if (isLiveFirebase && currentConfig) {
  try {
    if (!getApps().length) {
      appInstance = initializeApp(currentConfig);
    } else {
      appInstance = getApps()[0];
    }
    authInstance = getAuth(appInstance);
    dbInstance = getDatabase(appInstance);
    console.log('🔥 Connected to Live Firebase RTDB:', currentConfig.databaseURL);
  } catch (err) {
    console.error('Firebase initialization error, fallback enabled:', err);
  }
}

// -------------------------------------------------------------
// In-Memory / LocalStorage Mock RTDB Engine for instant preview
// -------------------------------------------------------------
class MockRTDB {
  private store: Record<string, any> = {};
  private listeners: Record<string, Set<(val: any) => void>> = {};

  constructor() {
    // BroadcastChannel allows multiple tabs/windows in same browser to sync in real time!
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('mafia_rtdb_sync');
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'SYNC') {
          this.store[e.data.path] = e.data.value;
          this.notify(e.data.path);
        }
      };
    }
  }

  private broadcast(path: string, value: any) {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('mafia_rtdb_sync');
        channel.postMessage({ type: 'SYNC', path, value });
      } catch {}
    }
  }

  set(path: string, value: any): Promise<void> {
    this.store[path] = JSON.parse(JSON.stringify(value));
    this.broadcast(path, value);
    this.notify(path);
    return Promise.resolve();
  }

  update(path: string, value: Record<string, any>): Promise<void> {
    const current = this.store[path] || {};
    this.store[path] = { ...current, ...JSON.parse(JSON.stringify(value)) };
    this.broadcast(path, this.store[path]);
    this.notify(path);
    return Promise.resolve();
  }

  get(path: string): Promise<any> {
    return Promise.resolve(this.store[path] ?? null);
  }

  remove(path: string): Promise<void> {
    delete this.store[path];
    this.broadcast(path, null);
    this.notify(path);
    return Promise.resolve();
  }

  push(path: string, value: any): { key: string; promise: Promise<void> } {
    const key = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const itemPath = `${path}/${key}`;
    const p = this.set(itemPath, value);
    return { key, promise: p };
  }

  onValue(path: string, callback: (snapshot: { val: () => any }) => void): () => void {
    if (!this.listeners[path]) {
      this.listeners[path] = new Set();
    }
    const cb = (val: any) => callback({ val: () => val });
    this.listeners[path].add(cb);

    // Initial trigger
    cb(this.store[path] ?? null);

    return () => {
      this.listeners[path]?.delete(cb);
    };
  }

  private notify(targetPath: string) {
    Object.keys(this.listeners).forEach((p) => {
      if (p === targetPath || targetPath.startsWith(p + '/')) {
        this.listeners[p]?.forEach((cb) => cb(this.store[p] ?? null));
      }
    });
  }
}

export const mockRTDB = new MockRTDB();

// -------------------------------------------------------------
// Unified Database Operations (Optimized for low payload)
// -------------------------------------------------------------
export const dbService = {
  // Set room state (full or partial)
  setRoomState: async (roomId: string, state: Partial<RoomState>) => {
    if (dbInstance) {
      await update(ref(dbInstance, `rooms/${roomId}`), state);
    } else {
      await mockRTDB.update(`rooms/${roomId}`, state);
    }
  },

  // Listen to room state in real time
  listenRoomState: (
    roomId: string,
    callback: (state: RoomState | null) => void
  ): (() => void) => {
    if (dbInstance) {
      const roomRef = ref(dbInstance, `rooms/${roomId}`);
      const unsub = onValue(roomRef, (snapshot) => {
        callback(snapshot.val() as RoomState | null);
      });
      return () => unsub();
    } else {
      return mockRTDB.onValue(`rooms/${roomId}`, (snapshot) => {
        callback(snapshot.val() as RoomState | null);
      });
    }
  },

  // Send lightweight chat message
  sendMessage: async (roomId: string, message: ChatMessage) => {
    if (dbInstance) {
      const chatRef = ref(dbInstance, `rooms/${roomId}/chats`);
      await push(chatRef, message);
    } else {
      mockRTDB.push(`rooms/${roomId}/chats`, message);
    }
  },

  // Listen to chats
  listenChats: (
    roomId: string,
    callback: (messages: ChatMessage[]) => void
  ): (() => void) => {
    if (dbInstance) {
      const chatRef = ref(dbInstance, `rooms/${roomId}/chats`);
      const unsub = onValue(chatRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list = Object.values(val) as ChatMessage[];
        // Keep only last 40 to conserve memory and render performance
        callback(list.slice(-40));
      });
      return () => unsub();
    } else {
      return mockRTDB.onValue(`rooms/${roomId}/chats`, (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          callback([]);
          return;
        }
        const list = Object.values(val) as ChatMessage[];
        callback(list.slice(-40));
      });
    }
  },

  // Save user profile to /users/{uid}
  saveUserProfile: async (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
    if (dbInstance) {
      await set(ref(dbInstance, `users/${profile.uid}`), profile);
    } else {
      await mockRTDB.set(`users/${profile.uid}`, profile);
    }
  },

  // Get user profile
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    if (dbInstance) {
      const snap = await get(ref(dbInstance, `users/${uid}`));
      if (snap.exists()) return snap.val() as UserProfile;
    } else {
      const val = await mockRTDB.get(`users/${uid}`);
      if (val) return val as UserProfile;
    }
    const local = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.uid === uid) return parsed;
      } catch {}
    }
    return null;
  },

  // Matchmaking Queue
  joinQueue: async (player: { uid: string; nickname: string; avatarId: string }) => {
    if (dbInstance) {
      await set(ref(dbInstance, `matchmaking/${player.uid}`), {
        ...player,
        joinedAt: Date.now(),
      });
    } else {
      await mockRTDB.set(`matchmaking/${player.uid}`, {
        ...player,
        joinedAt: Date.now(),
      });
    }
  },

  leaveQueue: async (uid: string) => {
    if (dbInstance) {
      await remove(ref(dbInstance, `matchmaking/${uid}`));
    } else {
      await mockRTDB.remove(`matchmaking/${uid}`);
    }
  },

  listenQueue: (
    callback: (queue: Record<string, { uid: string; nickname: string; avatarId: string; joinedAt: number }>) => void
  ): (() => void) => {
    if (dbInstance) {
      const qRef = ref(dbInstance, 'matchmaking');
      const unsub = onValue(qRef, (snap) => {
        callback(snap.val() || {});
      });
      return () => unsub();
    } else {
      return mockRTDB.onValue('matchmaking', (snap) => {
        callback(snap.val() || {});
      });
    }
  },
};

// -------------------------------------------------------------
// Authentication Service (Google Sign-In)
// -------------------------------------------------------------
export const authService = {
  signInWithGoogle: async (): Promise<UserProfile> => {
    if (authInstance) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(authInstance, provider);
      const user = cred.user;

      // Check existing profile or create new
      const existing = await dbService.getUserProfile(user.uid);
      const profile: UserProfile = existing || {
        uid: user.uid,
        nickname: user.displayName || '플레이어_' + user.uid.substring(0, 4),
        avatarId: 'fedora-boss',
        email: user.email,
        gamesPlayed: 0,
        wins: 0,
        updatedAt: Date.now(),
      };
      await dbService.saveUserProfile(profile);
      return profile;
    }

    // Offline / Demo Google Sign-in simulation
    // Simulates realistic Google account authentication
    const demoUid = 'g_user_' + Math.random().toString(36).substring(2, 9);
    const demoProfile: UserProfile = {
      uid: demoUid,
      nickname: '요원_' + Math.floor(100 + Math.random() * 900),
      avatarId: 'fedora-boss',
      email: 'agent@mafia.play',
      gamesPlayed: 0,
      wins: 0,
      updatedAt: Date.now(),
    };
    await dbService.saveUserProfile(demoProfile);
    return demoProfile;
  },

  getCurrentUser: (): Promise<UserProfile | null> => {
    return new Promise((resolve) => {
      const saved = localStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (saved) {
        try {
          resolve(JSON.parse(saved));
          return;
        } catch {}
      }
      if (authInstance) {
        onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            const profile = await dbService.getUserProfile(user.uid);
            resolve(profile);
          } else {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    });
  },

  signOutUser: async () => {
    localStorage.removeItem(STORAGE_KEY_USER_PROFILE);
    if (authInstance) {
      await signOut(authInstance);
    }
  },
};
