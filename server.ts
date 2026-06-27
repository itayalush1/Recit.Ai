import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google Gen AI SDK
const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- BACKEND IN-MEMORY CACHE FOR INSTANT NEWS LOADING ---
interface CacheEntry {
  data: any;
  timestamp: number;
}
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes cache
const newsCache = new Map<string, CacheEntry>();

// Helper to clean JSON string from markdown fences
function cleanJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

// 1. GET /api/news - Fact-checked news with CEFR grading & Google Search Grounding
app.get("/api/news", async (req, res) => {
  try {
    const category = (req.query.category as string) || "General";
    const level = (req.query.level as string) || "B1";
    const refresh = req.query.refresh === "true";

    const cacheKey = `${category}_${level}`;
    const now = Date.now();

    // Return cached news if fresh and refresh is not forced
    if (!refresh && newsCache.has(cacheKey)) {
      const cached = newsCache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return res.json({
          success: true,
          articles: cached.data,
          cached: true,
          cachedAt: cached.timestamp
        });
      }
    }

    const ai = getAIClient();

    const prompt = `You are an expert French language tutor and professional news editor.
Your task is to find 4 recent, real-world news events from the past few days related to the category: "${category}" (if General, cover major world/French events).
Summarize each event in FRENCH tailored strictly for a student at the ${level} CEFR level.

CEFR Level guidelines:
- A1: Very short sentences, basic vocabulary (présent de l'indicatif), everyday high-frequency words.
- A2: Simple compound sentences, passé composé/futur proche, common idioms.
- B1: Clear standard French, imparfait/passé composé distinctions, relative pronouns, expressing opinions.
- B2: Complex syntax, subjonctif, nuanced journalistic vocabulary, political/economic terms.
- C1/C2: Native-level journalistic prose, sophisticated idioms, subtle cultural references, advanced grammar structures.

You MUST use Google Search Grounding to ensure all events are factual and recent.

CRITICAL: Respond ONLY with a valid JSON array matching this exact structure (no commentary outside the JSON array):
[
  {
    "id": "unique-string-id-1",
    "title": "Headline in French graded for ${level}",
    "titleEnglish": "English translation of headline",
    "summary": "3 to 4 well-structured paragraphs in French discussing the news event at ${level} difficulty.",
    "category": "${category}",
    "cefrLevel": "${level}",
    "publishedDate": "e.g. Aujourd'hui or Hier",
    "readTimeMinutes": 3,
    "keyVocabulary": [
      {
        "word": "French word/phrase in article",
        "partOfSpeech": "nom m / verbe / adj",
        "definition": "Simple definition in French",
        "englishTranslation": "English translation"
      }
    ],
    "grammarPoint": {
      "title": "Grammar concept used in text (e.g. Le Subjonctif)",
      "explanation": "Brief explanation in English or French appropriate for ${level}",
      "exampleFromText": "Exact quote from summary demonstrating it"
    },
    "culturalFact": "One fascinating cultural or contextual insight related to this story."
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = response.text || "[]";
    const cleaned = cleanJson(rawText);
    let articles = [];

    try {
      articles = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse error for news:", parseErr, "\nRaw:", rawText);
      // Fallback recovery if model generated markdown before JSON
      const match = rawText.match(/\[\s*\{.*\}\s*\]/s);
      if (match) {
        articles = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse AI news response into JSON.");
      }
    }

    // Extract grounding web search URLs if available
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = searchChunks
      .map((c: any) => c.web?.uri ? { title: c.web.title || "Source", uri: c.web.uri } : null)
      .filter(Boolean);

    // Attach grounding sources to articles
    articles = articles.map((art: any, index: number) => ({
      ...art,
      sources: webSources.slice(index * 2, (index + 1) * 2).length > 0
        ? webSources.slice(index * 2, (index + 1) * 2)
        : webSources.slice(0, 2)
    }));

    // Save to cache
    newsCache.set(cacheKey, {
      data: articles,
      timestamp: now
    });

    res.json({
      success: true,
      articles,
      cached: false,
      cachedAt: now
    });

  } catch (error: any) {
    console.error("Error generating news:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch news."
    });
  }
});

// 2. POST /api/generate-topic - Generate custom reading material on any interest
app.post("/api/generate-topic", async (req, res) => {
  try {
    const { topic, level } = req.body;
    if (!topic || !level) {
      return res.status(400).json({ error: "Topic and CEFR level are required." });
    }

    const ai = getAIClient();
    const prompt = `Generate an engaging French article about "${topic}" tailored strictly for a French learner at CEFR level ${level}.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "id": "custom-" + Date.now(),
  "title": "Engaging title in French",
  "titleEnglish": "English translation",
  "summary": "4 paragraphs of French text about ${topic} at ${level} difficulty.",
  "category": "Custom Topic",
  "cefrLevel": "${level}",
  "publishedDate": "Sur mesure",
  "readTimeMinutes": 4,
  "keyVocabulary": [
    {
      "word": "French word",
      "partOfSpeech": "nom / verbe / adj",
      "definition": "French definition",
      "englishTranslation": "English equivalent"
    }
  ],
  "grammarPoint": {
    "title": "Grammar highlight",
    "explanation": "Brief explanation",
    "exampleFromText": "Quote from text"
  },
  "culturalFact": "An interesting trivia related to ${topic} in France or French culture."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.5 }
    });

    const parsed = JSON.parse(cleanJson(response.text || "{}"));
    res.json({ success: true, article: parsed });
  } catch (err: any) {
    console.error("Error generating custom topic:", err);
    res.status(500).json({ error: err.message || "Failed to generate topic." });
  }
});

// 3. POST /api/explain - Dissect selected sentence or word
app.post("/api/explain", async (req, res) => {
  try {
    const { selection, fullText, level } = req.body;
    if (!selection) {
      return res.status(400).json({ error: "Selection is required." });
    }

    const ai = getAIClient();
    const prompt = `A student learning French at CEFR level ${level || "B1"} selected this exact phrase/sentence: "${selection}"
Context from the full article: "${fullText?.slice(0, 500) || selection}"

Explain this selection clearly in JSON format:
{
  "selection": "${selection}",
  "literalTranslation": "Exact English translation",
  "naturalEnglish": "Natural English equivalent",
  "grammarBreakdown": "Break down the grammar, verb tenses, agreements, or prepositions used.",
  "usageNotes": "When and how native French speakers use this phrase.",
  "pronunciationTip": "Phonetic hint or liaisons to watch out for."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.2 }
    });

    const parsed = JSON.parse(cleanJson(response.text || "{}"));
    res.json({ success: true, explanation: parsed });
  } catch (err: any) {
    console.error("Error explaining text:", err);
    res.status(500).json({ error: err.message || "Failed to explain selection." });
  }
});

// 4. POST /api/quiz - Generate a comprehension quiz for an article
app.post("/api/quiz", async (req, res) => {
  try {
    const { articleTitle, articleText, level } = req.body;
    if (!articleText) {
      return res.status(400).json({ error: "Article text is required." });
    }

    const ai = getAIClient();
    const prompt = `Based on this French article titled "${articleTitle}":
"${articleText}"

Create a 4-question interactive multiple choice quiz for a student at CEFR ${level || "B1"} level. Include 2 reading comprehension questions and 2 vocabulary/grammar questions.

Respond ONLY with a JSON array:
[
  {
    "id": 1,
    "question": "Question text in French",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Why this answer is correct (in English or simple French)"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3 }
    });

    const parsed = JSON.parse(cleanJson(response.text || "[]"));
    res.json({ success: true, quiz: parsed });
  } catch (err: any) {
    console.error("Error generating quiz:", err);
    res.status(500).json({ error: err.message || "Failed to generate quiz." });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Vite middleware & Static asset fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
