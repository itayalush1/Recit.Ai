import { Article, VocabItem } from "../types";
import { auth, db } from "../firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const VOCAB_KEY = "french_app_saved_vocab_v1";
const ARTICLES_KEY = "french_app_saved_articles_v1";
const CEFR_PREF_KEY = "french_app_cefr_pref_v1";

export function getSavedVocab(): VocabItem[] {
  try {
    const raw = localStorage.getItem(VOCAB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVocabItem(item: VocabItem): VocabItem[] {
  const current = getSavedVocab();
  const exists = current.some(
    (v) => v.word.toLowerCase() === item.word.toLowerCase()
  );
  if (exists) return current;

  const newItem: VocabItem = {
    ...item,
    id: item.id || `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    savedAt: Date.now(),
  };

  const updated = [newItem, ...current];
  localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));

  if (auth?.currentUser && newItem.id) {
    setDoc(doc(db, "users", auth.currentUser.uid, "flashcards", newItem.id), newItem).catch(console.error);
  }

  return updated;
}

export function removeVocabItem(word: string): VocabItem[] {
  const current = getSavedVocab();
  const target = current.find((v) => v.word.toLowerCase() === word.toLowerCase());
  const updated = current.filter(
    (v) => v.word.toLowerCase() !== word.toLowerCase()
  );
  localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));

  if (auth?.currentUser && target?.id) {
    deleteDoc(doc(db, "users", auth.currentUser.uid, "flashcards", target.id)).catch(console.error);
  }

  return updated;
}

export function isVocabSaved(word: string): boolean {
  return getSavedVocab().some(
    (v) => v.word.toLowerCase() === word.toLowerCase()
  );
}

export function getSavedArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function bookmarkArticle(article: Article): Article[] {
  const current = getSavedArticles();
  if (current.some((a) => a.id === article.id)) return current;

  const updated = [article, ...current];
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(updated));

  if (auth?.currentUser && article.id) {
    setDoc(doc(db, "users", auth.currentUser.uid, "bookmarks", article.id), article).catch(console.error);
  }

  return updated;
}

export function removeBookmarkedArticle(id: string): Article[] {
  const current = getSavedArticles();
  const updated = current.filter((a) => a.id !== id);
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(updated));

  if (auth?.currentUser && id) {
    deleteDoc(doc(db, "users", auth.currentUser.uid, "bookmarks", id)).catch(console.error);
  }

  return updated;
}

export function isArticleBookmarked(id: string): boolean {
  return getSavedArticles().some((a) => a.id === id);
}

export function getPreferredCEFR(): string {
  return localStorage.getItem(CEFR_PREF_KEY) || "B1";
}

export function savePreferredCEFR(level: string): void {
  localStorage.setItem(CEFR_PREF_KEY, level);
  if (auth?.currentUser) {
    setDoc(doc(db, "users", auth.currentUser.uid), { cefrLevel: level, lastSyncedAt: Date.now() }, { merge: true }).catch(console.error);
  }
}
