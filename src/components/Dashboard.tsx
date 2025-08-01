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
  TrendingDown
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useFirestore } from '../hooks/useFirestore';
import { format, subDays, isAfter, startOfDay } from 'date-fns';
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
          // The Orders component will handle opening its modal
          break;
        case 'add-inventory':
          onPageChange('inventory');
          // The Inventory component will handle opening its modal
          break;
        case 'add-payment':
          onPageChange('payments');
          // The Payments component will handle opening its modal
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

  // Calculate metrics
  const todayStock = inventory.find(item => item.date === format(new Date(), 'yyyy-MM-dd'));
  const totalStock = todayStock?.stockRemaining || 0;
  const totalSold = inventory.reduce((sum, item) => sum + item.stockSold, 0);

  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;

  const totalRevenue = payments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const onlinePayments = payments
    .filter(payment => payment.type === 'online' && payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const offlinePayments = payments
    .filter(payment => payment.type === 'offline' && payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Chart data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const dayInventory = inventory.find(item => item.date === date);
    const dayOrders = orders.filter(order => order.orderDate === date && order.status === 'completed');
    const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    return {
      date: format(subDays(new Date(), 6 - i), 'MMM dd'),
      sold: dayInventory?.stockSold || 0,
      revenue: dayRevenue
    };
  });

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    trend?: {
      value: number;
      isPositive: boolean;
    };
  }> = ({ title, value, icon, color, subtitle, trend }) => (
    <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm font-medium ${trend.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
            {trend.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="card p-8 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-6">
            <Logo size="lg" className="flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back! 👋</h1>
              <p className="text-gray-600 text-lg">Here's what's happening with your fresh milk business today.</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <p className="text-sm text-gray-500 mb-1">Today's Date</p>
            <p className="text-lg font-semibold text-gray-900">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Stock"
          value={`${totalStock}L`}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-primary-500"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Sold"
          value={`${totalSold}L`}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-success-500"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-warning-500"
          subtitle={`${completedOrders} completed`}
          trend={{ value: 3, isPositive: false }}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={<CreditCard className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Daily Sales</h3>
              <p className="text-gray-500">Last 7 days performance</p>
            </div>
            <div className="flex items-center space-x-2 text-success-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
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
                <Line 
                  type="monotone" 
                  dataKey="sold" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Daily Revenue</h3>
              <p className="text-gray-500">Revenue trends over time</p>
            </div>
            <div className="flex items-center space-x-2 text-success-600">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">+18.2%</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Summary */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Payment Summary</h3>
            <div className="p-2 bg-primary-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-success-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Online Payments</span>
              </div>
              <span className="font-bold text-success-600">₹{onlinePayments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                <span className="font-medium text-gray-700">Offline Payments</span>
              </div>
              <span className="font-bold text-primary-600">₹{offlinePayments.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <span className="font-bold text-gray-900">Total Revenue</span>
                <span className="font-bold text-2xl text-gray-900">₹{totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Quick Actions</h3>
            <div className="p-2 bg-warning-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-warning-600" />
            </div>
          </div>
          <div className="space-y-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;