import { GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { VocabItem } from "../types";
import { getSavedVocab, getPreferredCEFR } from "./vault";

const VOCAB_KEY = "french_app_saved_vocab_v1";

export async function loginWithGoogle(onSyncComplete?: () => void): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await syncUserData(result.user, onSyncComplete);
    return result.user;
  } catch (err: any) {
    if (err?.code === "auth/popup-blocked" || err?.message?.includes("popup")) {
      alert("Notice: Votre navigateur a bloqué la fenêtre pop-up Google. Veuillez ouvrir l'application dans un nouvel onglet pour vous connecter.");
    } else {
      console.error("Erreur de connexion Google:", err);
    }
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncUserData(user: User, onSyncComplete?: () => void): Promise<void> {
  try {
    // 1. Sync User Profile (CEFR Level)
    const userRef = doc(db, "users", user.uid);
    const localCEFR = getPreferredCEFR();
    
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      lastSyncedAt: Date.now(),
      cefrLevel: localCEFR,
    }, { merge: true });

    // 2. Sync Flashcards
    const cardsCol = collection(db, "users", user.uid, "flashcards");
    const snapshot = await getDocs(cardsCol);
    
    const remoteVocab: VocabItem[] = [];
    snapshot.forEach((d) => {
      remoteVocab.push(d.data() as VocabItem);
    });

    const localVocab = getSavedVocab();
    const remoteMap = new Map(remoteVocab.map((v) => [v.word.toLowerCase(), v]));

    // Upload local cards not yet in remote
    for (const v of localVocab) {
      if (!remoteMap.has(v.word.toLowerCase())) {
        const id = v.id || `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const itemToUpload: VocabItem = { ...v, id };
        await setDoc(doc(db, "users", user.uid, "flashcards", id), itemToUpload);
        remoteVocab.push(itemToUpload);
      }
    }

    // Combine all
    const mergedMap = new Map<string, VocabItem>();
    remoteVocab.forEach((v) => mergedMap.set(v.word.toLowerCase(), v));
    localVocab.forEach((v) => mergedMap.set(v.word.toLowerCase(), v));

    const mergedList = Array.from(mergedMap.values());
    localStorage.setItem(VOCAB_KEY, JSON.stringify(mergedList));
    
    if (onSyncComplete) onSyncComplete();
  } catch (err) {
    console.error("Erreur de synchronisation Firestore:", err);
  }
}
