import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Sparkles, 
  Volume2, 
  AlertCircle, 
  ArrowRight, 
  Layers, 
  GraduationCap, 
  Search, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  LogOut,
  User,
  ExternalLink,
  ChevronRight,
  Settings
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import SelectionPanel from "./components/SelectionPanel";
import AudioReader from "./components/AudioReader";
import { 
  GeneratedMaterial, 
  ContentCategory, 
  ProficiencyLevel, 
  WordAnalysis, 
  Flashcard 
} from "./types";
import { tokenizeFrenchText, scheduleLeitner } from "./utils";

// Firebase App integrations
import { auth, db } from "./firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  getDocFromServer
} from "firebase/firestore";

// Sample initial material for quick start when app metadata loads
const sampleBeginnerMaterial: GeneratedMaterial = {
  title: "Une belle journée à Paris",
  titleTranslation: "A beautiful day in Paris",
  metadata: "Niveau Débutant • Petit Conte",
  items: [
    {
      french: "Bonjour! Je m'appelle Thomas et j'habite à Paris.",
      english: "Hello! My name is Thomas and I live in Paris."
    },
    {
      french: "Aujourd'hui, il fait beau et chaud.",
      english: "Today, the weather is beautiful and warm."
    },
    {
      french: "Je vais acheter un pain au chocolat dans une boulangerie.",
      english: "I am going to buy a chocolate pastry in a bakery."
    },
    {
      french: "La boulangère me dit: « Bonjour, monsieur! Ça fait deux euros. »",
      english: "La boulangère tells me: 'Hello, sir! That makes two euros.'"
    },
    {
      french: "Je mange mon pain au chocolat au bord de la Seine. C'est délicieux!",
      english: "I eat my chocolate pastry on the banks of the Seine. It's delicious!"
    }
  ],
  explanation: "Learning tip: In France, ordering a 'pain au chocolat' (or 'chocolatine' in the south) is a classic morning ritual. Address the server politely with 'Bonjour' before ordering."
};

const quotes = [
  "« Une autre langue est une autre vision de la vie. » — Federico Fellini",
  "« La langue d'un peuple est sa propre âme. » — Frédéric Mistral",
  "« Parler une autre langue, c'est posséder une deuxième âme. » — Charlemagne",
  "« Le français est une langue magnifique, riche et nuancée. » — AI Coach",
  "« Le voyage en France commence toujours par un premier mot. »"
];

// Error types mapping to the Firebase skill handbook
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Hardened Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("french_ai_theme") === "dark" || 
        (!localStorage.getItem("french_ai_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return true;
  });

  // User Authentication & Profile details
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel>("Beginner");
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory>("Short Story");
  
  // Transient state for sign-up level picker
  const [initialSignUpLevel, setInitialSignUpLevel] = useState<ProficiencyLevel>("Beginner");
  
  const [material, setMaterial] = useState<GeneratedMaterial>(() => {
    const saved = localStorage.getItem("current_french_material");
    return saved ? JSON.parse(saved) : sampleBeginnerMaterial;
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Active view tabs: 'learn' (reading desk) or 'review' (saved flashcards study)
  const [activeTab, setActiveTab] = useState<"learn" | "review">("learn");

  // Word context translated panel state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedWordSentence, setSelectedWordSentence] = useState<string>("");
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysis | null>(null);
  const [isAnalyzingWord, setIsAnalyzingWord] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Spaced Repetition Flashcards list synced with Cloud Firestore
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  // Flashcards study mode indicators
  const [studyCardIndex, setStudyCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [flashcardSearch, setFlashcardSearch] = useState("");
  const [showOnlyDue, setShowOnlyDue] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Line toggles for English translations
  const [showEnglishSegmentIndex, setShowEnglishSegmentIndex] = useState<Record<number, boolean>>({});
  const [showAllEnglish, setShowAllEnglish] = useState(false);

  // Persistent dark mode hook
  useEffect(() => {
    localStorage.setItem("french_ai_theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Persist current lessons on local device for seamless sessions
  useEffect(() => {
    localStorage.setItem("current_french_material", JSON.stringify(material));
    setShowEnglishSegmentIndex({});
    setShowAllEnglish(false);
  }, [material]);

  // 1. Initial connection check validation (Pillar constraint)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.warn("Please check your Firebase connectivity state.");
        }
      }
    }
    testConnection();
  }, []);

  // 2. Auth state observer listening to user account state
  useEffect(() => {
    let unsubscribeCards: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);

      // Clean up previous cards listener if any
      if (unsubscribeCards) {
        unsubscribeCards();
        unsubscribeCards = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Retrieve custom user profile document containing their French level
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data();
            if (profileData.proficiency) {
              setSelectedLevel(profileData.proficiency as ProficiencyLevel);
            }
          } else {
            // Write initial profile with their selected signup level preference
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "Apprenti Français",
              proficiency: initialSignUpLevel,
              updatedAt: new Date().toISOString()
            });
            setSelectedLevel(initialSignUpLevel);
          }
        } catch (err) {
          console.error("Failed to sync user parameters from cloud db:", err);
        }

        // Real-time flashcard synchronization
        const cardsColRef = collection(db, "users", firebaseUser.uid, "flashcards");
        unsubscribeCards = onSnapshot(cardsColRef, (snapshot) => {
          const list: Flashcard[] = [];
          snapshot.forEach((snapshotDoc) => {
            list.push(snapshotDoc.data() as Flashcard);
          });
          // Sort flashcards newest first
          list.sort((a, b) => b.createdAt - a.createdAt);
          setFlashcards(list);
          setAuthLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/flashcards`);
          setAuthLoading(false);
        });

      } else {
        setUser(null);
        setFlashcards([]);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCards) {
        unsubscribeCards();
      }
    };
  }, [initialSignUpLevel]);

  // Account creation via standard Google signInWithPopup
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      triggerSuccessToast("Bienvenue ! Content de vous revoir.");
    } catch (error: any) {
      console.error("Auth google exception:", error);
      const errCode = error?.code || error?.message || String(error);
      setAuthError(errCode);
      triggerSuccessToast("Auth failed or cancelled.");
      setAuthLoading(false);
    }
  };

  // Sign out helper
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      triggerSuccessToast("Déconnexion réussie.");
    } catch (err) {
      console.error(err);
    }
  };

  // Live profile French level modification helper
  const handleUpdateLevel = async (newLevel: ProficiencyLevel) => {
    setSelectedLevel(newLevel);
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          proficiency: newLevel,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        triggerSuccessToast(`Niveau français mis à jour : ${getLevelLabel(newLevel)}`);
      } catch (err) {
        console.error("Failed to update proficiency in cloud Firestore:", err);
      }
    }
  };

  // Handle Gemini generative classroom content
  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setSelectedWord(null);
    setWordAnalysis(null);

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          level: selectedLevel
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${response.status}`);
      }

      const data: GeneratedMaterial = await response.json();
      setMaterial(data);
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Impossible de générer le cours du pupitre. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Translate clicked French word instantly via custom Google Translate endpoint
  const handleWordClick = async (word: string, surroundingSentence: string) => {
    const cleaned = word.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "");
    if (!cleaned) return;

    setSelectedWord(cleaned);
    setSelectedWordSentence(surroundingSentence);
    setIsAnalyzingWord(true);
    setAnalysisError(null);
    setWordAnalysis(null);

    try {
      const response = await fetch("/api/word-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: cleaned,
          sentence: surroundingSentence
        })
      });

      if (!response.ok) {
        throw new Error("Erreur de traduction. Veuillez réessayer.");
      }

      const data: WordAnalysis = await response.json();
      setWordAnalysis(data);
    } catch (err: any) {
      setAnalysisError(err.message || "Échec de la traduction.");
    } finally {
      setIsAnalyzingWord(false);
    }
  };

  // Add translated word to cloud flashcards dictionary
  const handleAddFlashcard = async () => {
    if (!wordAnalysis || !user) return;

    // Check if word already exists to avoid duplicates
    const alreadySaved = flashcards.some(c => c.word.toLowerCase() === wordAnalysis.word.toLowerCase());
    if (alreadySaved) {
      triggerSuccessToast(`"${wordAnalysis.word}" est déjà dans votre dictée de révision.`);
      return;
    }

    const cardId = "fc_" + Date.now();
    const newCard: Flashcard = {
      id: cardId,
      word: wordAnalysis.word,
      translation: wordAnalysis.translation,
      pronunciation: wordAnalysis.pronunciation,
      grammaticalContext: wordAnalysis.grammaticalContext,
      contextSentence: selectedWordSentence,
      frenchExample: wordAnalysis.frenchExample,
      englishExample: wordAnalysis.englishExample,
      proficiency: selectedLevel,
      category: selectedCategory,
      createdAt: Date.now(),
      box: 1,
      nextReviewDate: Date.now() + 24 * 60 * 60 * 1000 // due tomorrow
    };

    try {
      // Sync to cloud Firestore
      const cardDocRef = doc(db, "users", user.uid, "flashcards", cardId);
      await setDoc(cardDocRef, newCard);
      setSelectedWord(null); // safely minimize drawer
      triggerSuccessToast(`Ajouté ! "${wordAnalysis.word}" est lié à votre compte.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/flashcards/${cardId}`);
    }
  };

  const triggerSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Leitner spaced-repetition feedback loop
  const handleLeitnerAnswer = async (cardId: string, parsedCorrect: boolean) => {
    if (!user) return;
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;

    const scheduling = scheduleLeitner(card, parsedCorrect);
    
    try {
      const cardDocRef = doc(db, "users", user.uid, "flashcards", cardId);
      await setDoc(cardDocRef, {
        ...card,
        box: scheduling.box,
        nextReviewDate: scheduling.nextReviewDate
      });

      setIsCardFlipped(false);
      
      // Advance to next card smoothly
      setTimeout(() => {
        setStudyCardIndex(prev => prev + 1);
      }, 150);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/flashcards/${cardId}`);
    }
  };

  // Delete card from cloud Firestore account
  const handleRemoveCard = async (id: string) => {
    if (!user) return;
    try {
      const cardDocRef = doc(db, "users", user.uid, "flashcards", id);
      await deleteDoc(cardDocRef);
      triggerSuccessToast("Mot retiré de votre dictionnaire.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/flashcards/${id}`);
    }
  };

  // Live filter variables
  const now = Date.now();
  const filteredCards = flashcards.filter(c => {
    const matchesSearch = c.word.toLowerCase().includes(flashcardSearch.toLowerCase()) || 
      c.translation.toLowerCase().includes(flashcardSearch.toLowerCase());
    
    const isDue = c.nextReviewDate <= now;
    return showOnlyDue ? (matchesSearch && isDue) : matchesSearch;
  });

  const combinedFrenchDoc = material.items.map(i => i.french).join(" ");

  const getLevelLabel = (lvl: ProficiencyLevel) => {
    switch (lvl) {
      case "Beginner": return "A1-A2 Débutant";
      case "Intermediate": return "B1-B2 Intermédiaire";
      case "Advanced": return "C1-C2 Avancé";
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#e5e5e5] font-sans transition-colors duration-200 relative overflow-x-hidden flex flex-col justify-between">
      
      {/* Decorative Editorial Background Elements */}
      <div className="absolute top-12 left-10 opacity-[0.03] pointer-events-none hidden lg:block select-none">
        <div className="text-[100px] font-serif leading-none rotate-[-6deg] font-black text-white">récit.Ai</div>
        <div className="text-[50px] font-serif italic ml-20 text-[#f27d26]">Français Express</div>
      </div>
      <div className="absolute bottom-20 right-10 text-right opacity-[0.03] pointer-events-none hidden lg:block select-none">
        <p className="text-xs uppercase tracking-[0.6em] mb-2 text-white">Éducation Spacée & Traduction Directe</p>
        <p className="text-3xl font-serif font-bold text-white">Édition Journal 2026</p>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-[480px] mx-auto min-h-screen bg-[#0f0f0f] border-x border-[#1a1a1a] shadow-2xl flex flex-col relative">
        
        {/* UPPER BRAND HEADER */}
        <header className="p-5 pb-3 border-b border-[#222222] sticky top-0 bg-[#0f0f0fd9] backdrop-blur-md z-40">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[26px] font-serif font-black italic text-white tracking-tight leading-none flex items-center gap-1.5">
                récit.Ai <span className="text-xs font-mono font-normal uppercase tracking-widest text-[#f27d26] bg-[#f27d26]/10 px-1.5 py-0.5 rounded">DIRECT</span>
              </h1>
            </div>
          </div>
        </header>

        {/* NOTIFICATION TOAST BAR */}
        {successToast && (
          <div className="absolute top-24 left-4 right-4 bg-[#f27d26] text-white py-2 px-4 rounded-xl text-xs font-semibold shadow-lg z-50 flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
            <span>{successToast}</span>
          </div>
        )}

        {/* PRIMARY SIGN-IN / ONBOARDING ENTRANCE OVERLAY */}
        {authLoading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-24 space-y-4">
            <div className="w-8 h-8 border-2 border-[#f27d26] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">Vérification de session...</p>
          </div>
        ) : !user ? (
          <div className="flex-1 p-6 flex flex-col justify-center space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="px-3 py-1 bg-[#1a130e] text-[#f27d26] border border-[#f27d26]/40 text-[10px] font-mono uppercase tracking-widest rounded-full">
                Compte d'Apprentissage Persistent
              </span>
              <h2 className="text-3xl font-serif font-bold italic tracking-tight text-white">
                Rejoignez la Tribune
              </h2>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                Connectez-vous pour configurer votre niveau pour toujours et sauvegarder votre dictionnaire dans le cloud.
              </p>
            </div>

            {/* Level selection ONCE at sign up */}
            <div className="space-y-3 bg-[#131313] border border-[#222222] p-4 rounded-2xl">
              <label className="block text-gray-450 font-bold text-[10px] uppercase tracking-wider font-mono">
                Choisissez votre Niveau de Français :
              </label>
              
              <div className="space-y-2">
                {[
                  { value: "Beginner", label: "Débutant (A1-A2)", desc: "Conversations simples et mots d'usage courant" },
                  { value: "Intermediate", label: "Intermédiaire (B1-B2)", desc: "Lectures authentiques et thèmes quotidiens" },
                  { value: "Advanced", label: "Avancé (C1-C2)", desc: "Articles de presse, poésie et finesses littéraires" }
                ].map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setInitialSignUpLevel(l.value as ProficiencyLevel)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col ${
                      initialSignUpLevel === l.value 
                        ? "border-[#f27d26] bg-[#f27d26]/5 ring-1 ring-[#f27d26]" 
                        : "border-[#222] bg-[#0c0c0c] hover:border-[#333]"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{l.label}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Google-based Login trigger */}
            <div className="space-y-3">
              {authError && (
                <div className="p-4 bg-[#231212] border border-[#ff4d4d]/30 rounded-2xl text-xs text-red-200 space-y-3">
                  <div className="flex items-start gap-2.5 font-bold uppercase tracking-wider text-[#ff4d4d]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-xs">Échec d'Authentification</p>
                      <p className="font-mono text-[10px] lowercase text-[#ff8080] mt-0.5 select-all">{authError}</p>
                    </div>
                  </div>
                  
                  {/* Dynamic domain tutorial if it's unauthorized-domain or accessed externally */}
                  {(authError.includes("unauthorized-domain") || authError.includes("auth/unauthorized-domain") || (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))) && (
                    <div className="pt-2.5 border-t border-[#ff4d4d]/20 space-y-2 mt-1">
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        💡 **Comment autoriser ce domaine pour Google Login :**
                      </p>
                      <ol className="list-decimal pl-4.5 space-y-2 text-[11.5px] text-gray-300 leading-relaxed font-serif">
                        <li>
                          Ouvrez la{" "}
                          <a 
                            href="https://console.firebase.google.com/project/gen-lang-client-0965631692/authentication/settings"
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#f27d26] underline hover:text-[#f49551] font-mono font-bold inline-flex items-center gap-0.5"
                          >
                            Console Firebase <ExternalLink className="w-3 h-3 inline" />
                          </a>.
                        </li>
                        <li>
                          Allez dans l'onglet <strong>Settings</strong> (Paramètres) &rarr; <strong>Authorized domains</strong> (Domaines autorisés).
                        </li>
                        <li>
                          Cliquez sur <strong>Add domain</strong> (Ajouter un domaine) et collez votre hôte actuel : <strong className="text-white select-all bg-[#3d1818] px-1.5 py-0.5 rounded border border-[#ff4d4d]/25 font-mono text-[11px]">{typeof window !== "undefined" ? window.location.hostname : "votre-app.vercel.app"}</strong>
                        </li>
                      </ol>
                      <p className="text-[10px] text-gray-400 leading-normal pt-1.5 italic font-sans">
                        Une fois ajouté, actualisez cette page pour pouvoir vous connecter !
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                id="google-login-btn"
                onClick={handleGoogleSignIn}
                className="w-full py-3 bg-white hover:bg-gray-100 text-black font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>S'enregistrer avec Google Account</span>
              </button>

              <p className="text-[10px] text-gray-550 text-center font-mono uppercase tracking-wider">
                Utilise Google Firebase Authentication
              </p>
            </div>
          </div>
        ) : (
          /* =======================================
             AUTHENTICATED MAIN COMPONENT VIEWPORT 
             ======================================= */
          <main className="flex-1 overflow-y-auto p-4 space-y-5">
            
            {activeTab === "learn" && (
              /* =======================================
                 LEARN INTERACTIVE STUDY SHEET
                 ======================================= */
              <>
                <SelectionPanel 
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerateContent}
                />

                {/* GENERATION STATE - LOADING */}
                {isGenerating && (
                  <div id="ai-loading-container" className="py-12 text-center space-y-4 bg-[#141414] rounded-2xl border border-[#222222] p-6 animate-pulse">
                    <div className="inline-flex py-1.5 px-3 rounded-full bg-[#201d1a] border border-[#f27d26]/30 text-[#f27d26] text-[10px] font-mono uppercase tracking-widest gap-2">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Gemini prépare les fiches de cours...</span>
                    </div>
                    
                    <blockquote className="text-xs text-gray-400 italic max-w-xs mx-auto">
                      {quotes[Math.floor(Date.now() / 3000) % quotes.length]}
                    </blockquote>
                  </div>
                )}

                {/* GENERATION STATE - ERROR */}
                {generationError && (
                  <div id="ai-error-container" className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl text-xs text-red-300 space-y-3">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Compilation Failure</span>
                    </div>
                    <p>{generationError}</p>
                    <button
                      onClick={handleGenerateContent}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#f27d26] hover:underline"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {/* MAIN CONTENT BLOCK */}
                {!isGenerating && !generationError && material && (
                  <div id="learning-content-card" className="space-y-4">
                    
                    {/* Header credentials */}
                    <div className="flex flex-wrap justify-between items-center text-[10px] uppercase font-mono tracking-widest text-[#666666] border-b border-[#222222] pb-2">
                      <span>
                        Genre: <span className="text-[#f27d26] font-extrabold">{selectedCategory}</span>
                      </span>
                      <span>
                        {material.metadata || "récit.Ai • Édition Spéciale"}
                      </span>
                    </div>

                    {/* Content Title info */}
                    <div className="space-y-1">
                      <h2 className="text-2xl font-serif font-black text-white hover:text-[#f27d26]/90 transition-colors leading-tight">
                        {material.title}
                      </h2>
                      <p className="text-xs font-serif italic text-gray-400">
                        {material.titleTranslation}
                      </p>
                    </div>

                    {/* Audio Reader with proper French configuration vocalizers */}
                    <AudioReader textToRead={combinedFrenchDoc} isDark={darkMode} />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-[#666666] pt-1">
                        <span>Cliquez sur un mot pour le traduire</span>
                        <button 
                          onClick={() => setShowAllEnglish(!showAllEnglish)}
                          className="text-[#f27d26] hover:underline uppercase font-extrabold"
                        >
                          {showAllEnglish ? "Masquer Anglais" : "Afficher Tout"}
                        </button>
                      </div>

                      {/* Paragraph mapping */}
                      <div id="text-paragraphs-holder" className="space-y-5">
                        {material.items.map((segment, idx) => {
                          const tokenized = tokenizeFrenchText(segment.french);
                          const isEnglishVisible = showAllEnglish || showEnglishSegmentIndex[idx];

                          return (
                            <div 
                              key={idx} 
                              id={`paragraph-block-${idx}`}
                              className="bg-[#121212] border border-[#222222] rounded-xl p-4 space-y-3 hover:border-[#333333] transition-all"
                            >
                              <div className="text-sm leading-relaxed text-white">
                                {segment.topic && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="inline-flex items-center rounded-md bg-[#f27d26]/10 px-2.5 py-1 text-xs font-extrabold font-mono uppercase tracking-wider text-[#f27d26] border border-[#f27d26]/20">
                                      ✨ {segment.topic}
                                    </span>
                                  </div>
                                )}
                                {segment.speaker && (
                                  <strong className="text-[#f27d26] font-mono text-[10px] uppercase tracking-wider block mb-1">
                                    {segment.speaker} :
                                  </strong>
                                )}
                                
                                <p className="inline">
                                  {tokenized.map((token, tIdx) => {
                                    if (token.isWord) {
                                      const isCurrentlySelected = selectedWord?.toLowerCase() === token.text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "");
                                      return (
                                        <span
                                          key={tIdx}
                                          onClick={() => handleWordClick(token.text, segment.french)}
                                          className={`cursor-pointer inline-block mx-0.5 border-b transition-all decoration-dotted ${
                                            isCurrentlySelected 
                                              ? "border-[#f27d26] text-[#f27d26] font-semibold bg-[#f27d26]/10 px-1 rounded-sm" 
                                              : "border-[#444444] hover:border-[#f27d26] dark:hover:text-white"
                                          }`}
                                          title="Traduire"
                                        >
                                          {token.text}
                                        </span>
                                      );
                                    }
                                    return <span key={tIdx} className="text-gray-400">{token.text}</span>;
                                  })}
                                </p>
                              </div>

                              {/* Target companion drawer translation toggler */}
                              <div className="pt-2 border-t border-[#1d1d1d] flex items-start justify-between gap-2.5">
                                {isEnglishVisible ? (
                                  <p className="text-[11px] text-gray-400 italic">
                                    {segment.english}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-[#555555] italic">
                                    Traduction masquée...
                                  </p>
                                )}

                                <button
                                  onClick={() => setShowEnglishSegmentIndex(prev => ({
                                    ...prev,
                                    [idx]: !prev[idx]
                                  }))}
                                  className="text-[9px] font-mono uppercase bg-[#1a1a1a] border border-[#333333] py-0.5 px-1.5 rounded-md hover:bg-black/40 text-gray-450 block"
                                >
                                  {isEnglishVisible ? "Masquer" : "Révéler"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cultural explanations snippet */}
                    {(material.explanation || (material.keyVocabulary && material.keyVocabulary.length > 0)) && (
                      <div id="cultural-context-block" className="p-4 bg-[#141414] border-l-2 border-[#f27d26] rounded-r-xl space-y-4">
                        {material.explanation && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-[#f27d26] uppercase font-mono tracking-widest font-black">
                              <BookOpen className="w-4 h-4" />
                              <span>Notes Culturelles</span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed font-serif">
                              {material.explanation}
                            </p>
                          </div>
                        )}

                        {material.keyVocabulary && material.keyVocabulary.length > 0 && (
                          <div className="space-y-2 pt-2.5 border-t border-[#222222]">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-mono tracking-widest font-black">
                              <Sparkles className="w-3.5 h-3.5 text-[#f27d26]" />
                              <span>Vocabulaire Clé &bull; Cliquez pour Analyser</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {material.keyVocabulary.map((vocab, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleWordClick(vocab.word, "")}
                                  className="text-xs bg-[#1a1a1a] hover:bg-[#252525] border border-[#2d2d2d] hover:border-[#f27d26] text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all text-left uppercase font-mono tracking-wide"
                                >
                                  <span className="font-bold text-[#f27d26] lowercase first-letter:uppercase">{vocab.word}</span>
                                  <span className="text-gray-550 text-[10px]">&rarr;</span>
                                  <span className="text-gray-400 lowercase text-[10px] normal-case">{vocab.translation}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "review" && (
              /* =======================================
                 REVIEW DICTIONARY / STUDY FLASHCARDS
                 ======================================= */
              <div id="flashcards-center" className="space-y-5 animate-fade-in">
                
                <div className="border-b border-[#222222] pb-3 space-y-1">
                  <h2 className="text-lg font-serif italic font-extrabold text-white">
                    Système Spacé (Leitner)
                  </h2>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Filtrez vos fiches par date de révision. Augmentez la boîte pour distancer les répétitions.
                  </p>
                </div>

                {flashcards.length === 0 ? (
                  <div className="text-center py-10 bg-[#121212] border border-[#222222] rounded-2xl p-6 space-y-4">
                    <Layers className="w-8 h-8 mx-auto text-[#444444]" />
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Dictionnaire vide</p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                      Aucun mot de vocabulaire n'est actuellement sauvegardé. Cliquez sur n'importe quel mot dans vos leçons pour le traduire et le lier à votre compte !
                    </p>
                    <button
                      onClick={() => setActiveTab("learn")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f27d26] hover:underline uppercase tracking-wide"
                    >
                      <span>Prendre mon premier cours</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 bg-[#121212] border border-[#222222] p-4 rounded-xl">
                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500">
                        <span>ENTRAINEMENT MEMOIRE</span>
                        <span className="text-[#f27d26] font-bold">
                          Total : {flashcards.length} cartes
                        </span>
                      </div>

                      {filteredCards.length > 0 && studyCardIndex < filteredCards.length ? (
                        (() => {
                          const card = filteredCards[studyCardIndex];
                          return (
                            <div className="space-y-4">
                              <div 
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                className="w-full min-h-[160px] cursor-pointer"
                              >
                                <div className="bg-[#1a1a1a] border border-[#303030] hover:border-[#f27d26] rounded-xl p-4 flex flex-col justify-between min-h-[160px] transition-all">
                                  
                                  <div className="flex justify-between text-[9px] font-mono text-[#888888]">
                                    <span>BOÎTE {card.box}</span>
                                    <span>{isCardFlipped ? "TRADUCTION (English)" : "MOT EN FRANÇAIS (Click to flip)"}</span>
                                  </div>

                                  <div className="text-center py-2 space-y-1">
                                    {!isCardFlipped ? (
                                      <h3 className="text-2xl font-serif font-black text-white">
                                        {card.word}
                                      </h3>
                                    ) : (
                                      <div className="space-y-1 animate-fade-in">
                                        <p className="text-xl font-serif italic text-[#f27d26] font-bold">
                                          {card.translation}
                                        </p>
                                        <span className="text-[9px] uppercase font-mono tracking-wider bg-black/40 text-gray-400 py-0.5 px-1.5 rounded-md inline-block">
                                          {card.grammaticalContext}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-center border-t border-[#262626] pt-2">
                                    <p className="text-[10.5px] text-gray-400 font-serif italic line-clamp-2 leading-relaxed">
                                      {isCardFlipped ? `“${card.frenchExample}”` : `“${card.contextSentence}”`}
                                    </p>
                                  </div>

                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                {isCardFlipped ? (
                                  <>
                                    <button
                                      onClick={() => handleLeitnerAnswer(card.id, false)}
                                      className="flex-1 py-1.5 px-2 bg-red-950/45 hover:bg-red-900 border border-red-900/50 text-red-200 rounded-lg text-[11px] font-black uppercase flex items-center justify-center gap-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Incorrect (Box 1)</span>
                                    </button>
                                    <button
                                      onClick={() => handleLeitnerAnswer(card.id, true)}
                                      className="flex-1 py-1.5 px-2 bg-emerald-950/45 hover:bg-emerald-900 border border-emerald-900/50 text-emerald-200 rounded-lg text-[11px] font-black uppercase flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Correct (Box Up!)</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setIsCardFlipped(true)}
                                    className="w-full py-2 bg-white hover:bg-gray-100 text-black font-black uppercase text-[10px] tracking-wider rounded-lg flex items-center justify-center gap-1.5"
                                  >
                                    <span>Révéler la Traduction</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center py-6 space-y-2">
                          <p className="text-xs text-gray-400 font-serif italic">
                            Bravo ! Aucune autre fiche n'est due pour le moment.
                          </p>
                          <button
                            onClick={() => {
                              setStudyCardIndex(0);
                              setIsCardFlipped(false);
                            }}
                            className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#f27d26] hover:underline"
                          >
                            Recommencer la boucle de révision
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SEARCH COLLECTION LISTING */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-serif italic font-extrabold text-[13px] text-white">
                          Vos Mots Enregistrés ({filteredCards.length})
                        </h3>
                        
                        <button
                          onClick={() => setShowOnlyDue(!showOnlyDue)}
                          className={`text-[9px] font-mono tracking-widest uppercase border py-0.5 px-2 rounded-md ${
                            showOnlyDue 
                              ? "bg-[#f27d26] text-white border-[#f27d26]" 
                              : "border-[#333] text-gray-400 hover:bg-[#1a1a1a]"
                          }`}
                        >
                          {showOnlyDue ? "Dûs Seulement" : "Voir Tout"}
                        </button>
                      </div>

                      {/* Input Search */}
                      <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="w-3.5 h-3.5 text-gray-500" />
                        </span>
                        <input
                          type="text"
                          placeholder="Rechercher un mot de vocabulaire..."
                          value={flashcardSearch}
                          onChange={(e) => setFlashcardSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#222222] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#f27d26] transition-colors"
                        />
                      </div>

                      {/* Display row items */}
                      <div className="space-y-2.5">
                        {filteredCards.map((card) => {
                          const isCardCurrentlySelected = selectedWord?.toLowerCase() === card.word.toLowerCase();
                          return (
                            <div 
                              key={card.id}
                              className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                                isCardCurrentlySelected 
                                  ? "bg-[#1f1610] border-[#c05e19]" 
                                  : "bg-[#111] border-[#222] hover:border-[#333]"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      onClick={() => handleWordClick(card.word, card.contextSentence)}
                                      className="text-base font-serif font-black text-white cursor-pointer hover:text-[#f27d26] underline decoration-dotted underline-offset-2"
                                    >
                                      {card.word}
                                    </span>
                                    <span className="text-[8px] font-mono bg-[#1a1a1a] border border-[#333333] px-1.5 py-0.2 rounded-sm text-gray-400">
                                      Boîte {card.box}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#f27d26] font-serif italic mt-0.5">
                                    {card.translation}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handleRemoveCard(card.id)}
                                  className="p-1 text-gray-500 hover:text-red-500 rounded hover:bg-[#1a1a1a] transition-all"
                                  title="Retirer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              
                              <p className="text-[10px] text-gray-500 italic font-serif leading-tight">
                                <strong>Exemple:</strong> {card.frenchExample}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              /* =======================================
                 SETTINGS PORTAL
                 ======================================= */
              <div id="settings-desk" className="space-y-6 animate-fade-in text-white">
                
                <div className="border-b border-[#222222] pb-3 space-y-1">
                  <h2 className="text-lg font-serif italic font-extrabold text-white">
                    Paramètres de l'Application
                  </h2>
                  <p className="text-[11px] text-gray-400 leading-normal font-mono uppercase tracking-wider">
                    Gérer votre profil et vos préférences de thème de lecture
                  </p>
                </div>

                {/* Account Details Box */}
                <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f27d26]/10 border border-[#f27d26]/30 flex items-center justify-center text-[#f27d26] text-sm font-bold uppercase font-mono">
                      {user.displayName ? user.displayName.slice(0, 2) : "FR"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-none">
                        {user.displayName || "Apprenti Français"}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono mt-1 select-all">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 bg-red-950/45 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500 text-red-200 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>

                {/* Change French level */}
                <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
                  <span className="block text-gray-400 font-black text-[10px] uppercase tracking-widest font-mono">
                    Niveau de Français actuel :
                  </span>

                  <div className="space-y-2">
                    {[
                      { value: "Beginner", label: "Débutant (A1-A2)", desc: "Conversations simples et mots courants" },
                      { value: "Intermediate", label: "Intermédiaire (B1-B2)", desc: "Lectures régulières et nuances du quotidien" },
                      { value: "Advanced", label: "Avancé (C1-C2)", desc: "Rapports d'actualités et niveau académique" }
                    ].map((lvl) => (
                      <button
                        key={lvl.value}
                        onClick={() => handleUpdateLevel(lvl.value as ProficiencyLevel)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${
                          selectedLevel === lvl.value
                            ? "border-[#f27d26] bg-[#f27d26]/5 ring-1 ring-[#f27d26]"
                            : "border-[#1e1e1e] bg-[#0c0c0c] hover:border-[#333]"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">{lvl.label}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5 block">{lvl.desc}</span>
                        </div>
                        {selectedLevel === lvl.value && (
                          <div className="w-2 h-2 rounded-full bg-[#f27d26]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Light/Dark Mode switch */}
                <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 space-y-3">
                  <span className="block text-gray-400 font-black text-[10px] uppercase tracking-widest font-mono">
                    Thème de l'interface :
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDarkMode(true)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all ${
                        darkMode
                          ? "border-[#f27d26] bg-[#f27d26]/5 text-[#f27d26]"
                          : "border-[#1e1e1e] bg-[#0c0c0c] text-gray-500 hover:border-[#333]"
                      }`}
                    >
                      <span>🌙</span>
                      <span>Mode Sombre</span>
                    </button>

                    <button
                      onClick={() => setDarkMode(false)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider font-mono flex items-center justify-center gap-2 transition-all ${
                        !darkMode
                          ? "border-amber-500 bg-amber-500/5 text-amber-500"
                          : "border-[#1e1e1e] bg-[#0c0c0c] text-gray-500 hover:border-[#333]"
                      }`}
                    >
                      <span>☀️</span>
                      <span>Mode Clair</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </main>
        )}

        {/* PERSISTENT TRANSLATION POPUP MODAL (Google Translate direct popup) */}
        {selectedWord && (
          <div 
            id="word-lookup-modal-backdrop" 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setSelectedWord(null)}
          >
            <div 
              id="word-lookup-modal-card"
              className="w-full max-w-[390px] bg-white text-black p-5 rounded-2xl shadow-2xl border border-gray-200 space-y-4 max-h-[85%] overflow-y-auto relative animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button inline top-right */}
              <button
                onClick={() => setSelectedWord(null)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-105 transition-colors"
                title="Fermer"
              >
                <XCircle className="w-5 h-5" />
              </button>

              {isAnalyzingWord ? (
                <div id="word-lookup-spinner" className="py-8 text-center space-y-3">
                  <div className="w-7 h-7 border-3 border-[#f27d26] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[11px] uppercase tracking-wider text-gray-600 font-bold font-mono">
                    Traduction de "{selectedWord}"...
                  </p>
                </div>
              ) : analysisError ? (
                <div className="py-4 text-center space-y-3">
                  <p className="text-xs text-red-600 font-semibold">{analysisError}</p>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={() => handleWordClick(selectedWord, selectedWordSentence)}
                      className="text-[10px] underline font-bold uppercase tracking-wider text-black mr-2"
                    >
                      Réessayer
                    </button>
                    <button
                      onClick={() => setSelectedWord(null)}
                      className="text-[10px] underline text-gray-500"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : wordAnalysis ? (
                <div id="word-lookup-content" className="space-y-4">
                  
                  {/* Header details */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-[#f27d26] font-bold bg-[#f27d26]/10 px-2 py-0.5 rounded">
                      Analyse de vocabulaire
                    </span>
                    <h4 className="text-2xl font-serif italic leading-none font-bold select-all text-black pt-1">
                      {wordAnalysis.word}
                    </h4>
                  </div>

                  {/* Body translation specs */}
                  <div className="space-y-3 pt-3 border-t border-gray-150">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase text-gray-400 font-semibold tracking-wider font-mono">Définition / Traduction :</p>
                      <p className="text-base font-serif font-black text-black">
                        {wordAnalysis.translation}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {wordAnalysis.grammaticalContext && (
                        <span className="text-[9px] uppercase font-mono font-semibold bg-gray-100 text-gray-700 py-0.5 px-2 rounded">
                          {wordAnalysis.grammaticalContext}
                        </span>
                      )}
                      {wordAnalysis.pronunciation && (
                        <span className="text-[9px] uppercase font-mono font-semibold bg-[#f27d26]/10 text-[#f27d26] py-0.5 px-2 rounded">
                          {wordAnalysis.pronunciation}
                        </span>
                      )}
                    </div>
                    
                    {/* Source contextual line usage */}
                    {selectedWordSentence && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                        <p className="text-[9px] text-gray-550 uppercase font-mono tracking-wider">Phrase source contextuelle :</p>
                        <p className="text-xs text-black font-serif italic">
                          “{selectedWordSentence}”
                        </p>
                        {wordAnalysis.englishExample && wordAnalysis.englishExample !== "Context translation" && (
                          <p className="text-[10.5px] text-gray-550 italic leading-snug">
                            → {wordAnalysis.englishExample}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Operational Footer action buttons */}
                  {user && (
                    <div className="pt-3 border-t border-gray-100 flex justify-end items-center gap-2">
                      <button
                        onClick={handleAddFlashcard}
                        className="w-full text-[10.5px] border border-black bg-black text-white hover:bg-neutral-800 py-2.5 px-4 rounded-lg uppercase font-black tracking-tight transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Enregistrer dans mon dictionnaire</span>
                      </button>
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR (Unified Nav) */}
        {user && (
          <footer className="p-4 border-t border-[#222222] bg-[#0c0c0c] z-10 sticky bottom-0">
            <div className="flex justify-between items-center text-xs">
              <div className="flex gap-4">
                <div 
                  onClick={() => setActiveTab("learn")}
                  className={`group cursor-pointer flex flex-col items-center select-none ${
                    activeTab === "learn" ? "text-white" : "opacity-45 hover:opacity-85"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-all ${
                    activeTab === "learn" ? "bg-[#f27d26]" : "bg-transparent"
                  }`} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Leçons</span>
                </div>

                <div 
                  onClick={() => setActiveTab("review")}
                  className={`group cursor-pointer flex flex-col items-center select-none ${
                    activeTab === "review" ? "text-white" : "opacity-45 hover:opacity-85"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-all ${
                    activeTab === "review" ? "bg-[#f27d26]" : "bg-transparent"
                  }`} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Révisions</span>
                </div>

                <div 
                  onClick={() => setActiveTab("settings")}
                  className={`group cursor-pointer flex flex-col items-center select-none ${
                    activeTab === "settings" ? "text-white" : "opacity-45 hover:opacity-85"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-all ${
                    activeTab === "settings" ? "bg-[#f27d26]" : "bg-transparent"
                  }`} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Paramètres</span>
                </div>
              </div>

              <div className="h-5 w-px bg-[#222222]" />

              <button
                id="ai-instant-generate-footer"
                onClick={handleGenerateContent}
                disabled={isGenerating}
                className="text-[10px] font-black uppercase tracking-wider bg-white hover:bg-gray-100 text-black py-1.5 px-2.5 rounded-lg flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f27d26]" />
                <span>Nouveau 💡</span>
              </button>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
