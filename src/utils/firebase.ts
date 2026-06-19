import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

// Config values from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCx3YvGqsnKR5LMkFkj7RYud8Z1IjM5PnA",
  authDomain: "gen-lang-client-0434936587.firebaseapp.com",
  projectId: "gen-lang-client-0434936587",
  storageBucket: "gen-lang-client-0434936587.firebasestorage.app",
  messagingSenderId: "388484179450",
  appId: "1:388484179450:web:4577c374907edacfb77043"
};

const databaseId = "ai-studio-adf789e2-0a7f-4c2f-9be0-68d736e2e3bf";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the custom databaseId
export const db = getFirestore(app, databaseId);

// Device/User unique sync key to keep distinct client-side sandboxes persisted securely
const SYNC_KEY_LOCALSTORAGE_KEY = "be_hoc_tieng_viet_db_sync_key";

export function getOrCreateSyncKey(): string {
  let syncKey = localStorage.getItem(SYNC_KEY_LOCALSTORAGE_KEY);
  if (!syncKey) {
    // Generate a secure 8-character uppercase identifier for easy sharing
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let key = "";
    for (let i = 0; i < 8; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    syncKey = key;
    localStorage.setItem(SYNC_KEY_LOCALSTORAGE_KEY, syncKey);
  }
  return syncKey;
}

export function setCustomSyncKey(key: string) {
  const cleanKey = key.trim().toUpperCase();
  if (cleanKey.length >= 4) {
    localStorage.setItem(SYNC_KEY_LOCALSTORAGE_KEY, cleanKey);
    return true;
  }
  return false;
}
