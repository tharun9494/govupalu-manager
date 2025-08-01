import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  CreditCard, 
  TrendingUp,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { useFirestore } from '../hooks/useFirestore';
import { format, subDays, isAfter, startOfDay, isToday, isYesterday } from 'date-fns';
import Logo from './Logo';

interface DashboardProps {
  onPageChange?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const { inventory, orders, payments, loading } = useFirestore();

  const handleQuickAction = (action: string) => {
    if (onPageChange) {
      switch (action) {
        case 'add-order':
          onPageChange('orders');
          break;
        case 'add-inventory':
          onPageChange('inventory');
          break;
        case 'add-payment':
          onPageChange('payments');
          break;
        case 'view-analytics':
          onPageChange('analytics');
          break;
        default:
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Enhanced metrics calculations
  const todayStock = inventory.find(item => item.date === format(new Date(), 'yyyy-MM-dd'));
  const yesterdayStock = inventory.find(item => item.date === format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const currentStock = todayStock?.stockRemaining || 0;
  const totalSold = inventory.reduce((sum, item) => sum + item.stockSold, 0);
  const totalReceived = inventory.reduce((sum, item) => sum + item.stockReceived, 0);

  // Order metrics
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');
  const todayOrders = orders.filter(order => isToday(new Date(order.orderDate)));
  const yesterdayOrders = orders.filter(order => isYesterday(new Date(order.orderDate)));

  // Payment metrics
  const completedPayments = payments.filter(payment => payment.status === 'completed');
  const pendingPayments = payments.filter(payment => payment.status === 'pending');
  const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const onlinePayments = completedPayments.filter(payment => payment.type === 'online');
  const offlinePayments = completedPayments.filter(payment => payment.type === 'offline');
  const onlineRevenue = onlinePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const offlineRevenue = offlinePayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Stock alerts
  const lowStockItems = inventory.filter(item => item.stockRemaining < 10 && item.stockRemaining > 0);
  const outOfStockItems = inventory.filter(item => item.stockRemaining <= 0);

  // Chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dayInventory = inventory.find(item => item.date === date);
    const dayOrders = orders.filter(order => order.orderDate === date && order.status === 'completed');
    const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const dayStockRemaining = dayInventory?.stockRemaining || 0;
    
    return {
      date: format(subDays(new Date(), 6 - i), 'MMM dd'),
      sold: dayInventory?.stockSold || 0,
      revenue: dayRevenue,
      stock: dayStockRemaining
    };
  });

  // Payment type distribution for pie chart
  const paymentTypeData = [
    { name: 'Online', value: onlinePayments.length, color: '#10b981' },
    { name: 'Offline', value: offlinePayments.length, color: '#8b5cf6' }
  ];

  // Order status distribution
  const orderStatusData = [
    { name: 'Completed', value: completedOrders.length, color: '#10b981' },
    { name: 'Pending', value: pendingOrders.length, color: '#f59e0b' },
    { name: 'Cancelled', value: cancelledOrders.length, color: '#ef4444' }
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: {
      value: number;
      isPositive: boolean;
      label?: string;
    };
    onClick?: () => void;
  }> = ({ title, value, icon, color, subtitle, trend, onClick }) => (
    <div 
      className={`card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-xs sm:text-sm font-medium ${trend.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-xs sm:text-sm text-gray-500">{subtitle}</p>}
        {trend?.label && <p className="text-xs text-gray-400 mt-1">{trend.label}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="card p-6 sm:p-8 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Logo size="lg" className="flex-shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome back! 👋</h1>
              <p className="text-gray-600 text-base sm:text-lg">Here's what's happening with your fresh milk business today.</p>
            </div>
          </div>
          <div className="mt-4 lg:mt-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Today's Date</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="card p-4 sm:p-6 bg-warning-50 border border-warning-200">
          <div className="flex items-start">
            <div className="p-2 bg-warning-100 rounded-lg mr-4">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-warning-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-warning-900 mb-2">Stock Alerts</h3>
              <div className="space-y-1">
                {outOfStockItems.length > 0 && (
                  <p className="text-sm text-warning-700">
                    <span className="font-medium">{outOfStockItems.length}</span> item(s) are out of stock
                  </p>
                )}
                {lowStockItems.length > 0 && (
                  <p className="text-sm text-warning-700">
                    <span className="font-medium">{lowStockItems.length}</span> item(s) have low stock (less than 10L)
                  </p>
                )}
                <button 
                  onClick={() => handleQuickAction('add-inventory')}
                  className="text-sm text-warning-800 font-medium hover:text-warning-900 underline"
                >
                  Update inventory now →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Current Stock"
          value={`${currentStock}L`}
          icon={<Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-primary-500"
          subtitle={`${totalReceived}L total received`}
          trend={{ 
            value: yesterdayStock ? Math.round(((currentStock - yesterdayStock.stockRemaining) / yesterdayStock.stockRemaining) * 100) : 0, 
            isPositive: currentStock > (yesterdayStock?.stockRemaining || 0),
            label: 'vs yesterday'
          }}
          onClick={() => handleQuickAction('add-inventory')}
        />
        <StatCard
          title="Total Sold"
          value={`${totalSold}L`}
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-success-500"
          subtitle={`${completedOrders.length} orders completed`}
          trend={{ 
            value: 8, 
            isPositive: true,
            label: 'this month'
          }}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders.length}
          icon={<ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-warning-500"
          subtitle={`${completedOrders.length} completed, ${cancelledOrders.length} cancelled`}
          trend={{ 
            value: 3, 
            isPositive: false,
            label: 'needs attention'
          }}
          onClick={() => handleQuickAction('add-order')}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={<CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="bg-purple-500"
          subtitle={`₹${todayRevenue.toLocaleString()} today`}
          trend={{ 
            value: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 15, 
            isPositive: todayRevenue > yesterdayRevenue,
            label: 'vs yesterday'
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* Sales Chart */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Sales & Stock</h3>
              <p className="text-xs sm:text-sm text-gray-500">Last 7 days performance</p>
            </div>
            <div className="flex items-center space-x-2 text-success-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">+12.5%</span>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
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
                  formatter={(value, name) => [
                    name === 'sold' ? `${value}L` : name === 'revenue' ? `₹${value}` : `${value}L`,
                    name === 'sold' ? 'Sold' : name === 'revenue' ? 'Revenue' : 'Stock'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="sold" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  name="sold"
                />
                <Line 
                  type="monotone" 
                  dataKey="stock" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2 }}
                  name="stock"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Daily Revenue</h3>
              <p className="text-xs sm:text-sm text-gray-500">Revenue trends over time</p>
            </div>
            <div className="flex items-center space-x-2 text-success-600">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-medium">+18.2%</span>
            </div>
          </div>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
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
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Payment Summary */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Payment Summary</h3>
            <div className="p-2 bg-primary-50 rounded-lg">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-success-50 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                <span className="text-sm sm:text-base font-medium text-gray-700">Online Payments</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-success-600 text-sm sm:text-base">₹{onlineRevenue.toLocaleString()}</span>
                <p className="text-xs text-gray-500">{onlinePayments.length} transactions</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span className="text-sm sm:text-base font-medium text-gray-700">Offline Payments</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-primary-600 text-sm sm:text-base">₹{offlineRevenue.toLocaleString()}</span>
                <p className="text-xs text-gray-500">{offlinePayments.length} transactions</p>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-900 text-sm sm:text-base">Total Revenue</span>
                <span className="font-bold text-xl sm:text-2xl text-gray-900">₹{totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Order Status</h3>
            <div className="p-2 bg-warning-50 rounded-lg">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-success-50 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
                <span className="text-sm sm:text-base font-medium text-gray-700">Completed</span>
              </div>
              <span className="font-bold text-success-600 text-sm sm:text-base">{completedOrders.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-warning-50 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
                <span className="text-sm sm:text-base font-medium text-gray-700">Pending</span>
              </div>
              <span className="font-bold text-warning-600 text-sm sm:text-base">{pendingOrders.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-danger-50 rounded-xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-danger-600" />
                <span className="text-sm sm:text-base font-medium text-gray-700">Cancelled</span>
              </div>
              <span className="font-bold text-danger-600 text-sm sm:text-base">{cancelledOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h3>
            <div className="p-2 bg-warning-50 rounded-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-warning-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <button 
              onClick={() => handleQuickAction('add-order')}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center justify-center space-x-2 font-medium group"
            >
              <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Add New Order</span>
            </button>
            <button 
              onClick={() => handleQuickAction('add-inventory')}
              className="w-full bg-success-600 text-white py-3 px-4 rounded-xl hover:bg-success-700 transition-all duration-200 flex items-center justify-center space-x-2 font-medium group"
            >
              <Package className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Update Inventory</span>
            </button>
            <button 
              onClick={() => handleQuickAction('add-payment')}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl hover:bg-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 font-medium group"
            >
              <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Record Payment</span>
            </button>
            <button 
              onClick={() => handleQuickAction('view-analytics')}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-all duration-200 flex items-center justify-center space-x-2 font-medium group"
            >
              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;