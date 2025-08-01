import React from 'react';
import { Sun, Moon, Calendar } from 'lucide-react';

export type TimeFilterType = 'all' | 'morning' | 'evening';

interface TimeFilterProps {
  value: TimeFilterType;
  onChange: (value: TimeFilterType) => void;
  className?: string;
}

const TimeFilter: React.FC<TimeFilterProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Calendar className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600 mr-2">Filter by time:</span>
      
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onChange('all')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === 'all'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Day
        </button>
        <button
          onClick={() => onChange('morning')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
            value === 'morning'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sun className="w-3 h-3" />
          <span>Morning</span>
        </button>
        <button
          onClick={() => onChange('evening')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center space-x-1 ${
            value === 'evening'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Moon className="w-3 h-3" />
          <span>Evening</span>
        </button>
      </div>
    </div>
  );
};

export default TimeFilter; 