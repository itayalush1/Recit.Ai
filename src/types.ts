export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type NewsCategory =
  | "Top Stories"
  | "Tech & AI"
  | "Culture & Art"
  | "Science"
  | "France Politics"
  | "Sports"
  | "Business";

export interface VocabItem {
  id?: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  englishTranslation: string;
  example?: string;
  cefrLevel?: CEFRLevel | string;
  savedAt?: number;
  box?: number;
  nextReviewDate?: number;
}

export type Flashcard = VocabItem;

export interface GrammarPoint {
  title: string;
  explanation: string;
  exampleFromText: string;
}

export interface SourceCitation {
  title: string;
  uri: string;
}

export interface Article {
  id: string;
  title: string;
  titleEnglish: string;
  summary: string;
  category: string;
  cefrLevel: CEFRLevel;
  publishedDate: string;
  readTimeMinutes: number;
  keyVocabulary: VocabItem[];
  grammarPoint?: GrammarPoint;
  culturalFact?: string;
  sources?: SourceCitation[];
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExplanationResult {
  selection: string;
  literalTranslation: string;
  naturalEnglish: string;
  grammarBreakdown: string;
  usageNotes: string;
  pronunciationTip: string;
}

export type ActiveTab = "news" | "reader" | "vault" | "quiz" | "custom";
