import React, { useState, useEffect } from "react";
import { Article, VocabItem } from "../types";
import { getSavedVocab, removeVocabItem, getSavedArticles, removeBookmarkedArticle } from "../services/vault";
import { 
  Layers, BookOpen, Trash2, Volume2, Sparkles, RefreshCw, 
  ArrowRight, CheckCircle2, Bookmark, Newspaper, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VaultViewProps {
  onSelectArticle: (article: Article) => void;
  onUpdateVocabCount: () => void;
}

export default function VaultView({ onSelectArticle, onUpdateVocabCount }: VaultViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"flashcards" | "articles">("flashcards");
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  
  // Practice Flashcard State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setVocabList(getSavedVocab());
    setArticles(getSavedArticles());
  }, []);

  const handleDeleteVocab = (word: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = removeVocabItem(word);
    setVocabList(updated);
    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    }
    onUpdateVocabCount();
  };

  const handleDeleteArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeBookmarkedArticle(id);
    setArticles(updated);
  };

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  const currentVocab = vocabList[currentIndex];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Mon Coffre-fort (Vault)</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Révisez vos flashcards de vocabulaire et retrouvez vos lectures favorites hors ligne.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={() => { setActiveSubTab("flashcards"); setIsFlipped(false); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === "flashcards"
                ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Flashcards ({vocabList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("articles")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === "articles"
                ? "bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Articles ({articles.length})</span>
          </button>
        </div>
      </div>

      {/* SUB TAB 1: FLASHCARDS PRACTICE ENGINE */}
      {activeSubTab === "flashcards" && (
        <div className="space-y-8">
          {vocabList.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 space-y-4 shadow-xs">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-lg">Votre liste de Flashcards est vide</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Lisez des actualités ou disséquez des phrases pour sauvegarder automatiquement des mots dans votre Vault!
              </p>
            </div>
          ) : (
            <div className="max-w-lg mx-auto space-y-6">
              
              {/* Progress Count Bar */}
              <div className="flex items-center justify-between text-xs font-mono text-gray-500">
                <span>Carte {currentIndex + 1} sur {vocabList.length}</span>
                <span>Niveau {currentVocab?.cefrLevel || "B1"}</span>
              </div>

              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative min-h-[340px] cursor-pointer perspective-1000 group"
              >
                <AnimatePresence mode="wait">
                  {!isFlipped ? (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-8 text-white shadow-xl flex flex-col justify-between items-center text-center select-none"
                    >
                      <div className="w-full flex justify-between items-center text-indigo-200">
                        <span className="text-xs font-mono uppercase tracking-wider font-semibold">Recto (Français)</span>
                        <button
                          onClick={(e) => handleSpeak(currentVocab.word, e)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                          title="Écouter"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 my-auto">
                        <h3 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight">
                          {currentVocab.word}
                        </h3>
                        <p className="text-xs font-mono px-3 py-1 bg-white/15 rounded-full inline-block">
                          {currentVocab.partOfSpeech}
                        </p>
                      </div>

                      <span className="text-xs text-indigo-100 opacity-80 animate-pulse">
                        👆 Cliquez pour retourner (Définition)
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: -90 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 rounded-3xl bg-white dark:bg-gray-900 border-2 border-indigo-500 p-8 text-gray-900 dark:text-white shadow-xl flex flex-col justify-between select-none space-y-4 overflow-y-auto"
                    >
                      <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                        <span>Verso (Explication)</span>
                        <button
                          onClick={(e) => handleDeleteVocab(currentVocab.word, e)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Supprimer du Vault"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4 my-auto">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                            Définition Française:
                          </span>
                          <p className="font-semibold text-base leading-relaxed">
                            {currentVocab.definition}
                          </p>
                        </div>

                        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
                            Traduction Anglaise:
                          </span>
                          <p className="font-serif italic text-sm text-gray-600 dark:text-gray-300">
                            🇬🇧 {currentVocab.englishTranslation}
                          </p>
                        </div>

                        {currentVocab.example && (
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-600 dark:text-gray-300">
                            💡 {currentVocab.example}
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-center text-gray-400">
                        👆 Cliquez pour revoir le mot
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={() => {
                    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : vocabList.length - 1));
                    setIsFlipped(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-sm transition-colors"
                >
                  ← Précédent
                </button>

                <button
                  onClick={() => {
                    setCurrentIndex((prev) => (prev < vocabList.length - 1 ? prev + 1 : 0));
                    setIsFlipped(false);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm hover:opacity-90 shadow-md transition-opacity"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 2: SAVED ARTICLES */}
      {activeSubTab === "articles" && (
        <div className="space-y-6">
          {articles.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 space-y-4 shadow-xs">
              <Bookmark className="w-12 h-12 text-gray-300 mx-auto" />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-lg">Aucun article favori</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Cliquez sur le bouton Favori sur n'importe quelle actualité pour la sauvegarder dans votre bibliothèque hors ligne!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art)}
                  className="group p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-500 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-xs uppercase">
                        {art.category}
                      </span>
                      <button
                        onClick={(e) => handleDeleteArticle(art.id, e)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-xs font-serif italic text-gray-500 dark:text-gray-400">
                      {art.titleEnglish}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {art.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs font-mono text-gray-400">
                    <span>Niveau {art.cefrLevel}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Relire <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
