'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-xl', gap: 'gap-2' },
    md: { icon: 'w-10 h-10', text: 'text-2xl', gap: 'gap-3' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', gap: 'gap-3' },
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={`flex items-center ${gap}`}>
      <div className={`${icon} relative`}>
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <defs>
            <linearGradient id="paperScoutGradient" x1="6" y1="4" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop stopColor="#16a34a" />
              <stop offset="1" stopColor="#065f46" />
            </linearGradient>
            <filter id="paperScoutShadow" x="0" y="0" width="44" height="44" colorInterpolationFilters="sRGB">
              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#064e3b" floodOpacity="0.18" />
            </filter>
          </defs>
          <rect x="3" y="3" width="38" height="38" rx="13" fill="url(#paperScoutGradient)" filter="url(#paperScoutShadow)" />
          <path d="M14 10.5h12.5L32 16v17.5H14V10.5Z" fill="#ecfdf5" />
          <path d="M26.5 10.5V16H32" fill="#bbf7d0" />
          <path d="M18 19h10M18 23h7M18 27h5" stroke="#047857" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="27.5" cy="27.5" r="5.2" fill="#052e16" stroke="#bbf7d0" strokeWidth="2" />
          <path d="m31.2 31.2 4.1 4.1" stroke="#bbf7d0" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline">
          <span className={`${text} font-black tracking-tight text-gray-950`}>Paper</span>
          <span className={`${text} font-black tracking-tight text-emerald-700`}>Scout</span>
        </div>
      )}
    </div>
  );
}
