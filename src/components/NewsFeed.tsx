import React, { useState, useEffect } from "react";
import { Article, CEFRLevel, NewsCategory } from "../types";
import { fetchNewsArticles } from "../services/api";
import { 
  Newspaper, RefreshCw, Sparkles, Clock, BookOpen, BookmarkPlus, 
  Check, ExternalLink, ShieldCheck, Zap, AlertTriangle, ChevronRight, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { bookmarkArticle, isArticleBookmarked } from "../services/vault";

interface NewsFeedProps {
  currentLevel: CEFRLevel;
  onSelectArticle: (article: Article) => void;
}

const CATEGORIES: NewsCategory[] = [
  "Top Stories",
  "Tech & AI",
  "Culture & Art",
  "France Politics",
  "Science",
  "Sports",
  "Business",
];

export default function NewsFeed({ currentLevel, onSelectArticle }: NewsFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>("Top Stories");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  const loadNews = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNewsArticles(selectedCategory, currentLevel, forceRefresh);
      setArticles(res.articles || []);
      setIsCached(!!res.cached);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les actualités.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [selectedCategory, currentLevel]);

  const handleBookmark = (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    bookmarkArticle(article);
    setBookmarkedIds((prev) => ({ ...prev, [article.id]: true }));
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-900 to-blue-900 p-8 sm:p-10 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-mono font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Actualités Fact-Checked par Google Search IA</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-sans font-bold tracking-tight">
            Apprenez le Français avec l'Actualité Réelle ({currentLevel})
          </h2>
          <p className="text-indigo-100 text-sm sm:text-base opacity-90 leading-relaxed">
            Chaque article est synthétisé et adapté exactement à votre niveau CEFR <strong>{currentLevel}</strong> avec du vocabulaire clé, des explications grammaticales et des sources vérifiées.
          </p>
        </div>
      </div>

      {/* Category Pills & Refresh Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        
        {/* Category Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`news-cat-${cat.replace(/\s+/g, "-")}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md scale-105"
                  : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              <span>{cat === "Top Stories" ? "🔥 À la Une" : cat}</span>
            </button>
          ))}
        </div>

        {/* Refresh & Cache Badge */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {isCached && !loading && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-900/60" title="Contenu en cache rapide">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Cache Rapide</span>
            </span>
          )}

          <button
            id="refresh-news-btn"
            onClick={() => loadNews(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-900/60 transition-all disabled:opacity-50"
            title="Générer de nouvelles actualités vérifiées"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Synthèse IA..." : "Actualiser (Vérifié IA)"}</span>
          </button>
        </div>
      </div>

      {/* Error Recovery */}
      {error && (
        <div className="p-6 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-red-900 dark:text-red-200 text-sm">Erreur de chargement</h4>
            <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed">{error}</p>
            <button
              onClick={() => loadNews(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors inline-block mt-2"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Skeletons Loading Grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-4 animate-pulse bg-white dark:bg-gray-900 shadow-xs">
              <div className="flex justify-between">
                <div className="w-20 h-6 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              </div>
              <div className="w-3/4 h-7 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="space-y-2">
                <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                <div className="w-5/6 h-4 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              </div>
              <div className="pt-4 flex justify-between items-center">
                <div className="w-28 h-5 bg-gray-200 dark:bg-gray-800 rounded-lg" />
                <div className="w-32 h-10 bg-indigo-100 dark:bg-indigo-950 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Articles Cards Grid */}
      {!loading && articles.length === 0 && !error && (
        <div className="py-20 text-center space-y-4">
          <Newspaper className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Aucune actualité récente trouvée</h3>
          <p className="text-sm text-gray-500">Essayez de changer de catégorie ou cliquez sur Actualiser.</p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {articles.map((art, idx) => {
              const bookmarked = isArticleBookmarked(art.id) || !!bookmarkedIds[art.id];

              return (
                <motion.div
                  key={art.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  onClick={() => onSelectArticle(art)}
                  className="group relative rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden"
                >
                  <div className="space-y-4">
                    
                    {/* Top Row: Category, CEFR & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-sans font-semibold text-[11px] uppercase tracking-wider">
                          {art.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-mono font-bold text-xs">
                          {art.cefrLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{art.readTimeMinutes} min</span>
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="space-y-1.5">
                      <h3 className="font-sans font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs font-serif italic text-gray-500 dark:text-gray-400">
                        {art.titleEnglish}
                      </p>
                    </div>

                    {/* Summary Excerpt */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                      {art.summary}
                    </p>

                    {/* Grammar Spotlight preview badge */}
                    {art.grammarPoint && (
                      <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300 font-medium">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate"><strong>Point Grammaire:</strong> {art.grammarPoint.title}</span>
                      </div>
                    )}

                    {/* Grounding Sources (Google Search links) */}
                    {art.sources && art.sources.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-mono font-semibold uppercase text-gray-400 shrink-0 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Sources:
                        </span>
                        {art.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-mono truncate max-w-[150px] transition-colors border border-gray-200/50 dark:border-gray-700"
                            title={src.uri}
                          >
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-6 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                    <button
                      onClick={(e) => handleBookmark(e, art)}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                        bookmarked
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      title={bookmarked ? "Dans vos favoris" : "Sauvegarder pour lire plus tard"}
                    >
                      {bookmarked ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      <span className="hidden sm:inline">{bookmarked ? "Enregistré" : "Favori"}</span>
                    </button>

                    <button
                      className="flex-1 py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-sans font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 group-hover:translate-x-1 transition-all"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Lire & Dissecter</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
