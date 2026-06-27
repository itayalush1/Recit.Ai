import React, { useState } from "react";
import { Article, CEFRLevel, ExplanationResult, VocabItem } from "../types";
import { explainSelection } from "../services/api";
import { 
  ArrowLeft, BookOpen, Sparkles, Layers, Volume2, BookmarkPlus, 
  Check, HelpCircle, Globe, ExternalLink, ShieldCheck, MessageCircle
} from "lucide-react";
import AudioReader from "./AudioReader";
import SelectionPanel from "./SelectionPanel";
import { bookmarkArticle, isArticleBookmarked, saveVocabItem, isVocabSaved } from "../services/vault";

interface ArticleReaderProps {
  article: Article;
  onBack: () => void;
  currentLevel: CEFRLevel;
  darkMode: boolean;
  onStartQuiz: (article: Article) => void;
}

export default function ArticleReader({
  article,
  onBack,
  currentLevel,
  darkMode,
  onStartQuiz,
}: ArticleReaderProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(() => isArticleBookmarked(article.id));
  const [savedVocabMap, setSavedVocabMap] = useState<Record<string, boolean>>({});

  const handleSentenceClick = async (sentence: string) => {
    const clean = sentence.trim();
    if (!clean || clean.length < 2) return;

    setSelectedText(clean);
    setExplanation(null);
    setExplaining(true);
    setExplainError(null);

    try {
      const res = await explainSelection(clean, article.summary, currentLevel);
      setExplanation(res);
    } catch (err: any) {
      setExplainError(err.message || "Impossible de disséquer cette phrase.");
    } finally {
      setExplaining(false);
    }
  };

  const handleTextMouseUp = () => {
    const selection = window.getSelection()?.toString()?.trim();
    if (selection && selection.length >= 2 && selection !== selectedText) {
      handleSentenceClick(selection);
    }
  };

  const handleToggleBookmark = () => {
    bookmarkArticle(article);
    setBookmarked(true);
  };

  const handleSaveWord = (vocab: VocabItem) => {
    saveVocabItem({ ...vocab, cefrLevel: currentLevel });
    setSavedVocabMap((prev) => ({ ...prev, [vocab.word]: true }));
  };

  // Split summary paragraphs safely
  const paragraphs = article.summary.split(/\n+/).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm shadow-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux Infos</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleBookmark}
            disabled={bookmarked}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm border transition-all ${
              bookmarked
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50"
            }`}
          >
            {bookmarked ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
            <span>{bookmarked ? "Article Sauvegardé" : "Mettre en favori"}</span>
          </button>

          <button
            onClick={() => onStartQuiz(article)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Passer le Quiz IA</span>
          </button>
        </div>
      </div>

      {/* Article Header Card */}
      <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-12 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-sans font-semibold text-xs uppercase tracking-wider">
            {article.category}
          </span>
          <span className="px-3 py-1 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-mono font-bold text-xs">
            Niveau {article.cefrLevel}
          </span>
          <span className="text-xs text-gray-400 font-mono">• {article.publishedDate}</span>
          <span className="text-xs text-gray-400 font-mono">• {article.readTimeMinutes} min de lecture</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-sans font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            {article.title}
          </h1>
          <p className="text-base sm:text-xl font-serif italic text-gray-500 dark:text-gray-400">
            {article.titleEnglish}
          </p>
        </div>

        {/* Audio TTS Reader Controls */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <AudioReader textToRead={article.summary} isDark={darkMode} />
        </div>
      </div>

      {/* Main Grid: Interactive Text & Vocabulary Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Left 2 Cols: Interactive Reading Canvas */}
        <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-12 shadow-xs space-y-8">
          
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <MessageCircle className="w-4 h-4" />
              <span>Mode Lecture Interactive</span>
            </div>
            <span className="text-xs text-gray-400 italic">
              Cliquez ou surlignez n'importe quelle phrase pour disséquer
            </span>
          </div>

          <div
            onMouseUp={handleTextMouseUp}
            className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed space-y-6 text-gray-800 dark:text-gray-200"
          >
            {paragraphs.map((p, pIdx) => {
              // Split sentence by punctuation
              const sentences = p.split(/(?<=[.!?])\s+/);

              return (
                <p key={pIdx} className="leading-loose text-lg sm:text-xl">
                  {sentences.map((sent, sIdx) => {
                    const isSelected = selectedText === sent.trim();

                    return (
                      <span
                        key={sIdx}
                        onClick={() => handleSentenceClick(sent)}
                        className={`cursor-pointer transition-colors duration-150 rounded-lg px-1 py-0.5 inline ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-900 dark:hover:text-indigo-200"
                        }`}
                      >
                        {sent}{" "}
                      </span>
                    );
                  })}
                </p>
              );
            })}
          </div>

          {/* Grammar Spotlight & Cultural Insights Highlights */}
          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {article.grammarPoint && (
              <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  <Layers className="w-4 h-4" />
                  <span>Grammaire: {article.grammarPoint.title}</span>
                </div>
                <p className="text-sm text-blue-950 dark:text-blue-200 leading-relaxed">
                  {article.grammarPoint.explanation}
                </p>
                <div className="p-3 bg-white/80 dark:bg-gray-900/80 rounded-xl border border-blue-200/50 dark:border-blue-800/50 text-xs font-serif italic text-gray-700 dark:text-gray-300">
                  "{article.grammarPoint.exampleFromText}"
                </div>
              </div>
            )}

            {article.culturalFact && (
              <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Éclairage Culturel</span>
                </div>
                <p className="text-sm text-amber-950 dark:text-amber-200 leading-relaxed">
                  {article.culturalFact}
                </p>
              </div>
            )}
          </div>

          {/* Sources Grounding Footnote */}
          {article.sources && article.sources.length > 0 && (
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <span className="text-xs font-mono font-semibold uppercase text-gray-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Sources de Grounding vérifiées:
              </span>
              <div className="flex flex-wrap gap-2">
                {article.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    <span>{src.title}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Key Vocabulary Panel */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 font-sans font-bold text-base text-gray-900 dark:text-white">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Vocabulaire Clé</span>
              </div>
              <span className="text-xs font-mono text-gray-400">
                {article.keyVocabulary?.length || 0} mots
              </span>
            </div>

            <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
              {article.keyVocabulary && article.keyVocabulary.map((v, idx) => {
                const isSaved = isVocabSaved(v.word) || !!savedVocabMap[v.word];

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-100 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 space-y-2 group hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-sans font-bold text-base text-slate-950 dark:text-white">
                          {v.word}
                        </h4>
                        <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                          {v.partOfSpeech}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSaveWord(v)}
                        disabled={isSaved}
                        className={`p-2 rounded-xl transition-all ${
                          isSaved
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                            : "bg-white dark:bg-gray-900 text-gray-700 hover:text-indigo-600 dark:text-gray-200 dark:hover:text-white shadow-sm border border-gray-200 dark:border-gray-700"
                        }`}
                        title={isSaved ? "Dans votre Vault" : "Ajouter aux flashcards"}
                      >
                        {isSaved ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="text-sm text-slate-900 dark:text-gray-100 font-semibold leading-relaxed">
                      {v.definition}
                    </p>
                    <p className="text-xs font-serif italic text-slate-700 dark:text-gray-300 border-t border-slate-200 dark:border-gray-700 pt-2">
                      🇬🇧 {v.englishTranslation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Floating Selection Dissect Drawer */}
      <SelectionPanel
        selection={selectedText}
        explanation={explanation}
        loading={explaining}
        error={explainError}
        onClose={() => setSelectedText(null)}
        currentLevel={currentLevel}
      />

    </div>
  );
}
