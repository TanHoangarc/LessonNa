import { GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Topic, UserStats } from '../types';
import { MathLibraryItem, CustomSounds } from './mathLibraryHelper';

const provider = new GoogleAuthProvider();

export const listenToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    return null;
  }
};

export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Lỗi đăng xuất:", error);
  }
};

export interface AppDataSync {
  userStats: UserStats;
  overrides: Record<string, any>;
  customTopics: Topic[];
  showFunFact: boolean;
  mathLibrary: MathLibraryItem[];
  customSounds: CustomSounds;
  farmApples: string | null;
  customPuzzles?: any[];
  hiddenPuzzles?: string[];
  updatedAt: number;
}

export const syncDataToFirebase = async (data: Omit<AppDataSync, 'updatedAt'>): Promise<boolean> => {
  if (!auth.currentUser) return false;
  
  try {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    
    const oldMeta = await getDoc(userDocRef);
    let oldChunkCount = 0;
    if (oldMeta.exists()) {
      oldChunkCount = oldMeta.data().chunkCount || 0;
    }

    // Convert to JSON and cleanly remove any undefined values
    const jsonString = JSON.stringify({
      ...data,
      updatedAt: Date.now()
    });

    const CHUNK_SIZE = 900000; // ~900KB per chunk
    const chunks = [];
    for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
      chunks.push(jsonString.substring(i, i + CHUNK_SIZE));
    }

    await setDoc(userDocRef, {
      updatedAt: Date.now(),
      chunkCount: chunks.length,
      isChunked: true
    });

    const chunksRef = collection(db, 'users', auth.currentUser.uid, 'chunks');
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(chunksRef, i.toString()), { data: chunks[i] });
    }
    
    for (let i = chunks.length; i < oldChunkCount; i++) {
      await deleteDoc(doc(chunksRef, i.toString()));
    }

    return true;
  } catch (error) {
    console.error("Lỗi đồng bộ lên Firebase:", error);
    return false;
  }
};

export const loadDataFromFirebase = async (): Promise<AppDataSync | null> => {
  if (!auth.currentUser) return null;
  
  try {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const snapshot = await getDoc(userDocRef);
    if (!snapshot.exists()) {
      return null;
    }
    
    const metaData = snapshot.data();
    
    if (metaData.isChunked && metaData.chunkCount) {
      let fullJson = '';
      const chunksRef = collection(db, 'users', auth.currentUser.uid, 'chunks');
      for (let i = 0; i < metaData.chunkCount; i++) {
        const chunkSnap = await getDoc(doc(chunksRef, i.toString()));
        if (chunkSnap.exists()) {
          fullJson += chunkSnap.data().data;
        }
      }
      if (fullJson) {
        return JSON.parse(fullJson) as AppDataSync;
      }
    } else {
      return metaData as AppDataSync;
    }
    
    return null;
  } catch (error) {
    console.error("Lỗi tải dữ liệu từ Firebase:", error);
    return null;
  }
};
