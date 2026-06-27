import { Article, CEFRLevel, ExplanationResult, QuizQuestion } from "../types";

export interface FetchNewsResponse {
  success: boolean;
  articles: Article[];
  cached?: boolean;
  cachedAt?: number;
}

export async function fetchNewsArticles(
  category: string,
  level: CEFRLevel,
  forceRefresh = false
): Promise<FetchNewsResponse> {
  const query = new URLSearchParams({
    category: category === "Top Stories" ? "General" : category,
    level,
    refresh: forceRefresh ? "true" : "false",
  });

  const response = await fetch(`/api/news?${query.toString()}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load French news.");
  }

  return response.json();
}

export async function generateCustomTopic(
  topic: string,
  level: CEFRLevel
): Promise<Article> {
  const response = await fetch("/api/generate-topic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, level }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate custom reading topic.");
  }

  const data = await response.json();
  return data.article;
}

export async function explainSelection(
  selection: string,
  fullText: string,
  level: CEFRLevel
): Promise<ExplanationResult> {
  const response = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selection, fullText, level }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to explain French selection.");
  }

  const data = await response.json();
  return data.explanation;
}

export async function generateArticleQuiz(
  articleTitle: string,
  articleText: string,
  level: CEFRLevel
): Promise<QuizQuestion[]> {
  const response = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleTitle, articleText, level }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate comprehension quiz.");
  }

  const data = await response.json();
  return data.quiz;
}
