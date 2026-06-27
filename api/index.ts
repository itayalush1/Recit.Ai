import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

// Lazy-initialized Gemini Client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in your Vercel Environment variables.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
        }
      }
    });
  }
  return aiInstance;
}

// Helper: Call Gemini with automatic retry and exponential backoff for momentary demand spikes (503 / 429)
async function callGeminiWithRetry(ai: GoogleGenAI, modelName: string, params: any, maxRetries = 2): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent({ model: modelName, ...params });
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.code || 0;
      const msg = String(err?.message || err);
      // Retry if model temporarily unavailable (503) or rate limited (429)
      if (status === 503 || status === 429 || msg.includes("503") || msg.includes("429") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(1.5, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastErr;
}

// API Route: Generate learning material
app.post("/api/generate-content", async (req, res) => {
  const { category, level } = req.body;

  if (!category || !level) {
    res.status(400).json({ error: "Missing category or proficiency level." });
    return;
  }

  try {
    const ai = getGeminiClient();
    const isNews = category === "Latest News";
 
    // Build focused prompts based on category & proficiency level
    let promptText = "";
    let newsContext = "";

    if (isNews) {
      const currentDateString = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      try {
        console.log("[Vercel Serverless] Using Google Search Grounding to fetch live, factual news reports from the past week...");
        const searchParams = `Summarize the top 6 to 8 major specific global news events (with massive focus on international relations, geopolitics, world leaders, specific summits, agreements, and key milestones in climate/economics/tech) that happened during the week leading up to ${currentDateString}. Ensure you include specific names of current world leaders (such as Donald Trump, Keir Starmer, Emmanuel Macron, Xi Jinping, Narendra Modi, Friedrich Merz, etc.), exact locations, summits, and direct quotes or numbers.`;
        
        let searchResp: any = null;
        try {
          searchResp = await callGeminiWithRetry(ai, "gemini-3.5-flash", {
            contents: searchParams,
            config: {
              tools: [{ googleSearch: {} }]
            }
          }, 2);
        } catch (flashErr) {
          console.log("[Vercel Serverless] Notice: gemini-3.5-flash busy for search, retrying with gemini-flash-latest...");
          searchResp = await callGeminiWithRetry(ai, "gemini-flash-latest", {
            contents: searchParams,
            config: {
              tools: [{ googleSearch: {} }]
            }
          }, 1);
        }

        if (searchResp && searchResp.text) {
          newsContext = searchResp.text;
          console.log("[Vercel Serverless] Google Search context retrieved successfully.");
        }
      } catch (err: any) {
        console.log("[Vercel Serverless] Notice: Live Google Search grounding momentarily busy. Seamlessly utilizing standard model knowledge.");
      }

      promptText = `Generate an extremely detailed, comprehensive, high-density international news report summarizing the major global events of the past week (the week leading up to ${currentDateString}).
      This report must NOT be restricted to a single topic; instead, it is a multi-subject synthesis with a major, dominant focus on international politics, geopolitics (relations internationales, alliances, conflits, sommets diplomatiques), followed by other vital developments in global economics, science/technology, and environmental issues.
      
      IMPORTANT CHRONOLOGICAL REALITY CHECK (YEAR 2026):
      All news MUST accurately reflect the reality of the date ${currentDateString}. 
      To make the news truly immersive and informative, you MUST discuss specific current world leaders, refer to precise policies, or developments. AVOID generalities like "world leaders met to discuss issues"; instead tell the learner exactly WHO, WHERE, WHAT, and WHY, with rich details.
      
      Structure the report into distinct subject areas. The total list of 'items' must contain exactly 5 to 8 rich, multi-sentence paragraphs (each at least 3-5 sentences long to provide a thorough journalistic summary).
      For each item in the 'items' array, you MUST populate:
      1. 'topic': A short, clear category name (e.g., "GÉOPOLITIQUE INTERNATIONALE", "ÉCONOMIE MONDIALE", "SCIENCE & INNOVATION", "CLIMAT & ENVIRONNEMENT"). This topic MUST be placed ONLY in the 'topic' field. Do NOT include brackets like [GÉOPOLITIQUE] inside the 'french' or 'english' text itself.
      2. 'french': The detailed news paragraph in French at the requested level.
      3. 'english': The highly polished English translation of the news paragraph.
      
      Adapt the French grammatical complexity and vocabulary strictly to a "${level}" proficiency level to help the user learn French and stay on top of world affairs:
      - Beginner (A1/A2): Use active voice, simple tenses (présent, occasionally passé composé), clear/active subject-verb-object structures, and accessible common vocabulary. Do NOT omit named leaders or specific countries, but explain their actions simply.
      - Intermediate (B1/B2): Introduce compound structures, standard press vocabulary, varied tenses (futur simple, imparfait, conditionnel), and idiomatic French of moderate complexity.
      - Advanced (C1/C2): Provide authentic, elegant, premium journalistic level French (resembling Le Monde or Libération). Use complex syntax (passif, subjonctif, participe présent, terms of diplomacy and geopolitics).
      
      In the 'metadata' field, specify "Synthèse Géopolitique & Actualités Globales" and the date range leading up to ${currentDateString}.
      In the 'sources' field of the JSON output, you MUST list 2 to 4 real high-quality news publication domains or outlets from which these events are sourced (e.g., ["Le Monde", "France 24", "Le Figaro", "Reuters", "AFP"]) based on the provided grounded search context.`;

      if (newsContext) {
        promptText = `You are provided with real-time Google Search context summarizing the real, factual world events of the past week:
        
        === SEARCH REALITY CONTEXT ===
        ${newsContext}
        ==============================
        
        Using the above search-grounded facts as your sole news source and reference material, translate, elaborate, and construct the requested French learning content according to these exact instructions:
        
        ` + promptText;
      }
    } else if (category === "Conversation") {
      promptText = `Create a realistic conversation/dialogue in French between 2 characters.
      Aesthetic: Practical everyday situations (ordering food, asking for directions, planning a trip, workspace dynamic).
      Tailor the vocabulary, tenses, and speed strictly for a "${level}" level learner.
      Important: Under the 'items' list, you can provide up to 8 dialog items. Each item must specify which speaker is talking in the 'speaker' property.`;
    } else if (category === "Short Story") {
      promptText = `Write an engaging short story in French.
      Aesthetic: A captivating narrative (mystery, heartwarming interaction, local legend, or sci-fi snippet).
      Tailor the vocabulary, grammatical structures, and complexity precisely for "${level}" proficiency level.
      Split the story into cohesive paragraphs, and provide the paragraph-level English translations in the 'items' list.`;
    } else if (category === "Poem") {
      promptText = `Create a beautiful poem in French (either a classic by a famous French poet tailored for this level, or an original modern creation).
      Aesthetic: Atmospheric, rhythmic, and poetic.
      Tailor the linguistic sophistication precisely for the "${level}" proficiency level.
      In 'metadata', provide the author name (or state "Original AI Poem" if newly created).
      Provide line-by-line or stanza-by-stanza translations in the 'items' list.`;
    } else if (category === "Famous song") {
      promptText = `Provide the lyrics to a famous, culturally significant French song (e.g., songs by Édith Piaf, Jacques Brel, Stromae, Serge Gainsbourg, Céline Dion, Daft Punk/French Touch, or modern hits).
      Aesthetic: Melodic, nostalgic, or energetic; culturally authentic.
      Adapt or select lyrics/verses that are readable and beneficial for a French learner at "${level}" proficiency level.
      In 'metadata', specify the artist and peak year.
      Provide the song verses in the 'items' list along with line-by-line English translations.
      Include a learning tip or brief note explaining the song's cultural context block in the 'explanation' field.`;
    } else {
      promptText = `Generate custom educational materials in French for the category "${category}" targeting a "${level}" proficiency level.`;
    }

    const systemInstruction = `You are an expert bilingual French-English languaging tutor.
    Your objective is to generate accurate, helpful educational content in French tailored perfectly to the learner's chosen proficiency level: "${level}".
    You must always respond in valid JSON matching the specified schema.
    Provide precise, paragraph/line-level direct English translations so the student can verify comprehension easily.
    The 'items' list should group the sentences/lines logically so they can be read segment-by-segment.`;

    const modelCandidates = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`[Vercel Serverless] Attempting generation with model: ${modelName}`);
        const response = await callGeminiWithRetry(ai, modelName, {
          contents: promptText,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The title of the piece in French." },
                titleTranslation: { type: Type.STRING, description: "The English translation of the title." },
                metadata: { type: Type.STRING, description: "Artist name, author, news outlet, or historical context identifier." },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      french: { type: Type.STRING, description: "The sentence/paragraph or lyric line in French." },
                      english: { type: Type.STRING, description: "English translation of this segment." },
                      speaker: { type: Type.STRING, description: "Optional speaker name for conversations (e.g. Sophie, Jean). Otherwise omit or leave dry." },
                      topic: { type: Type.STRING, description: "Optional category/subject tag name, used primarily for Latest News to group developments (e.g. GÉOPOLITIQUE INTERNATIONALE, ÉCONOMIE MONDIALE, SCIENCE, CLIMAT)" }
                    },
                    required: ["french", "english"]
                  }
                },
                explanation: { type: Type.STRING, description: "A learning note or cultural tip in English." },
                keyVocabulary: {
                  type: Type.ARRAY,
                  description: "A list of 4 to 6 essential or interesting French vocabulary words from the text.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: { type: Type.STRING, description: "The French word or short expression (exactly as written in the text, clean, singular/infinitive or as parsed)." },
                      translation: { type: Type.STRING, description: "English translation of this word." }
                    },
                    required: ["word", "translation"]
                  }
                },
                sources: {
                  type: Type.ARRAY,
                  description: "Optional list of real news sources, agencies, or publication names related to this event summary.",
                  items: { type: Type.STRING }
                }
              },
              required: ["title", "titleTranslation", "items", "explanation", "keyVocabulary"]
            }
          }
        }, 1);

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.log(`[Vercel Serverless] Notice: Candidate model ${modelName} momentarily busy. Switching to backup model candidate.`);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Les serveurs IA sont temporairement très sollicités. Veuillez réessayer dans quelques instants.");
    }

    const parsedData = JSON.parse(responseText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.log("[Vercel Serverless] Notice: Content generation request deferred due to demand spike.");
    res.status(503).json({ error: "Le modèle IA connaît actuellement un pic de demande. Veuillez patienter 3 secondes puis cliquer à nouveau sur Générer." });
  }
});

// API Route: Analyze individual clicked word using simple Google Translate lookup
app.post("/api/word-context", async (req, res) => {
  const { word, sentence } = req.body;

  if (!word) {
    res.status(400).json({ error: "Missing word to translate." });
    return;
  }

  try {
    const cleanWord = word.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, "");

    // Query Google Translate Translation API (free gtx client) for the individual word
    const wordUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(cleanWord)}`;
    const wordResp = await fetch(wordUrl);
    const wordData = await wordResp.json() as any;
    const translation = wordData?.[0]?.[0]?.[0] || cleanWord;

    // Optional query for the whole context sentence translation
    let sentenceTranslation = "";
    if (sentence) {
      try {
        const sentenceUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(sentence)}`;
        const sentenceResp = await fetch(sentenceUrl);
        const sentenceData = await sentenceResp.json() as any;
        sentenceTranslation = sentenceData?.[0]?.[0]?.[0] || "";
      } catch (err) {
        console.warn("[Vercel Serverless] Context sentence translation failed, proceeding with word only.");
      }
    }

    res.json({
      word: cleanWord,
      translation: translation,
      pronunciation: `[ ${cleanWord} ]`,
      grammaticalContext: "Mot vocabulaire",
      frenchExample: sentence || cleanWord,
      englishExample: sentenceTranslation || "Context translation"
    });
  } catch (error: any) {
    console.error("[Vercel Serverless] Word context translation error:", error);
    res.status(500).json({ error: "Service de traduction indisponible. Veuillez réessayer." });
  }
});

// Wildcard routing to handle fallbacks if any other endpoint is requested under /api
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route ${req.path} not found.` });
});

export default app;
