import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-40'
  };

  const textSizes = {
    sm: { brand: 'text-sm', tagline: 'text-xs' },
    md: { brand: 'text-lg', tagline: 'text-sm' },
    lg: { brand: 'text-xl', tagline: 'text-base' }
  };

  return (
    <div className={`flex flex-col items-center ${sizeClasses[size]} ${className}`}>
      {/* Cow Icon */}
      <svg 
        viewBox="0 0 80 80" 
        className="w-16 h-16 mb-2"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circular background with cow design */}
        <circle cx="40" cy="40" r="38" stroke="#000" strokeWidth="2" fill="none"/>
        
        {/* Cow's head and body */}
        <path 
          d="M25 35 Q20 30 25 25 Q30 20 35 25 Q40 20 45 25 Q50 20 55 25 Q60 30 55 35 Q50 40 45 35 Q40 40 35 35 Q30 40 25 35 Z" 
          fill="#000"
        />
        
        {/* Cow's left horn */}
        <path 
          d="M30 20 Q25 15 30 10 Q35 15 30 20" 
          fill="#000"
        />
        
        {/* Cow's right horn */}
        <path 
          d="M50 20 Q55 15 50 10 Q45 15 50 20" 
          fill="#000"
        />
        
        {/* Cow's left ear */}
        <ellipse cx="28" cy="22" rx="3" ry="4" fill="#000"/>
        
        {/* Cow's right ear */}
        <ellipse cx="52" cy="22" rx="3" ry="4" fill="#000"/>
        
        {/* Cow's face patches */}
        <circle cx="35" cy="30" r="2" fill="white"/>
        <circle cx="45" cy="30" r="2" fill="white"/>
        
        {/* Decorative swirl on right side */}
        <path 
          d="M55 35 Q60 40 58 45 Q56 50 52 48 Q48 46 50 42 Q52 38 55 35" 
          fill="#000"
        />
        
        {/* Body curve integration */}
        <path 
          d="M25 35 Q20 45 25 55 Q30 60 35 55 Q40 60 45 55 Q50 60 55 55 Q60 45 55 35" 
          fill="#000"
        />
      </svg>
      
      {/* Brand Name */}
      <h1 className={`font-bold text-gray-900 ${textSizes[size].brand} mb-1`}>
        Govupalu
      </h1>
      
      {/* Tagline */}
      {showTagline && (
        <p className={`font-medium text-green-600 ${textSizes[size].tagline}`}>
          FRESH MILK
        </p>
      )}
    </div>
  );
};

export default Logo; 