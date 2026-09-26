import React from 'react';
import { 
  Utensils, 
  Beef, 
  CupSoda, 
  Cake, 
  Sparkles, 
  Flame, 
  Coffee, 
  Wine, 
  Pizza, 
  Sandwich 
} from 'lucide-react';

const iconMap = {
  utensils: Utensils,
  beef: Beef,
  'cup-soda': CupSoda,
  cake: Cake,
  flame: Flame,
  coffee: Coffee,
  wine: Wine,
  pizza: Pizza,
  sandwich: Sandwich,
  sparkles: Sparkles,
};

export default function CategoryTabs({ categories = [], selectedCategory, onSelectCategory, productsCountByCat = {} }) {
  const totalProducts = Object.values(productsCountByCat).reduce((a, b) => a + b, 0);

  const renderIcon = (iconName, className = "w-4 h-4") => {
    const IconComponent = iconMap[iconName?.toLowerCase()] || Utensils;
    return <IconComponent className={className} />;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none select-none -mx-2 px-2 sm:mx-0 sm:px-0">
      {/* Botão "Todos" */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`flex items-center gap-2 h-11 sm:h-12 px-4 rounded-2xl font-black text-sm sm:text-base whitespace-nowrap transition-all duration-200 shadow-md shrink-0 active:scale-95 ${
          selectedCategory === null
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-2 border-emerald-400/60 shadow-emerald-950/60'
            : 'bg-slate-800/95 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80'
        }`}
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>Todos</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
          selectedCategory === null ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-900 text-slate-400'
        }`}>
          {totalProducts}
        </span>
      </button>

      {/* Botões das Categorias */}
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const count = productsCountByCat[cat.id] || 0;
        const isCombo = cat.nome.toLowerCase() === 'combos';

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 h-11 sm:h-12 px-4 rounded-2xl font-black text-sm sm:text-base whitespace-nowrap transition-all duration-200 shadow-md shrink-0 active:scale-95 ${
              isSelected
                ? isCombo
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white border-2 border-purple-400/70 shadow-purple-950/80'
                  : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-2 border-amber-400/60 shadow-amber-950/80'
                : isCombo
                  ? 'bg-purple-950/60 text-purple-200 hover:bg-purple-900/80 hover:text-white border border-purple-500/50 shadow-sm'
                  : 'bg-slate-800/95 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80'
            }`}
          >
            {isCombo ? (
              <span className="text-base sm:text-lg">🎁</span>
            ) : (
              renderIcon(cat.icone, isSelected ? 'w-4 h-4 sm:w-5 sm:h-5 text-white' : 'w-4 h-4 sm:w-5 sm:h-5 text-amber-400')
            )}
            <span>{isCombo ? 'Combos' : cat.nome}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
              isSelected 
                ? isCombo ? 'bg-purple-950 text-purple-200' : 'bg-amber-950 text-amber-200'
                : isCombo ? 'bg-purple-900/80 text-purple-300' : 'bg-slate-900 text-slate-400'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
