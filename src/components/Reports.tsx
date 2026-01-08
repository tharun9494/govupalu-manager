import React, { useState, useMemo } from 'react';
import { Download, Calendar, TrendingDown, DollarSign, Package, FileText } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ReportFilters {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  reportType: 'sales' | 'inventory' | 'customers' | 'payments' | 'all';
}

const Reports: React.FC = () => {
  const { orders, inventory, payments } = useFirestore();
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reportType: 'all'
  });

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const start = startOfDay(new Date(filters.startDate));
    const end = endOfDay(new Date(filters.endDate));

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return isWithinInterval(orderDate, { start, end });
    });

    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return isWithinInterval(paymentDate, { start, end });
    });

    const filteredInventory = inventory.filter(record => {
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start, end });
    });

    return {
      orders: filteredOrders,
      payments: filteredPayments,
      inventory: filteredInventory
    };
  }, [orders, payments, inventory, filters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredData.orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.totalAmount, 0);

    const totalOrders = filteredData.orders.length;
    const completedOrders = filteredData.orders.filter(order => order.status === 'completed').length;
    const pendingOrders = filteredData.orders.filter(order => order.status === 'pending').length;

    const totalMilkSold = filteredData.orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.quantity, 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const totalPayments = filteredData.payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const pendingPayments = filteredData.payments
      .filter(payment => payment.status === 'pending')
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalMilkSold,
      averageOrderValue,
      totalPayments,
      pendingPayments
    };
  }, [filteredData]);

  // Chart data for sales trend
  const salesTrendData = useMemo(() => {
    const dailyData = new Map<string, { date: string; revenue: number; orders: number; quantity: number }>();

    filteredData.orders.forEach(order => {
      if (order.status === 'completed') {
        const date = order.orderDate;
        const existing = dailyData.get(date) || { date, revenue: 0, orders: 0, quantity: 0 };
        dailyData.set(date, {
          date,
          revenue: existing.revenue + order.totalAmount,
          orders: existing.orders + 1,
          quantity: existing.quantity + order.quantity
        });
      }
    });

    return Array.from(dailyData.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Product performance data
  const productPerformanceData = useMemo(() => {
    const productMap = new Map<string, { name: string; revenue: number; quantity: number; orders: number }>();

    filteredData.orders.forEach(order => {
      if (order.status === 'completed') {
        order.orderItems.forEach(item => {
          const existing = productMap.get(item.name) || { 
            name: item.name, 
            revenue: 0, 
            quantity: 0, 
            orders: 0 
          };
          productMap.set(item.name, {
            name: item.name,
            revenue: existing.revenue + (item.price * item.quantity),
            quantity: existing.quantity + item.quantity,
            orders: existing.orders + 1
          });
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [filteredData]);

  // Order status distribution
  const orderStatusData = useMemo(() => {
    const statusCount = filteredData.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'completed' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#ef4444'
    }));
  }, [filteredData]);

  const exportToCSV = () => {
    const csvData = filteredData.orders.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerPhone,
      order.orderDate,
      order.status,
      order.quantity,
      order.pricePerLiter,
      order.totalAmount,
      order.notes || ''
    ]);

    const headers = ['Order #', 'Customer', 'Phone', 'Date', 'Status', 'Quantity', 'Price/Liter', 'Total', 'Notes'];
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const setDateRange = (range: 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: range,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd')
    }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={filters.dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {filters.dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </>
          )}

          <select
            value={filters.reportType}
            onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value as any }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Reports</option>
            <option value="sales">Sales</option>
            <option value="inventory">Inventory</option>
            <option value="customers">Customers</option>
            <option value="payments">Payments</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{metrics.totalRevenue.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            From {metrics.completedOrders} completed orders
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Orders</span>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</div>
          <div className="text-sm text-gray-500 mt-1">
            {metrics.pendingOrders} pending
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Milk Sold</span>
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{metrics.totalMilkSold}L</div>
          <div className="text-sm text-gray-500 mt-1">
            Avg: ₹{metrics.averageOrderValue.toFixed(2)}/order
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Pending Payments</span>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{metrics.pendingPayments.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Total collected: ₹{metrics.totalPayments.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Orders</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Quantity</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productPerformanceData.map((product, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{product.name}</td>
                  <td className="text-right py-3 px-4 text-gray-600">{product.orders}</td>
                  <td className="text-right py-3 px-4 text-gray-600">{product.quantity}</td>
                  <td className="text-right py-3 px-4 font-medium text-gray-900">
                    ₹{product.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
