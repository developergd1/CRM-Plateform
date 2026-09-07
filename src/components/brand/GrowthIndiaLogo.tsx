import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const GrowthIndiaLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const heightClass =
    size === 'sm'
      ? 'h-9 max-h-9'
      : size === 'lg'
      ? 'h-14 max-h-14'
      : size === 'xl'
      ? 'h-16 max-h-16'
      : 'h-11 max-h-11';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Growth India"
        className={`${heightClass} w-auto object-contain drop-shadow-sm transition-transform duration-200 hover:scale-[1.02]`}
      />
    </div>
  );
};
