import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit, Phone, MapPin, TrendingUp, Download, Mail } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: 'active' | 'inactive';
  joinDate: string;
  averageOrderValue: number;
  location?: {
    lat?: number;
    lng?: number;
    link?: string;
  };
}

const Customers: React.FC = () => {
  const { orders, users } = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'totalOrders' | 'lastOrder'>('name');

  // Aggregate customer data from orders and users
  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();

    // Process orders to build customer data
    orders.forEach(order => {
      const phone = order.customerPhone;
      const name = order.customerName;
      const address = order.customerAddress;

      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          id: phone,
          name,
          phone,
          address,
          email: undefined,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: '',
          status: 'inactive',
          joinDate: order.orderDate,
          averageOrderValue: 0,
          location: order.locationLink ? { link: order.locationLink } : undefined
        });
      }

      const customer = customerMap.get(phone)!;
      customer.totalOrders += 1;
      if (order.status === 'completed') {
        customer.totalSpent += order.totalAmount;
      }
      
      if (order.orderDate > customer.lastOrderDate) {
        customer.lastOrderDate = order.orderDate;
      }

      if (order.orderDate < customer.joinDate) {
        customer.joinDate = order.orderDate;
      }
    });

    // Calculate average order value and determine status
    customerMap.forEach(customer => {
      customer.averageOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;
      
      // Consider active if last order was within last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      customer.status = new Date(customer.lastOrderDate) > thirtyDaysAgo ? 'active' : 'inactive';
    });

    // Merge with users data if available
    users.forEach(user => {
      if (user.phone && customerMap.has(user.phone)) {
        const customer = customerMap.get(user.phone)!;
        customer.email = user.email;
        if (user.addresses && user.addresses.length > 0) {
          const defaultAddress = user.addresses.find(a => a.isDefault) || user.addresses[0];
          if (defaultAddress) {
            customer.address = defaultAddress.address || customer.address;
            customer.location = {
              lat: defaultAddress.lat || undefined,
              lng: defaultAddress.lng || undefined,
              link: defaultAddress.liveLocationLink
            };
          }
        }
      }
    });

    return Array.from(customerMap.values());
  }, [orders, users]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'totalOrders':
          return b.totalOrders - a.totalOrders;
        case 'lastOrder':
          return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [customers, searchTerm, statusFilter, sortBy]);

  // Customer statistics
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      totalRevenue,
      totalOrders,
      averageRevenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0
    };
  }, [customers]);

  const exportToCSV = () => {
    const csvData = filteredCustomers.map(customer => [
      customer.name,
      customer.phone,
      customer.email || '',
      customer.address,
      customer.totalOrders,
      customer.totalSpent.toFixed(2),
      customer.averageOrderValue.toFixed(2),
      customer.lastOrderDate,
      customer.status,
      customer.joinDate
    ]);

    const headers = ['Name', 'Phone', 'Email', 'Address', 'Total Orders', 'Total Spent', 'Avg Order Value', 'Last Order', 'Status', 'Join Date'];
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Customers</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats.activeCustomers} active
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Revenue</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">
            From {stats.totalOrders} orders
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Avg Revenue/Customer</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{stats.averageRevenuePerCustomer.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Per customer lifetime
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Rate</span>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalCustomers > 0 ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {stats.inactiveCustomers} inactive
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="totalSpent">Sort by Revenue</option>
            <option value="totalOrders">Sort by Orders</option>
            <option value="lastOrder">Sort by Last Order</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Customer</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Contact</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Address</th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">Orders</th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">Total Spent</th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">Avg Order</th>
                <th className="text-center py-3 px-6 font-medium text-gray-700">Status</th>
                <th className="text-center py-3 px-6 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">Since {customer.joinDate}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-600 line-clamp-2">{customer.address}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-gray-900">{customer.totalOrders}</div>
                    <div className="text-sm text-gray-500">orders</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-gray-900">₹{customer.totalSpent.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">total</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-medium text-gray-900">₹{customer.averageOrderValue.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">average</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      customer.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {}}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {customer.location?.link && (
                        <a
                          href={customer.location.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No customers found</div>
            <div className="text-sm text-gray-500">Try adjusting your search or filters</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
