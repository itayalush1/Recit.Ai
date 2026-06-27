import React from "react";
import { ActiveTab, CEFRLevel } from "../types";
import { User } from "firebase/auth";
import { Newspaper, BookOpen, Layers, Sparkles, Globe, LogIn, LogOut, User as UserIcon } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentLevel: CEFRLevel;
  setCurrentLevel: (level: CEFRLevel) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  savedVocabCount: number;
  currentUser?: User | null;
  onLogin?: () => void;
  onLogout?: () => void;
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function Navbar({
  activeTab,
  setActiveTab,
  currentLevel,
  setCurrentLevel,
  darkMode,
  setDarkMode,
  savedVocabCount,
  currentUser,
  onLogin,
  onLogout,
}: NavbarProps) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 border-b border-gray-100 dark:border-gray-800 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-20 gap-2 sm:gap-4">
            
            {/* Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => setActiveTab("news")}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <h1 className="font-sans font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-gray-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent truncate">
                  L'Actu Français
                </h1>
                <p className="text-[9px] sm:text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold truncate hidden sm:block">
                  Immersion Réelle IA
                </p>
              </div>
            </div>

            {/* Center Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200/60 dark:border-gray-800 shrink-0">
              <button
                id="tab-news-btn"
                onClick={() => setActiveTab("news")}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                  activeTab === "news"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Newspaper className="w-4 h-4" />
                <span>Dernières Infos</span>
              </button>

              <button
                id="tab-reader-btn"
                onClick={() => setActiveTab("reader")}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                  activeTab === "reader"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Lecteur IA</span>
              </button>

              <button
                id="tab-custom-btn"
                onClick={() => setActiveTab("custom")}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all ${
                  activeTab === "custom"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Sujet sur Mesure</span>
              </button>

              <button
                id="tab-vault-btn"
                onClick={() => setActiveTab("vault")}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all relative ${
                  activeTab === "vault"
                    ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Vault Flashcards</span>
                {savedVocabCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-600 text-white font-mono font-bold">
                    {savedVocabCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Right Controls: CEFR Switcher (Desktop), Theme & Firebase Auth */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              {/* CEFR Level Selector Pill (Hidden on Mobile/Tablet < lg) */}
              <div className="hidden lg:flex items-center bg-indigo-50 dark:bg-indigo-950/40 p-1 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-700 dark:text-indigo-300 px-2">
                  CEFR:
                </span>
                <div className="flex items-center gap-0.5">
                  {CEFR_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      id={`cefr-lvl-${lvl}`}
                      onClick={() => setCurrentLevel(lvl)}
                      className={`px-2 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                        currentLevel === lvl
                          ? "bg-indigo-600 text-white shadow-xs scale-105"
                          : "text-indigo-600/70 dark:text-indigo-400/70 hover:text-indigo-900 dark:hover:text-white"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />

              {/* Firebase Login / User Pill */}
              {currentUser ? (
                <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-900 pl-2 sm:pl-3 pr-1.5 sm:pr-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-medium">
                  <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="max-w-[65px] sm:max-w-[120px] truncate hidden sm:inline">
                    {currentUser.displayName || currentUser.email?.split("@")[0] || "Connecté"}
                  </span>
                  <button
                    onClick={onLogout}
                    title="Se déconnecter"
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLogin}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Connexion Google</span>
                  <span className="sm:hidden">Login</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Mobile CEFR Level Selector Strip (< lg) */}
        <div className="lg:hidden px-3 sm:px-6 py-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 shrink-0">
            Niveau CEFR :
          </span>
          <div className="flex items-center justify-end gap-1 flex-1 overflow-x-auto no-scrollbar max-w-[280px] sm:max-w-md">
            {CEFR_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setCurrentLevel(lvl)}
                className={`flex-1 min-w-[32px] py-1 px-1 rounded-lg text-xs font-mono font-bold text-center transition-all ${
                  currentLevel === lvl
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white border border-gray-200/60 dark:border-gray-700"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur-xl px-2 py-1.5 shadow-lg flex items-center justify-around">
        <button
          onClick={() => setActiveTab("news")}
          className={`flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl text-[11px] font-semibold transition-colors ${
            activeTab === "news" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" : "text-gray-500"
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Infos</span>
        </button>
        <button
          onClick={() => setActiveTab("reader")}
          className={`flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl text-[11px] font-semibold transition-colors ${
            activeTab === "reader" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" : "text-gray-500"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Lecteur</span>
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl text-[11px] font-semibold transition-colors ${
            activeTab === "custom" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" : "text-gray-500"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Sujet</span>
        </button>
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex flex-col items-center gap-1 min-w-[64px] py-1 rounded-xl text-[11px] font-semibold transition-colors relative ${
            activeTab === "vault" ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" : "text-gray-500"
          }`}
        >
          <div className="relative">
            <Layers className="w-4 h-4" />
            {savedVocabCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1 py-0 text-[8px] rounded-full bg-indigo-600 text-white font-bold">
                {savedVocabCount}
              </span>
            )}
          </div>
          <span>Vault</span>
        </button>
      </div>
    </>
  );
}
