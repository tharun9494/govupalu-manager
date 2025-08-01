import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, DollarSign, Package, BarChart3, PieChart, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { useFirestore } from '../hooks/useFirestore';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Move MetricCard outside the main component to avoid any hook ordering issues
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  isPositive?: boolean;
}> = ({ title, value, icon, color, change, isPositive }) => (
  <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      {change && (
        <div className={`flex items-center space-x-1 text-sm font-medium ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{change}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const Analytics: React.FC = () => {
  // All hooks must be called at the top level, before any conditional returns
  const { inventory, orders, payments, loading } = useFirestore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months'>('month');

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
        orderStatusData: []
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
          revenue,
          profit,
          sold,
          orders: dayOrders.length
        };
      });
    };

    const chartData = generateChartData();

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
      orderStatusData
    };
  }, [inventory, orders, payments, loading, timeRange]);

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
    orderStatusData
  } = analyticsData;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Insights</h1>
          <p className="text-gray-600 mt-2">Comprehensive business performance analysis</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="input-field w-auto"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3months">Last 3 Months</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`₹${formatCurrency(totalRevenue)}`}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-success-500"
          change="+12.5%"
          isPositive={true}
        />
        <MetricCard
          title="Total Profit"
          value={`₹${formatCurrency(totalProfit)}`}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-primary-500"
          change={`${formatPercentage(profitMargin)}% margin`}
          isPositive={profitMargin > 0}
        />
        <MetricCard
          title="Milk Sold"
          value={`${totalMilkSold || 0}L`}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          change="+8.2%"
          isPositive={true}
        />
        <MetricCard
          title="Total Orders"
          value={filteredOrders.length}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-warning-500"
          change="+15.3%"
          isPositive={true}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Revenue & Profit Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Revenue & Profit Trend</h3>
              <p className="text-gray-500">Performance over time</p>
            </div>
            <div className="p-2 bg-success-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
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
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Daily Sales Volume</h3>
              <p className="text-gray-500">Milk sales trends</p>
            </div>
            <div className="p-2 bg-primary-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Payment Distribution */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Payment Type Distribution</h3>
              <p className="text-gray-500">Revenue by payment method</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="h-80">
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
          <div className="flex justify-center space-x-8 mt-6">
            {paymentDistribution.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm font-medium text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Order Status Distribution</h3>
              <p className="text-gray-500">Order completion rates</p>
            </div>
            <div className="p-2 bg-warning-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-warning-600" />
            </div>
          </div>
          <div className="h-80">
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
          <div className="flex justify-center space-x-8 mt-6">
            {orderStatusData.map((entry, index) => (
              <div key={index} className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                <span className="text-sm font-medium text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Performance Summary</h3>
          <div className="p-2 bg-primary-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-primary-50 rounded-xl">
            <p className="text-3xl font-bold text-primary-600 mb-2">{formatPercentage((totalMilkSold / totalMilkReceived) * 100)}%</p>
            <p className="text-sm font-medium text-gray-700">Sales Efficiency</p>
            <p className="text-xs text-gray-500 mt-1">Milk sold vs received</p>
          </div>
          <div className="text-center p-6 bg-success-50 rounded-xl">
            <p className="text-3xl font-bold text-success-600 mb-2">₹{formatCurrency(totalRevenue / filteredOrders.length)}</p>
            <p className="text-sm font-medium text-gray-700">Average Order Value</p>
            <p className="text-xs text-gray-500 mt-1">Revenue per order</p>
          </div>
          <div className="text-center p-6 bg-warning-50 rounded-xl">
            <p className="text-3xl font-bold text-warning-600 mb-2">{formatPercentage(filteredOrders.filter(o => o.status === 'completed').length / filteredOrders.length * 100)}%</p>
            <p className="text-sm font-medium text-gray-700">Order Completion Rate</p>
            <p className="text-xs text-gray-500 mt-1">Successful deliveries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;