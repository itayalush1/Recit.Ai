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
    if (isNews) {
      const currentDateString = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      promptText = `Focus on generating a comprehensive international news summary of real or realistic events of the past week (the week leading up to ${currentDateString}) in exactly ONE of the following topics: Sports, Politics (French or world), Economics, or Science.
      You must select EXACTLY ONE topic dynamically from these four (Sports, Politics, Economics, Science) and write a highly relevant, deeply informative, and realistic report.
      The article MUST be highly detailed and of a satisfying length (at least 4 to 6 full informative paragraphs in the 'items' list, just like the 'Short Story' section has rich paragraph-level blocks; do NOT make it a short bullet list or single short statement). 
      It should read exactly like a premium, in-depth weekly summary, news column, or reporter's dispatch from high-quality international French media outlets (such as Le Monde, France 24, TV5Monde, Libération, or Le Figaro/L'Équipe/Sciences et Avenir).
      Adapt and simplify the grammatical complexity precisely for a French language learner with a "${level}" proficiency level (A1/A2 simple sentences with present/simple vocabulary for Beginner, B1/B2 moderate complexity for Intermediate, and authentic journalistic French for Advanced).
      In the 'metadata' field, specify the Chosen Topic (e.g., "Politics", "Science", "Economics", "Sports"), the sourced outlet, and the precise publication date (which must be close to ${currentDateString}).
      Ensure each item in the 'items' list represents a full detailed paragraph with its translation, so the learner gets an immersive reading experience.`;
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

    const modelCandidates = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`[Vercel Serverless] Attempting generation with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
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
                      speaker: { type: Type.STRING, description: "Optional speaker name for conversations (e.g. Sophie, Jean). Otherwise omit or leave dry." }
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
                }
              },
              required: ["title", "titleTranslation", "items", "explanation", "keyVocabulary"]
            }
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[Vercel Serverless] Model ${modelName} failed:`, err.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("All candidate text models failed of high-demand / overload.");
    }

    const parsedData = JSON.parse(responseText || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("[Vercel Serverless] Content generation error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating French learning materials with Gemini." });
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
