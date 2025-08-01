# Time Filter Feature

## Overview
The time filter feature allows users to filter data in the Inventory, Orders, and Payments components by time of day. This helps analyze business patterns and performance during different periods.

## Time Periods
- **Morning**: 6:00 AM - 11:59 AM (6:00 - 11:59)
- **Evening**: 6:00 PM - 11:59 PM (18:00 - 23:59)
- **Night**: 12:00 AM - 5:59 AM (0:00 - 5:59)
- **All Day**: Shows all records regardless of time

## Components with Time Filter

### 1. Inventory Management
- Filter inventory records by time of day
- View stock received, sold, and remaining for specific time periods
- Analyze revenue and profit patterns by time
- Time period statistics showing distribution across morning, evening, and night

### 2. Order Management
- Filter orders by time of day
- View pending, completed, and cancelled orders for specific time periods
- Analyze order patterns and revenue by time
- Time period statistics for order distribution

### 3. Payment Management
- Filter payments by time of day
- View online and offline payments for specific time periods
- Analyze payment patterns and revenue by time
- Time period statistics for payment distribution

## Features

### Time Filter Component
- **Reusable Component**: `TimeFilter.tsx` can be used across different components
- **Visual Indicators**: Sun icon for morning, moon icon for evening
- **Active State**: Clear visual indication of selected filter
- **Responsive Design**: Works on mobile and desktop

### Time Period Statistics
Each component shows a statistics panel with:
- Total records count
- Morning records count
- Evening records count
- Night records count

### Smart Date Handling
The system intelligently handles different date formats:
- Firebase Timestamp objects (with `toDate()` method)
- JavaScript Date objects
- String date formats
- Falls back to date field if `createdAt` is not available

## Technical Implementation

### Files Added/Modified
1. **`src/components/TimeFilter.tsx`** - Reusable time filter component
2. **`src/utils/timeFilterUtils.ts`** - Utility functions for time filtering
3. **`src/components/Inventory.tsx`** - Added time filter functionality
4. **`src/components/Orders.tsx`** - Added time filter functionality
5. **`src/components/Payments.tsx`** - Added time filter functionality

### Key Functions
- `filterByTimePeriod()` - Filters data based on time period
- `getTimePeriodStats()` - Calculates statistics for each time period
- `isMorningTime()`, `isEveningTime()`, `isNightTime()` - Time period checks

## Usage

### For Users
1. Navigate to any of the three components (Inventory, Orders, Payments)
2. Look for the "Time Period Filter" section
3. Click on "Morning", "Evening", or "All Day" to filter data
4. View the statistics panel to see distribution across time periods
5. All tables, charts, and summaries will update based on the selected filter

### For Developers
```typescript
import TimeFilter, { TimeFilterType } from './components/TimeFilter';
import { filterByTimePeriod, getTimePeriodStats } from './utils/timeFilterUtils';

// In your component
const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
const filteredData = filterByTimePeriod(yourData, timeFilter);
const stats = getTimePeriodStats(yourData, timeFilter);

// In your JSX
<TimeFilter value={timeFilter} onChange={setTimeFilter} />
```

## Benefits
1. **Business Insights**: Understand peak business hours and patterns
2. **Performance Analysis**: Identify most productive time periods
3. **Resource Planning**: Optimize staffing and inventory based on time patterns
4. **Customer Behavior**: Analyze when customers prefer to place orders
5. **Operational Efficiency**: Focus on high-performing time periods

## Future Enhancements
- Date range filtering (weekly, monthly, custom ranges)
- Time zone support
- Export filtered data
- Advanced analytics and charts
- Custom time period definitions 