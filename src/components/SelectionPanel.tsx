import { Newspaper, MessageSquare, BookOpen, Scroll, Music, Square } from "lucide-react";
import { ContentCategory } from "../types";

interface SelectionPanelProps {
  selectedCategory: ContentCategory;
  setSelectedCategory: (category: ContentCategory) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onStopGenerate?: () => void;
}

const categories: { value: ContentCategory; label: string; icon: any; color: string }[] = [
  { value: "Latest News", label: "Latest News", icon: Newspaper, color: "text-[#f27d26] bg-[#f27d26]/10" },
  { value: "Conversation", label: "Conversation", icon: MessageSquare, color: "text-[#f27d26] bg-[#f27d26]/10" },
  { value: "Short Story", label: "Short Story", icon: BookOpen, color: "text-[#f27d26] bg-[#f27d26]/10" },
  { value: "Poem", label: "Poem", icon: Scroll, color: "text-[#f27d26] bg-[#f27d26]/10" },
  { value: "Famous song", label: "Famous Song", icon: Music, color: "text-[#f27d26] bg-[#f27d26]/10" },
];

export default function SelectionPanel({
  selectedCategory,
  setSelectedCategory,
  isGenerating,
  onGenerate,
  onStopGenerate
}: SelectionPanelProps) {
  return (
    <div id="selection-panel-container" className="space-y-5 bg-[#fafafa] dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#222222] p-4 shadow-sm">
      
      {/* Category Grid */}
      <div className="space-y-2.5">
        <label className="block text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest font-mono">
          Sélectionner le Genre Littéraire
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                id={`cat-btn-${cat.value.replace(/\s+/g, "-")}`}
                onClick={() => !isGenerating && setSelectedCategory(cat.value)}
                disabled={isGenerating}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-[#f27d26] bg-[#f27d26]/5 shadow-xs"
                    : "border-gray-200 dark:border-[#222222] bg-white dark:bg-[#0c0c0c] hover:border-gray-300 dark:hover:border-[#333333]"
                } ${isGenerating ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className={`p-2 rounded-lg mb-1.5 ${cat.color} transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-gray-800 dark:text-white">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate / Stop triggers */}
      {isGenerating ? (
        <div className="flex gap-2 w-full">
          <div className="flex-1 flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1a1a1a] border border-gray-250 dark:border-[#2a2a2a] gap-2">
            <span className="w-3.5 h-3.5 border-2 border-gray-400/35 border-t-gray-500 dark:border-t-gray-400 rounded-full animate-spin" />
            <span>Génération...</span>
          </div>
          {onStopGenerate && (
            <button
              id="stop-generation-btn"
              onClick={onStopGenerate}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title="Arrêter la génération"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Arrêter</span>
            </button>
          )}
        </div>
      ) : (
        <button
          id="generate-content-btn"
          onClick={onGenerate}
          className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white dark:text-black bg-gray-900 hover:bg-gray-850 dark:bg-white dark:hover:bg-gray-100 transition-all gap-2 cursor-pointer"
        >
          <span>Générer le contenu avec l'IA 💡</span>
        </button>
      )}
    </div>
  );
}
