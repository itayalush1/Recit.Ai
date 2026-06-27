import React, { useState } from "react";
import { ExplanationResult, VocabItem, CEFRLevel } from "../types";
import { Sparkles, BookOpen, Volume2, BookmarkPlus, Check, X, Layers, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveVocabItem } from "../services/vault";

interface SelectionPanelProps {
  selection: string | null;
  explanation: ExplanationResult | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  currentLevel: CEFRLevel;
}

export default function SelectionPanel({
  selection,
  explanation,
  loading,
  error,
  onClose,
  currentLevel,
}: SelectionPanelProps) {
  const [saved, setSaved] = useState(false);

  if (!selection && !loading) return null;

  const handleSaveToVault = () => {
    if (!explanation) return;
    const vocab: VocabItem = {
      word: explanation.selection,
      partOfSpeech: "expression / phrase",
      definition: explanation.naturalEnglish,
      englishTranslation: explanation.literalTranslation,
      example: explanation.usageNotes,
      cefrLevel: currentLevel,
    };
    saveVocabItem(vocab);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSpeak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.85; // slightly slower for learners
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        id="ai-dissect-panel"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white dark:bg-gray-900 border border-indigo-100 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-sm tracking-wide">
                L'Assistant IA • Dissection {currentLevel}
              </h3>
              <p className="text-xs text-indigo-100 opacity-90">Analyse syntaxique & culturelle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
            aria-label="Fermer le panneau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Selected Text Highlight */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-gray-800/80 border border-indigo-100 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <p className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 italic">
                "{selection}"
              </p>
              {selection && (
                <button
                  onClick={() => handleSpeak(selection)}
                  className="p-2 rounded-xl bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs hover:scale-105 transition-transform shrink-0"
                  title="Écouter la prononciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="py-10 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Fact-checking & dissection grammaticale en cours...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {explanation && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 text-sm text-gray-700 dark:text-gray-300"
            >
              {/* Translations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Sens Naturel
                  </span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {explanation.naturalEnglish}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Mot à mot
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {explanation.literalTranslation}
                  </p>
                </div>
              </div>

              {/* Grammar Breakdown */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-semibold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4" />
                  Structure Grammaticale
                </div>
                <p className="leading-relaxed text-blue-900 dark:text-blue-200">
                  {explanation.grammarBreakdown}
                </p>
              </div>

              {/* Usage Notes */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" />
                  Contexte & Usage Natif
                </div>
                <p className="leading-relaxed text-amber-950 dark:text-amber-200">
                  {explanation.usageNotes}
                </p>
              </div>

              {/* Pronunciation Tip */}
              {explanation.pronunciationTip && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span><strong>Astuce Prononciation:</strong> {explanation.pronunciationTip}</span>
                </div>
              )}

              {/* Save to Vault Action */}
              <div className="pt-2">
                <button
                  onClick={handleSaveToVault}
                  disabled={saved}
                  className={`w-full py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                    saved
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  }`}
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4" /> Enregistré dans votre Vault!
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4" /> Sauvegarder dans ma liste Flashcard
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
