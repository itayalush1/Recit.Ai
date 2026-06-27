import React, { useState, useEffect } from "react";
import { Article, CEFRLevel, QuizQuestion } from "../types";
import { generateArticleQuiz } from "../services/api";
import { HelpCircle, CheckCircle2, XCircle, RefreshCw, Award, ArrowLeft, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuizViewProps {
  activeArticle: Article | null;
  onBackToArticle?: () => void;
  currentLevel: CEFRLevel;
}

export default function QuizView({ activeArticle, onBackToArticle, currentLevel }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const loadQuiz = async (article: Article) => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);

    try {
      const res = await generateArticleQuiz(article.title, article.summary, currentLevel);
      setQuestions(res || []);
    } catch (err: any) {
      setError(err.message || "Impossible de générer le quiz.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeArticle) {
      loadQuiz(activeArticle);
    }
  }, [activeArticle]);

  if (!activeArticle) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <HelpCircle className="w-16 h-16 text-indigo-400 mx-auto animate-bounce" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sélectionnez d'abord un article</h3>
        <p className="text-sm text-gray-500">
          Rendez-vous dans la rubrique Dernières Infos, ouvrez un article, puis cliquez sur "Passer le Quiz IA".
        </p>
      </div>
    );
  }

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) score++;
    });
    return score;
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          {onBackToArticle && (
            <button
              onClick={onBackToArticle}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>Quiz IA Compréhension ({currentLevel})</span>
            </h2>
            <p className="text-xs text-gray-500 truncate max-w-md font-serif italic">
              Article: "{activeArticle.title}"
            </p>
          </div>
        </div>

        <button
          onClick={() => loadQuiz(activeArticle)}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Nouveau Quiz</span>
        </button>
      </div>

      {loading && (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Génération du questionnaire de lecture...
          </p>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-3xl bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {!loading && questions.length > 0 && !submitted && (
        <div className="space-y-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-10 shadow-xs">
          
          {/* Question Index Progress */}
          <div className="flex justify-between items-center text-xs font-mono text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-4">
            <span>Question {currentIdx + 1} sur {questions.length}</span>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <span
                  key={i}
                  className={`w-6 h-1.5 rounded-full ${
                    i === currentIdx
                      ? "bg-indigo-600"
                      : selectedAnswers[questions[i].id] !== undefined
                      ? "bg-indigo-200 dark:bg-indigo-900"
                      : "bg-gray-100 dark:bg-gray-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Active Question Box */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <h3 className="text-xl sm:text-2xl font-sans font-bold text-gray-900 dark:text-white leading-relaxed">
                {currentQ.question}
              </h3>

              <div className="space-y-3">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === optIdx;

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border font-medium text-sm sm:text-base transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.01]"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <span>{opt}</span>
                      <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono ${
                        isSelected ? "border-white bg-white/20" : "border-gray-300 dark:border-gray-600 text-gray-400"
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer Controls */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="py-3 px-6 rounded-2xl bg-gray-100 dark:bg-gray-800 font-semibold text-sm disabled:opacity-40 transition-colors"
            >
              Précédent
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                disabled={selectedAnswers[currentQ.id] === undefined}
                className="py-3 px-8 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm disabled:opacity-40 shadow-md transition-all"
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(selectedAnswers).length < questions.length}
                className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm disabled:opacity-40 shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all"
              >
                Valider mes Réponses ✨
              </button>
            )}
          </div>

        </div>
      )}

      {/* SCORE RESULTS DASHBOARD */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-12 shadow-xl text-center"
        >
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-950/60 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Résultats du Quiz!</h3>
            <p className="text-lg font-serif">
              Vous avez obtenu <strong>{calculateScore()}</strong> bonne(s) réponse(s) sur <strong>{questions.length}</strong>!
            </p>
          </div>

          {/* Breakdown List */}
          <div className="space-y-4 text-left pt-6 border-t border-gray-100 dark:border-gray-800">
            {questions.map((q, idx) => {
              const studentAns = selectedAnswers[q.id];
              const isCorrect = studentAns === q.correctIndex;

              return (
                <div key={q.id} className={`p-5 rounded-2xl border space-y-2 ${
                  isCorrect ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900" : "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                }`}>
                  <div className="flex items-start gap-2.5 font-bold text-gray-900 dark:text-white text-base">
                    {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                    <span>{idx + 1}. {q.question}</span>
                  </div>

                  <p className="text-xs font-mono pl-7 text-gray-600 dark:text-gray-300">
                    Votre réponse: <strong>{q.options[studentAns]}</strong> {!isCorrect && <span className="text-emerald-700 dark:text-emerald-400 block sm:inline sm:ml-2">(Bonne réponse: {q.options[q.correctIndex]})</span>}
                  </p>

                  <p className="text-xs pl-7 text-gray-500 dark:text-gray-400 font-serif italic pt-1">
                    💡 <strong>Explication:</strong> {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-center gap-4">
            <button
              onClick={() => { setSubmitted(false); setSelectedAnswers({}); setCurrentIdx(0); }}
              className="py-3 px-6 rounded-2xl bg-gray-100 dark:bg-gray-800 font-semibold text-sm hover:bg-gray-200"
            >
              Réessayer ce quiz
            </button>
            <button
              onClick={() => loadQuiz(activeArticle)}
              className="py-3 px-8 rounded-2xl bg-indigo-600 text-white font-semibold text-sm shadow-md hover:bg-indigo-700"
            >
              Générer un autre Quiz
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
