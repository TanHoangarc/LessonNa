import { db, getOrCreateSyncKey } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { Topic, UserStats } from "../types";
import { MathLibraryItem } from "./mathLibraryHelper";

export interface SyncedUserData {
  stats?: UserStats;
  customTopics?: Topic[];
  overrides?: Record<string, { customImage?: string; customAudio?: string; audioHotspots?: any[] }>;
  mathLibrary?: MathLibraryItem[];
  updatedAt?: number;
}

const COLLECTION_NAME = "child_learning_profiles";

/**
 * Saves all user data to Firebase Firestore under the device's unique sync key.
 */
export async function saveUserDataToFirebase(
  syncKey: string,
  stats: UserStats,
  customTopics: Topic[],
  overrides: Record<string, any>,
  mathLibrary: MathLibraryItem[]
) {
  try {
    const docRef = doc(db, COLLECTION_NAME, syncKey);
    const payload: SyncedUserData = {
      stats,
      customTopics,
      overrides,
      mathLibrary,
      updatedAt: Date.now()
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error("Firebase sync save failed:", error);
  }
}

/**
 * Fetches the user data from Firebase Firestore directly.
 */
export async function fetchUserDataFromFirebase(syncKey: string): Promise<SyncedUserData | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, syncKey);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SyncedUserData;
    }
  } catch (error) {
    console.error("Firebase fetch failed:", error);
  }
  return null;
}

/**
 * Registers a real-time listener to Firebase Firestore for the active Sync Key.
 * This allows multiple devices (e.g. Teacher/Parent on phone and Child on iPad)
 * to instantly see added lessons or pronunciation recordings!
 */
export function subscribeToFirebaseUserData(
  syncKey: string,
  onUpdate: (data: SyncedUserData) => void
) {
  const docRef = doc(db, COLLECTION_NAME, syncKey);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data() as SyncedUserData;
      onUpdate(data);
    }
  }, (error) => {
    console.error("Firebase snapshot subscription error:", error);
  });
}
