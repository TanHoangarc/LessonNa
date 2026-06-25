import { GoogleAuthProvider, signInWithPopup, signOut, User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
  updatedAt: number;
}

export const syncDataToFirebase = async (data: Omit<AppDataSync, 'updatedAt'>): Promise<boolean> => {
  if (!auth.currentUser) return false;
  
  try {
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    // Use JSON parse/stringify to cleanly remove any `undefined` values which Firestore does not support
    const sanitizedData = JSON.parse(JSON.stringify({
      ...data,
      updatedAt: Date.now()
    }));
    await setDoc(userDocRef, sanitizedData);
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
    if (snapshot.exists()) {
      return snapshot.data() as AppDataSync;
    }
    return null;
  } catch (error) {
    console.error("Lỗi tải dữ liệu từ Firebase:", error);
    return null;
  }
};
