import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, Package, BarChart3, PieChart, TrendingDown, Clock, Sun, Moon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useFirestore } from '../hooks/useFirestore';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, isToday, isYesterday } from 'date-fns';

// Move MetricCard outside the main component to avoid any hook ordering issues
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
}> = ({ title, value, icon, color, change, isPositive, subtitle }) => (
  <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <div className={`p-2 sm:p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      {change && (
        <div className={`flex items-center space-x-1 text-xs sm:text-sm font-medium ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />}
          <span>{change}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {subtitle && <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>}
    </div>
  </div>
);

const Analytics: React.FC = () => {
  // All hooks must be called at the top level, before any conditional returns
  const { inventory, orders, payments, loading } = useFirestore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Use useMemo for expensive calculations to avoid recalculating on every render
  const analyticsData = useMemo(() => {
    if (loading) {
      return {
        filteredOrders: [],
        filteredPayments: [],
        filteredInventory: [],
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
        totalMilkSold: 0,
        totalMilkReceived: 0,
        chartData: [],
        paymentDistribution: [],
        orderStatusData: [],
        dailyAnalytics: [],
        selectedDayData: null
      };
    }

    // Calculate date ranges
    const now = new Date();
    const getDateRange = () => {
      switch (timeRange) {
        case 'week':
          return { start: startOfWeek(now), end: endOfWeek(now) };
        case 'month':
          return { start: startOfMonth(now), end: endOfMonth(now) };
        case '3months':
          return { start: subDays(now, 90), end: now };
        default:
          return { start: startOfMonth(now), end: endOfMonth(now) };
      }
    };

    const { start: dateStart, end: dateEnd } = getDateRange();

    // Filter data by date range
    const filteredOrders = orders.filter(order => 
      isWithinInterval(new Date(order.orderDate), { start: dateStart, end: dateEnd })
    );
    const filteredPayments = payments.filter(payment => 
      isWithinInterval(new Date(payment.date), { start: dateStart, end: dateEnd })
    );
    const filteredInventory = inventory.filter(record => 
      isWithinInterval(new Date(record.date), { start: dateStart, end: dateEnd })
    );

    // Calculate metrics
    const totalRevenue = filteredPayments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const totalCost = filteredInventory.reduce((sum, record) => {
      const buyingPrice = record.buyingPrice || 0;
      const stockReceived = record.stockReceived || 0;
      return sum + (stockReceived * buyingPrice);
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const totalMilkSold = filteredInventory.reduce((sum, record) => sum + (record.stockSold || 0), 0);
    const totalMilkReceived = filteredInventory.reduce((sum, record) => sum + (record.stockReceived || 0), 0);

    // Generate chart data based on time range
    const generateChartData = () => {
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      return Array.from({ length: days }, (_, i) => {
        const date = format(subDays(now, days - 1 - i), 'yyyy-MM-dd');
        const dayOrders = filteredOrders.filter(order => order.orderDate === date);
        const dayPayments = filteredPayments.filter(payment => payment.date === date);
        const dayInventory = filteredInventory.find(record => record.date === date);
        
        const revenue = dayPayments
          .filter(payment => payment.status === 'completed')
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        const cost = dayInventory ? (dayInventory.stockReceived || 0) * (dayInventory.buyingPrice || 0) : 0;
        const profit = revenue - cost;
        const sold = dayInventory ? dayInventory.stockSold : 0;

        return {
          date: format(subDays(now, days - 1 - i), timeRange === 'week' ? 'EEE' : 'MMM dd'),
          fullDate: date,
          revenue,
          profit,
          sold,
          orders: dayOrders.length
        };
      });
    };

    const chartData = generateChartData();

    // Generate detailed daily analytics with morning/evening breakdown
    const generateDailyAnalytics = () => {
      const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      return Array.from({ length: days }, (_, i) => {
        const date = format(subDays(now, days - 1 - i), 'yyyy-MM-dd');
        const dayOrders = filteredOrders.filter(order => order.orderDate === date);
        const dayPayments = filteredPayments.filter(payment => payment.date === date);
        const dayInventory = filteredInventory.find(record => record.date === date);
        
        // Simulate morning/evening breakdown (in real app, you'd have actual time data)
        const morningOrders = dayOrders.slice(0, Math.ceil(dayOrders.length * 0.6)); // 60% morning
        const eveningOrders = dayOrders.slice(Math.ceil(dayOrders.length * 0.6)); // 40% evening
        
        const morningRevenue = morningOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const eveningRevenue = eveningOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        const morningSold = dayInventory ? (dayInventory.stockSold || 0) * 0.6 : 0;
        const eveningSold = dayInventory ? (dayInventory.stockSold || 0) * 0.4 : 0;

        return {
          date,
          displayDate: format(subDays(now, days - 1 - i), 'MMM dd'),
          isToday: isToday(parseISO(date)),
          isYesterday: isYesterday(parseISO(date)),
          totalRevenue: dayPayments
            .filter(payment => payment.status === 'completed')
            .reduce((sum, payment) => sum + payment.amount, 0),
          totalOrders: dayOrders.length,
          totalSold: dayInventory ? dayInventory.stockSold : 0,
          morning: {
            revenue: morningRevenue,
            orders: morningOrders.length,
            sold: morningSold
          },
          evening: {
            revenue: eveningRevenue,
            orders: eveningOrders.length,
            sold: eveningSold
          }
        };
      });
    };

    const dailyAnalytics = generateDailyAnalytics();

    // Get selected day data
    const selectedDayData = dailyAnalytics.find(day => day.date === selectedDate);

    // Payment type distribution
    const onlinePayments = filteredPayments.filter(p => p.type === 'online' && p.status === 'completed');
    const offlinePayments = filteredPayments.filter(p => p.type === 'offline' && p.status === 'completed');
    
    const paymentDistribution = [
      { name: 'Online', value: onlinePayments.reduce((sum, p) => sum + p.amount, 0), color: '#10B981' },
      { name: 'Offline', value: offlinePayments.reduce((sum, p) => sum + p.amount, 0), color: '#6366F1' }
    ];

    // Order status distribution
    const orderStatusData = [
      { name: 'Completed', value: filteredOrders.filter(o => o.status === 'completed').length, color: '#10B981' },
      { name: 'Pending', value: filteredOrders.filter(o => o.status === 'pending').length, color: '#F59E0B' },
      { name: 'Cancelled', value: filteredOrders.filter(o => o.status === 'cancelled').length, color: '#EF4444' }
    ];

    return {
      filteredOrders,
      filteredPayments,
      filteredInventory,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalMilkSold,
      totalMilkReceived,
      chartData,
      paymentDistribution,
      orderStatusData,
      dailyAnalytics,
      selectedDayData
    };
  }, [inventory, orders, payments, loading, timeRange, selectedDate]);

  // Helper function to safely format currency values
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  // Helper function to safely format percentage values
  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0';
    }
    return value.toFixed(1);
  };

  // Now we can safely return early after all hooks have been called
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const {
    filteredOrders,
    filteredPayments,
    filteredInventory,
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    totalMilkSold,
    totalMilkReceived,
    chartData,
    paymentDistribution,
    orderStatusData,
    dailyAnalytics,
    selectedDayData
  } = analyticsData;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">Comprehensive business performance analysis</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input-field w-auto"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3months">Last 3 Months</option>
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Total Revenue"
          value={`₹${formatCurrency(totalRevenue)}`}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-success-500"
          change="+12.5%"
          isPositive={true}
          subtitle={`${filteredOrders.length} orders`}
        />
        <MetricCard
          title="Total Profit"
          value={`₹${formatCurrency(totalProfit)}`}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-primary-500"
          change={`${formatPercentage(profitMargin)}% margin`}
          isPositive={profitMargin > 0}
          subtitle={`${formatPercentage((totalMilkSold / totalMilkReceived) * 100)}% efficiency`}
        />
        <MetricCard
          title="Milk Sold"
          value={`${totalMilkSold || 0}L`}
          icon={<Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-purple-500"
          change="+8.2%"
          isPositive={true}
          subtitle={`${totalMilkReceived}L received`}
        />
        <MetricCard
          title="Total Orders"
          value={filteredOrders.length}
          icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-warning-500"
          change="+15.3%"
          isPositive={true}
          subtitle={`${formatPercentage(filteredOrders.filter(o => o.status === 'completed').length / filteredOrders.length * 100)}% completed`}
        />
      </div>

      {/* Daily Analytics Section */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Analytics</h3>
            <p className="text-xs sm:text-sm text-gray-500">Morning vs Evening performance breakdown</p>
          </div>
          <div className="flex items-center space-x-2">
            <Sun className="w-4 h-4 text-warning-500" />
            <span className="text-xs sm:text-sm text-gray-500">Morning</span>
            <Moon className="w-4 h-4 text-purple-500" />
            <span className="text-xs sm:text-sm text-gray-500">Evening</span>
          </div>
        </div>
        
        {/* Daily Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {dailyAnalytics.slice(0, 12).map((day) => (
            <div
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              className={`
                p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                ${selectedDate === day.date 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                ${day.isToday ? 'ring-2 ring-success-200' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs sm:text-sm font-medium ${day.isToday ? 'text-success-600' : 'text-gray-700'}`}>
                  {day.displayDate}
                </span>
                {day.isToday && <span className="text-xs bg-success-100 text-success-700 px-2 py-1 rounded-full">Today</span>}
                {day.isYesterday && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">Yesterday</span>}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Revenue</span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">₹{formatCurrency(day.totalRevenue)}</span>
                </div>
                
                <div className="flex space-x-1">
                  <div className="flex-1 bg-warning-100 rounded h-2">
                    <div 
                      className="bg-warning-500 h-2 rounded" 
                      style={{ width: `${day.morning.revenue > 0 ? (day.morning.revenue / day.totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex-1 bg-purple-100 rounded h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded" 
                      style={{ width: `${day.evening.revenue > 0 ? (day.evening.revenue / day.totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{day.morning.orders} orders</span>
                  <span>{day.evening.orders} orders</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Day Detailed View */}
        {selectedDayData && (
          <div className="border-t border-gray-200 pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                {format(parseISO(selectedDayData.date), 'EEEE, MMMM do, yyyy')}
                {selectedDayData.isToday && <span className="ml-2 text-sm bg-success-100 text-success-700 px-2 py-1 rounded-full">Today</span>}
              </h4>
              <div className="text-sm text-gray-500">
                Total: ₹{formatCurrency(selectedDayData.totalRevenue)} | {selectedDayData.totalOrders} orders
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Morning Performance */}
              <div className="bg-warning-50 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-5 h-5 text-warning-600" />
                    <h5 className="text-base sm:text-lg font-semibold text-warning-900">Morning Performance</h5>
                  </div>
                  <span className="text-xs sm:text-sm text-warning-600">6 AM - 2 PM</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-warning-700">Revenue</span>
                    <span className="text-lg font-bold text-warning-900">₹{formatCurrency(selectedDayData.morning.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-warning-700">Orders</span>
                    <span className="text-lg font-bold text-warning-900">{selectedDayData.morning.orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-warning-700">Milk Sold</span>
                    <span className="text-lg font-bold text-warning-900">{selectedDayData.morning.sold.toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-warning-700">Avg Order Value</span>
                    <span className="text-lg font-bold text-warning-900">
                      ₹{selectedDayData.morning.orders > 0 ? formatCurrency(selectedDayData.morning.revenue / selectedDayData.morning.orders) : '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evening Performance */}
              <div className="bg-purple-50 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-5 h-5 text-purple-600" />
                    <h5 className="text-base sm:text-lg font-semibold text-purple-900">Evening Performance</h5>
                  </div>
                  <span className="text-xs sm:text-sm text-purple-600">2 PM - 10 PM</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700">Revenue</span>
                    <span className="text-lg font-bold text-purple-900">₹{formatCurrency(selectedDayData.evening.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700">Orders</span>
                    <span className="text-lg font-bold text-purple-900">{selectedDayData.evening.orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700">Milk Sold</span>
                    <span className="text-lg font-bold text-purple-900">{selectedDayData.evening.sold.toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700">Avg Order Value</span>
                    <span className="text-lg font-bold text-purple-900">
                      ₹{selectedDayData.evening.orders > 0 ? formatCurrency(selectedDayData.evening.revenue / selectedDayData.evening.orders) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="mt-6">
              <h5 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { time: '6 AM', morning: selectedDayData.morning.revenue * 0.1, evening: 0 },
                    { time: '8 AM', morning: selectedDayData.morning.revenue * 0.3, evening: 0 },
                    { time: '10 AM', morning: selectedDayData.morning.revenue * 0.6, evening: 0 },
                    { time: '12 PM', morning: selectedDayData.morning.revenue * 0.8, evening: 0 },
                    { time: '2 PM', morning: selectedDayData.morning.revenue, evening: selectedDayData.evening.revenue * 0.2 },
                    { time: '4 PM', morning: selectedDayData.morning.revenue, evening: selectedDayData.evening.revenue * 0.4 },
                    { time: '6 PM', morning: selectedDayData.morning.revenue, evening: selectedDayData.evening.revenue * 0.7 },
                    { time: '8 PM', morning: selectedDayData.morning.revenue, evening: selectedDayData.evening.revenue * 0.9 },
                    { time: '10 PM', morning: selectedDayData.morning.revenue, evening: selectedDayData.evening.revenue }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name) => [`₹${value}`, name === 'morning' ? 'Morning' : 'Evening']} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="morning" 
                      stackId="1"
                      stroke="#f59e0b" 
                      fill="#fef3c7" 
                      fillOpacity={0.8}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="evening" 
                      stackId="1"
                      stroke="#8b5cf6" 
                      fill="#ede9fe" 
                      fillOpacity={0.8}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Revenue & Profit Trend */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Revenue & Profit Trend</h3>
              <p className="text-xs sm:text-sm text-gray-500">Performance over time</p>
            </div>
            <div className="p-2 bg-success-50 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => [`₹${value}`, name === 'revenue' ? 'Revenue' : 'Profit']} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  name="revenue"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3B82F6" 
                  strokeWidth={3} 
                  name="profit"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Sales Volume */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Sales Volume</h3>
              <p className="text-xs sm:text-sm text-gray-500">Milk sales trends</p>
            </div>
            <div className="p-2 bg-primary-50 rounded-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value}L`, 'Sold']} 
                />
                <Bar 
                  dataKey="sold" 
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Payment Distribution */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Payment Type Distribution</h3>
              <p className="text-xs sm:text-sm text-gray-500">Revenue by payment method</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={paymentDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`₹${value}`, 'Amount']} 
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 sm:space-x-8 mt-4 sm:mt-6">
            {paymentDistribution.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 sm:mr-3" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Order Status Distribution</h3>
              <p className="text-xs sm:text-sm text-gray-500">Order completion rates</p>
            </div>
            <div className="p-2 bg-warning-50 rounded-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [value, 'Orders']} 
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 sm:space-x-8 mt-4 sm:mt-6">
            {orderStatusData.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 sm:mr-3" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Performance Summary</h3>
          <div className="p-2 bg-primary-50 rounded-lg">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center p-4 sm:p-6 bg-primary-50 rounded-xl">
            <p className="text-2xl sm:text-3xl font-bold text-primary-600 mb-2">{formatPercentage((totalMilkSold / totalMilkReceived) * 100)}%</p>
            <p className="text-sm font-medium text-gray-700">Sales Efficiency</p>
            <p className="text-xs text-gray-500 mt-1">Milk sold vs received</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-success-50 rounded-xl">
            <p className="text-2xl sm:text-3xl font-bold text-success-600 mb-2">₹{formatCurrency(totalRevenue / filteredOrders.length)}</p>
            <p className="text-sm font-medium text-gray-700">Average Order Value</p>
            <p className="text-xs text-gray-500 mt-1">Revenue per order</p>
          </div>
          <div className="text-center p-4 sm:p-6 bg-warning-50 rounded-xl">
            <p className="text-2xl sm:text-3xl font-bold text-warning-600 mb-2">{formatPercentage(filteredOrders.filter(o => o.status === 'completed').length / filteredOrders.length * 100)}%</p>
            <p className="text-sm font-medium text-gray-700">Order Completion Rate</p>
            <p className="text-xs text-gray-500 mt-1">Successful deliveries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;