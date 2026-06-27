import React, { useState, useEffect } from "react";
import { ActiveTab, Article, CEFRLevel } from "./types";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { loginWithGoogle, logoutUser } from "./services/auth";
import Navbar from "./components/Navbar";
import NewsFeed from "./components/NewsFeed";
import ArticleReader from "./components/ArticleReader";
import VaultView from "./components/VaultView";
import QuizView from "./components/QuizView";
import CustomTopicGenerator from "./components/CustomTopicGenerator";
import { getPreferredCEFR, savePreferredCEFR, getSavedVocab } from "./services/vault";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("news");
  const [currentLevel, setCurrentLevel] = useState<CEFRLevel>(() => {
    const pref = getPreferredCEFR();
    return (["A1", "A2", "B1", "B2", "C1", "C2"].includes(pref) ? pref : "B1") as CEFRLevel;
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme_pref");
    if (stored) return stored === "dark";
    return document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [savedVocabCount, setSavedVocabCount] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        import("./services/auth").then(({ syncUserData }) => {
          syncUserData(user, () => {
            setSavedVocabCount(getSavedVocab().length);
            const pref = getPreferredCEFR();
            if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(pref)) {
              setCurrentLevel(pref as CEFRLevel);
            }
          });
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    savePreferredCEFR(currentLevel);
  }, [currentLevel]);

  useEffect(() => {
    setSavedVocabCount(getSavedVocab().length);
  }, []);

  const handleLogin = async () => {
    await loginWithGoogle(() => {
      setSavedVocabCount(getSavedVocab().length);
      const pref = getPreferredCEFR();
      if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(pref)) {
        setCurrentLevel(pref as CEFRLevel);
      }
    });
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  const handleSelectArticle = (art: Article) => {
    setActiveArticle(art);
    setActiveTab("reader");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartQuiz = (art: Article) => {
    setActiveArticle(art);
    setActiveTab("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateVocabCount = () => {
    setSavedVocabCount(getSavedVocab().length);
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""} bg-[#faf9f6] dark:bg-[#0c0c0e] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200 flex flex-col pb-16 md:pb-0`}>
      
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentLevel={currentLevel}
        setCurrentLevel={setCurrentLevel}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        savedVocabCount={savedVocabCount}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Container View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {activeTab === "news" && (
          <NewsFeed
            currentLevel={currentLevel}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {activeTab === "reader" && activeArticle && (
          <ArticleReader
            article={activeArticle}
            onBack={() => setActiveTab("news")}
            currentLevel={currentLevel}
            darkMode={darkMode}
            onStartQuiz={handleStartQuiz}
          />
        )}

        {activeTab === "reader" && !activeArticle && (
          <div className="py-24 text-center space-y-4">
            <h3 className="text-xl font-bold">Aucun article sélectionné</h3>
            <button
              onClick={() => setActiveTab("news")}
              className="py-2.5 px-6 rounded-2xl bg-indigo-600 text-white font-semibold text-sm shadow-md"
            >
              Parcourir les Actualités
            </button>
          </div>
        )}

        {activeTab === "custom" && (
          <CustomTopicGenerator
            currentLevel={currentLevel}
            onArticleGenerated={handleSelectArticle}
          />
        )}

        {activeTab === "vault" && (
          <VaultView
            onSelectArticle={handleSelectArticle}
            onUpdateVocabCount={handleUpdateVocabCount}
          />
        )}

        {activeTab === "quiz" && (
          <QuizView
            activeArticle={activeArticle}
            onBackToArticle={() => setActiveTab("reader")}
            currentLevel={currentLevel}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 dark:border-gray-800 py-8 text-center text-xs text-gray-400 font-mono mt-auto bg-white/50 dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>L'Actu Français • Immersion CEFR IA Alimentée par Gemini & Google Search Grounding</p>
          <p className="opacity-75">Générez des résumés fact-checked, sauvegardez vos flashcards et progressez au niveau {currentLevel}</p>
        </div>
      </footer>

    </div>
  );
}
