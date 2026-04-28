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
      {/* Logo Mark - Abstract paper/drive icon */}
      <div className={`${icon} relative`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#logoGradient)" />
          
          {/* Paper sheets effect */}
          <rect x="10" y="8" width="18" height="24" rx="2" fill="white" fillOpacity="0.9" />
          <rect x="12" y="6" width="18" height="24" rx="2" fill="white" fillOpacity="0.7" />
          <rect x="14" y="4" width="18" height="24" rx="2" fill="white" fillOpacity="0.5" />
          
          {/* Text lines on paper */}
          <rect x="13" y="12" width="12" height="2" rx="1" fill="#6366f1" fillOpacity="0.6" />
          <rect x="13" y="17" width="10" height="2" rx="1" fill="#6366f1" fillOpacity="0.4" />
          <rect x="13" y="22" width="8" height="2" rx="1" fill="#6366f1" fillOpacity="0.3" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-baseline">
          <span className={`${text} font-bold text-gray-900 tracking-tight`}>
            Paper
          </span>
          <span className={`${text} font-bold text-indigo-600 tracking-tight`}>
            Drive
          </span>
        </div>
      )}
    </div>
  );
}
