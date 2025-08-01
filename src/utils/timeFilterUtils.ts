import { TimeFilterType } from '../components/TimeFilter';

// Morning hours: 6 AM to 12 PM (6:00 - 11:59)
// Evening hours: 6 PM to 12 AM (18:00 - 23:59)
// Night hours: 12 AM to 6 AM (0:00 - 5:59)

export const isMorningTime = (date: Date): boolean => {
  const hours = date.getHours();
  return hours >= 6 && hours < 12;
};

export const isEveningTime = (date: Date): boolean => {
  const hours = date.getHours();
  return hours >= 18 && hours < 24;
};

export const isNightTime = (date: Date): boolean => {
  const hours = date.getHours();
  return hours >= 0 && hours < 6;
};

export const filterByTimePeriod = <T extends { date: string; createdAt?: any }>(
  data: T[],
  timeFilter: TimeFilterType
): T[] => {
  if (timeFilter === 'all') {
    return data;
  }

  return data.filter(item => {
    // Try to get the date from createdAt first, then fall back to date field
    let itemDate: Date;
    
    if (item.createdAt) {
      // Handle Firebase Timestamp or Date object
      if (item.createdAt.toDate) {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt instanceof Date) {
        itemDate = item.createdAt;
      } else {
        itemDate = new Date(item.createdAt);
      }
    } else {
      itemDate = new Date(item.date);
    }
    
    if (timeFilter === 'morning') {
      return isMorningTime(itemDate);
    } else if (timeFilter === 'evening') {
      return isEveningTime(itemDate);
    }
    
    return true;
  });
};

export const getTimePeriodLabel = (timeFilter: TimeFilterType): string => {
  switch (timeFilter) {
    case 'morning':
      return 'Morning (6 AM - 12 PM)';
    case 'evening':
      return 'Evening (6 PM - 12 AM)';
    default:
      return 'All Day';
  }
};

export const getTimePeriodStats = <T extends { date: string; createdAt?: any }>(
  data: T[],
  timeFilter: TimeFilterType
): { total: number; morning: number; evening: number; night: number } => {
  const stats = {
    total: data.length,
    morning: 0,
    evening: 0,
    night: 0
  };

  data.forEach(item => {
    let itemDate: Date;
    
    if (item.createdAt) {
      // Handle Firebase Timestamp or Date object
      if (item.createdAt.toDate) {
        itemDate = item.createdAt.toDate();
      } else if (item.createdAt instanceof Date) {
        itemDate = item.createdAt;
      } else {
        itemDate = new Date(item.createdAt);
      }
    } else {
      itemDate = new Date(item.date);
    }
    
    if (isMorningTime(itemDate)) {
      stats.morning++;
    } else if (isEveningTime(itemDate)) {
      stats.evening++;
    } else if (isNightTime(itemDate)) {
      stats.night++;
    }
  });

  return stats;
}; 