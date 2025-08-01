import { filterByTimePeriod, isMorningTime, isEveningTime, isNightTime, getTimePeriodStats } from './timeFilterUtils';

// Mock Firebase Timestamp
const mockTimestamp = {
  toDate: () => new Date('2024-01-15T10:30:00Z')
};

// Test data
const testData = [
  { id: '1', date: '2024-01-15', createdAt: mockTimestamp }, // Morning (10:30 AM)
  { id: '2', date: '2024-01-15', createdAt: { toDate: () => new Date('2024-01-15T20:30:00Z') } }, // Evening (8:30 PM)
  { id: '3', date: '2024-01-15', createdAt: { toDate: () => new Date('2024-01-15T02:30:00Z') } }, // Night (2:30 AM)
  { id: '4', date: '2024-01-15' }, // No createdAt, uses date field
];

console.log('Testing time filtering utilities...');

// Test individual time functions
console.log('Morning time (10:30 AM):', isMorningTime(new Date('2024-01-15T10:30:00Z')));
console.log('Evening time (8:30 PM):', isEveningTime(new Date('2024-01-15T20:30:00Z')));
console.log('Night time (2:30 AM):', isNightTime(new Date('2024-01-15T02:30:00Z')));

// Test filtering
console.log('All records:', filterByTimePeriod(testData, 'all').length);
console.log('Morning records:', filterByTimePeriod(testData, 'morning').length);
console.log('Evening records:', filterByTimePeriod(testData, 'evening').length);

// Test stats
const stats = getTimePeriodStats(testData, 'all');
console.log('Time period stats:', stats);

console.log('Time filtering utilities test completed!'); 