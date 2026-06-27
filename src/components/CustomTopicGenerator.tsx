import React, { useState } from "react";
import { Article, CEFRLevel } from "../types";
import { generateCustomTopic } from "../services/api";
import { Sparkles, BookOpen, Send, Lightbulb, Zap, Clock } from "lucide-react";
import { motion } from "motion/react";

interface CustomTopicGeneratorProps {
  currentLevel: CEFRLevel;
  onArticleGenerated: (article: Article) => void;
}

const SUGGESTIONS = [
  "L'histoire de la Baguette française 🥖",
  "La conquête spatiale & Thomas Pesquet 🚀",
  "La Mode à Paris & Haute Couture 👗",
  "L'Intelligence Artificielle au travail 💻",
  "Le Cinéma Français du Nouveau Vague 🎬",
  "La Tour Eiffel et sa construction 🗼",
];

export default function CustomTopicGenerator({
  currentLevel,
  onArticleGenerated,
}: CustomTopicGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const art = await generateCustomTopic(topic.trim(), currentLevel);
      onArticleGenerated(art);
    } catch (err: any) {
      setError(err.message || "Impossible de générer cet article.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20">
      
      {/* Hero Header */}
      <div className="text-center space-y-4 pt-6">
        <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-950/60 rounded-3xl text-amber-500 shadow-inner">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-sans font-bold text-gray-900 dark:text-white tracking-tight">
          Générateur de Lecture sur Mesure ({currentLevel})
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
          Quelle passion ou question avez-vous aujourd'hui? Entrez n'importe quel sujet et notre IA éditera un article captivant adapté strictement à votre niveau CEFR <strong>{currentLevel}</strong>.
        </p>
      </div>

      {/* Main Input Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="custom-topic-input" className="block text-xs font-mono uppercase font-bold text-gray-500 dark:text-gray-400">
            Sujet ou Question (en français ou anglais):
          </label>
          <div className="relative flex items-center">
            <input
              id="custom-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ex: Le mystère du Masque de Fer..."
              disabled={loading}
              className="w-full py-4 pl-5 pr-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="absolute right-2 py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-sm shadow-md disabled:opacity-40 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Écrire</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200">
            {error}
          </div>
        )}

        {/* Suggestion Pills */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 font-semibold uppercase">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Idées populaires pour progresser:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTopic(sug)}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium transition-all text-left border border-gray-200/50 dark:border-gray-700/50"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 space-y-2">
          <Clock className="w-6 h-6 text-indigo-500 mx-auto" />
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Lecture 4 min</h4>
          <p className="text-xs text-gray-500">Format idéal pour la mémoire active quotidienne.</p>
        </div>
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800 border border border-gray-100 dark:border-gray-800 space-y-2">
          <Zap className="w-6 h-6 text-amber-500 mx-auto" />
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">CEFR Calibré</h4>
          <p className="text-xs text-gray-500">Vocabulaire et temps grammaticaux parfaits pour votre niveau.</p>
        </div>
        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 space-y-2">
          <BookOpen className="w-6 h-6 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">Dissection IA</h4>
          <p className="text-xs text-gray-500">Surlignez vos expressions pour comprendre la syntaxe.</p>
        </div>
      </div>

    </div>
  );
}
