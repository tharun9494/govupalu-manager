import React from 'react';
import { Package } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} bg-primary-600 rounded-lg flex items-center justify-center`}>
        <Package className="w-1/2 h-1/2 text-white" />
      </div>
      <span className={`font-bold text-gray-900 ${
        size === 'sm' ? 'text-sm' : 
        size === 'md' ? 'text-base' : 
        'text-lg'
      }`}>
        MilkPro
      </span>
    </div>
  );
};

export default Logo; 