import React from 'react';

export function BrandEmblem({ size = 44, className = "" }) {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 rounded-2xl blur-md"></div>

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
      >
        <defs>
          {/* Ouro Gradiente */}
          <linearGradient id="goldLinear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>

          {/* Verde Agro Gradiente */}
          <linearGradient id="agroGreenLinear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3E30" />
            <stop offset="50%" stopColor="#0F241A" />
            <stop offset="100%" stopColor="#06120D" />
          </linearGradient>

          {/* Brilho Suave */}
          <radialGradient id="radialGlow" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base: Escudo / Squircle arredondado */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="url(#agroGreenLinear)"
          stroke="url(#goldLinear)"
          strokeWidth="2.5"
        />

        {/* Anel interno fino */}
        <rect
          x="9"
          y="9"
          width="82"
          height="82"
          rx="19"
          fill="url(#radialGlow)"
          stroke="#D97706"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 2"
        />

        {/* Ícone Central: Tenda Agropecuária com Estrela & Ramos de Trigo */}
        
        {/* Tenda / Pavilhão da Feira */}
        <path
          d="M50 20 L28 42 L34 42 L50 26 L66 42 L72 42 Z"
          fill="url(#goldLinear)"
        />
        <path
          d="M32 44 L32 74 L42 74 L42 56 L58 56 L58 74 L68 74 L68 44 Z"
          fill="url(#goldLinear)"
          fillOpacity="0.9"
        />
        
        {/* Espigas de Trigo Laterais Estilizadas */}
        {/* Lado Esquerdo */}
        <path
          d="M20 54 Q16 48 22 44 Q24 50 20 54 Z"
          fill="url(#goldLinear)"
        />
        <path
          d="M18 64 Q14 58 20 54 Q22 60 18 64 Z"
          fill="url(#goldLinear)"
        />
        
        {/* Lado Direito */}
        <path
          d="M80 54 Q84 48 78 44 Q76 50 80 54 Z"
          fill="url(#goldLinear)"
        />
        <path
          d="M82 64 Q86 58 80 54 Q78 60 82 64 Z"
          fill="url(#goldLinear)"
        />

        {/* Estrela Superior / Expo */}
        <polygon
          points="50,15 52,19 56,19 53,22 54,26 50,23 46,26 47,22 44,19 48,19"
          fill="#FEF3C7"
        />

        {/* Letra M estilizada no centro da tenda */}
        <text
          x="50"
          y="70"
          textAnchor="middle"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#FEF3C7"
          letterSpacing="1"
        >
          M
        </text>
      </svg>
    </div>
  );
}

export default function Logo({ boothName = "Tenda dos Müller", subtitle = "EXPOBAI 2026", size = 46 }) {
  return (
    <div className="flex items-center gap-3">
      {/* Emblema Gráfico */}
      <BrandEmblem size={size} />

      {/* Tipografia da Marca */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase drop-shadow-sm">
            {boothName}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-sm">
            PDV
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <span className="text-emerald-400 font-semibold">{subtitle}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Frente de Caixa</span>
        </div>
      </div>
    </div>
  );
}
