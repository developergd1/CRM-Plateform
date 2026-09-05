import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const GrowthIndiaLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const iconHeight = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Dynamic SVG Icon matching Growth India Branding */}
      <div className="flex items-center">
        <svg
          height={iconHeight}
          viewBox="0 0 160 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* Ascending Chart Bars */}
          <rect x="10" y="75" width="12" height="20" rx="3" fill="#F5A623" />
          <rect x="26" y="62" width="12" height="33" rx="3" fill="#E69D00" />
          <rect x="42" y="48" width="12" height="47" rx="3" fill="#0E8388" />
          <rect x="58" y="34" width="12" height="61" rx="3" fill="#0B666A" />

          {/* Growth Rocket Arrow Curve */}
          <path
            d="M 12 78 Q 45 65 75 25"
            stroke="#0E8388"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <polygon points="75,15 88,28 65,32" fill="#0E8388" />

          {/* Superhero / Leader Silhouette launching */}
          <circle cx="50" cy="22" r="7" fill="#0F172A" />
          <path
            d="M 38 32 L 62 18 L 68 28 L 52 38 L 46 48 L 40 44 Z"
            fill="#0F172A"
          />
          {/* Orange Cape */}
          <path d="M 40 32 L 20 25 L 28 38 Z" fill="#F5A623" />

          {/* Vertical Separator Stripe */}
          <line x1="88" y1="12" x2="88" y2="88" stroke="#E63946" strokeWidth="4" strokeLinecap="round" />

          {/* 'G' / Person Emblem */}
          <path
            d="M 130 20 C 105 20 95 38 95 54 C 95 72 108 86 130 86 C 145 86 154 78 156 68 L 130 68 L 130 52 L 156 52 C 156 32 145 20 130 20 Z"
            fill="#F5A623"
          />
          {/* Inner Teal Silhouette */}
          <path
            d="M 112 55 C 112 70 120 78 132 78 C 140 78 146 72 148 64 L 128 64 C 122 64 118 60 118 55 Z"
            fill="#0E8388"
          />
          <circle cx="128" cy="34" r="5" fill="#F5A623" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="font-extrabold tracking-tight text-xl leading-none text-growth-goldDark">
              Growth
            </span>
            <span className="font-black tracking-tight text-xl leading-none text-growth-teal ml-1.5">
              India
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold mt-0.5">
            Enterprise CRM & HRMS
          </span>
        </div>
      )}
    </div>
  );
};
