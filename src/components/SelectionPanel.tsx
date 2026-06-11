import { Newspaper, MessageSquare, BookOpen, Scroll, Music } from "lucide-react";
import { ContentCategory } from "../types";

interface SelectionPanelProps {
  selectedCategory: ContentCategory;
  setSelectedCategory: (category: ContentCategory) => void;
  isGenerating: boolean;
  onGenerate: () => void;
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
  onGenerate
}: SelectionPanelProps) {
  return (
    <div id="selection-panel-container" className="space-y-5 bg-[#121212] rounded-2xl border border-[#222222] p-4 shadow-sm">
      
      {/* Category Grid */}
      <div className="space-y-2.5">
        <label className="block text-gray-400 font-bold text-[10px] uppercase tracking-widest font-mono">
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
                    : "border-[#222222] bg-[#0c0c0c] hover:border-[#333333]"
                } ${isGenerating ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className={`p-2 rounded-lg mb-1.5 ${cat.color} transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold text-white">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate trigger */}
      <button
        id="generate-content-btn"
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-white hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all gap-2"
      >
        {isGenerating ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            <span>Gemini prépare votre cours...</span>
          </>
        ) : (
          <span>Générer le contenu avec l'IA 💡</span>
        )}
      </button>
    </div>
  );
}
