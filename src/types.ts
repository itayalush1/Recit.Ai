export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced";

export type ContentCategory = 
  | "Latest News" 
  | "Conversation" 
  | "Short Story" 
  | "Poem" 
  | "Famous song";

export interface ContentItem {
  french: string;
  english: string;
  speaker?: string;
  topic?: string;
}

export interface GeneratedMaterial {
  title: string;
  titleTranslation: string;
  metadata?: string;
  items: ContentItem[];
  explanation: string;
  keyVocabulary?: {
    word: string;
    translation: string;
  }[];
  sources?: string[];
}

export interface WordAnalysis {
  word: string;
  translation: string;
  pronunciation: string;
  grammaticalContext: string;
  frenchExample: string;
  englishExample: string;
}

export interface Flashcard {
  id: string;
  word: string;
  translation: string;
  pronunciation: string;
  grammaticalContext: string;
  contextSentence: string;
  frenchExample: string;
  englishExample: string;
  proficiency: ProficiencyLevel;
  category: ContentCategory;
  createdAt: number;
  box: number; // For Leitner spaced repetition (1-5)
  nextReviewDate: number; // Unix timestamp
}
