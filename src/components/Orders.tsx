import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Calendar, CheckCircle, XCircle, Clock, ShoppingCart, Users, TrendingUp, X, Hash, RefreshCw, MapPin, Eye } from 'lucide-react';
import { useFirestore, Order } from '../hooks/useFirestore';
import { format, isToday } from 'date-fns';

interface OrdersProps {
  autoOpenModal?: boolean;
}

const Orders: React.FC<OrdersProps> = ({ autoOpenModal = false }) => {
  const { orders, addOrder, updateOrder, deleteOrder, loading } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({
    orderNumber: '',
    customerName: '',
    customerPhone: '',
    quantity: '',
    pricePerLiter: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    orderTime: format(new Date(), 'HH:mm'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryTime: 'morning', // morning or evening
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    notes: ''
  });

  // Auto-open modal if prop is true
  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
    }
  }, [autoOpenModal]);

  // Determine delivery time based on current time
  const getDeliveryTimeBasedOnCurrentTime = () => {
    const currentHour = new Date().getHours();
    
    // Morning delivery: 6 AM - 10 AM
    if (currentHour >= 6 && currentHour < 10) {
      return 'morning';
    }
    // Evening delivery: 5 PM - 10 PM
    else if (currentHour >= 17 && currentHour < 22) {
      return 'evening';
    }
    // Default logic: before 12 PM = morning, after 12 PM = evening
    else {
      return currentHour < 12 ? 'morning' : 'evening';
    }
  };

  // Generate order number for today
  const generateOrderNumber = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayOrders = orders.filter(order => order.orderDate === today);
    const morningOrders = todayOrders.filter(order => order.deliveryTime === 'morning');
    const eveningOrders = todayOrders.filter(order => order.deliveryTime === 'evening');
    
    const currentTime = new Date().getHours();
    const isMorning = currentTime < 12;
    
    if (isMorning) {
      return `M${morningOrders.length + 1}`;
    } else {
      return `E${eveningOrders.length + 1}`;
    }
  };

  // Auto-fill order number, time, and delivery time when form opens
  useEffect(() => {
    if (isModalOpen && !editingOrder) {
      const currentTime = format(new Date(), 'HH:mm');
      const deliveryTime = getDeliveryTimeBasedOnCurrentTime();
      
      setFormData(prev => ({
        ...prev,
        orderNumber: generateOrderNumber(),
        orderTime: currentTime,
        deliveryTime: deliveryTime
      }));
    }
  }, [isModalOpen, editingOrder, orders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const quantity = parseFloat(formData.quantity);
      const pricePerLiter = parseFloat(formData.pricePerLiter);
      const totalAmount = quantity * pricePerLiter;

      const orderData = {
        orderNumber: formData.orderNumber,
        customerName: formData.customerName.trim() || 'Anonymous Customer',
        customerPhone: formData.customerPhone.trim() || 'No Phone',
        customerAddress: 'Address not provided',
        orderItems: [{
          name: 'Milk Order',
          category: 'Milk & Dairy Products',
          quantity: quantity,
          price: pricePerLiter,
          basePrice: pricePerLiter
        }],
        quantity,
        pricePerLiter,
        totalAmount,
        status: formData.status,
        orderDate: formData.orderDate,
        orderTime: formData.orderTime,
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime as 'morning' | 'evening',
        paymentMethod: 'COD',
        notes: formData.notes
      };

      if (editingOrder) {
        await updateOrder(editingOrder.id!, orderData);
      } else {
        await addOrder(orderData);
      }

      resetForm();
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const resetForm = () => {
    const currentTime = format(new Date(), 'HH:mm');
    const deliveryTime = getDeliveryTimeBasedOnCurrentTime();
    
    setFormData({
      orderNumber: '',
      customerName: '',
      customerPhone: '',
      quantity: '',
      pricePerLiter: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      orderTime: currentTime,
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      deliveryTime: deliveryTime,
      status: 'pending',
      notes: ''
    });
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      orderNumber: order.orderNumber || '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      quantity: order.quantity.toString(),
      pricePerLiter: order.pricePerLiter.toString(),
      orderDate: order.orderDate,
      orderTime: order.orderTime || format(new Date(), 'HH:mm'),
      deliveryDate: order.deliveryDate,
      deliveryTime: order.deliveryTime || 'morning',
      status: order.status,
      notes: order.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteOrder(orderId);
      } catch (error) {
        console.error('Error deleting order:', error);
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      await updateOrder(orderId, { status: newStatus });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  //

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800 border-success-200';
      case 'cancelled':
        return 'bg-danger-100 text-danger-800 border-danger-200';
      default:
        return 'bg-warning-100 text-warning-800 border-warning-200';
    }
  };

  const getDeliveryTimeColor = (time: string) => {
    return time === 'morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const getMapsUrlForOrder = (order: Order | null): string | undefined => {
    if (!order) return undefined;
    if (order.locationLink) return order.locationLink;
    if (order.customerAddress && order.customerAddress.trim().length > 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerAddress)}`;
    }
    return undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');
  const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  // Today's orders
  const todayOrders = orders.filter(order => order.orderDate && !isNaN(new Date(order.orderDate).getTime()) && isToday(new Date(order.orderDate)));
  const todayMorningOrders = todayOrders.filter(order => order.deliveryTime === 'morning');
  const todayEveningOrders = todayOrders.filter(order => order.deliveryTime === 'evening');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Manage customer orders and deliveries</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary mt-4 sm:mt-0 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Order</span>
        </button>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Today's Orders</p>
              <p className="text-2xl font-bold text-blue-900">{todayOrders.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex space-x-4 text-xs">
            <span className="text-blue-600">Morning: {todayMorningOrders.length}</span>
            <span className="text-blue-600">Evening: {todayEveningOrders.length}</span>
          </div>
        </div>

        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Pending Delivery</p>
              <p className="text-2xl font-bold text-green-900">{pendingOrders.length}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-900">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              {/* <CreditCard className="w-5 h-5 text-purple-600" /> */}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Orders Section */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Today's Orders</h2>
                <p className="text-sm text-gray-600">Orders scheduled for delivery today</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="text-gray-600">Morning: {todayMorningOrders.length}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                <span className="text-gray-600">Evening: {todayEveningOrders.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Morning Orders */}
        <div className="border-b border-gray-100">
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🌅</span>
              <h3 className="font-semibold text-blue-900">Morning Deliveries</h3>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                {todayMorningOrders.length} orders
              </span>
            </div>
          </div>
          {todayMorningOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Order Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayMorningOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => { setDetailsOrder(order); setIsDetailsOpen(true); }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash className="w-4 h-4 text-blue-400 mr-2" />
                          <span className="text-sm font-mono font-medium text-gray-900">
                            {order.orderNumber || 'N/A'}
                          </span>
                        </div>
                      </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {order.customerName}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {order.customerAddress}
                              </div>
                              {order.locationLink && (
                                <a 
                                  href={order.locationLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center mt-1"
                                >
                                  <MapPin className="w-3 h-3 mr-1" />
                                  View Location
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {order.orderTime && order.orderTime.match(/^\d{2}:\d{2}$/) 
                              ? format(new Date(`2000-01-01T${order.orderTime}`), 'hh:mm a') 
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${order.quantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {order.quantity > 0 ? `${order.quantity}L` : 'Not specified'}
                    </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {order.orderItems && order.orderItems.length > 0 ? (
                              <div className="space-y-1">
                                {order.orderItems.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-xs text-gray-600 truncate">
                                    {Number(item.quantity ?? 0)}x {item.name}
                                  </div>
                                ))}
                                {order.orderItems.length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{order.orderItems.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                <div>Order placed</div>
                                <div className="text-gray-300">Items not specified</div>
                              </div>
                            )}
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${(order.totalAmount || 0) > 0 ? 'text-success-600' : 'text-gray-400'}`}>
                      ₹{(order.totalAmount || 0).toFixed(2)}
                    </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.paymentMethod === 'COD' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id!, e.target.value as any)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(order.id!); }}
                            className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-blue-50">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg">🌅</span>
              </div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">No morning orders</h4>
              <p className="text-xs text-blue-600 mb-3">No orders scheduled for morning delivery</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary text-xs px-3 py-1 inline-flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Morning Order</span>
              </button>
            </div>
          )}
        </div>

        {/* Evening Orders */}
        <div>
          <div className="px-6 py-3 bg-purple-50 border-b border-purple-100">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🌆</span>
              <h3 className="font-semibold text-purple-900">Evening Deliveries</h3>
              <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                {todayEveningOrders.length} orders
              </span>
            </div>
          </div>
          {todayEveningOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Order Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-purple-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayEveningOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-purple-50 transition-colors duration-200 cursor-pointer"
                      onClick={() => { setDetailsOrder(order); setIsDetailsOpen(true); }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Hash className="w-4 h-4 text-purple-400 mr-2" />
                          <span className="text-sm font-mono font-medium text-gray-900">
                            {order.orderNumber || 'N/A'}
                          </span>
                        </div>
                      </td>
                                              <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {order.customerName === 'Customer' ? `Order #${order.id?.substring(0, 8).toUpperCase()}` : order.customerName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {order.customerPhone === 'N/A' ? 'COD Order' : order.customerPhone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {order.orderTime && order.orderTime.match(/^\d{2}:\d{2}$/) 
                              ? format(new Date(`2000-01-01T${order.orderTime}`), 'hh:mm a') 
                              : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${order.quantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {order.quantity > 0 ? `${order.quantity}L` : 'Not specified'}
                    </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {order.orderItems && order.orderItems.length > 0 ? (
                              <div className="space-y-1">
                                {order.orderItems.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-xs text-gray-600 truncate">
                                    {Number(item.quantity ?? 0)}x {item.name}
                                  </div>
                                ))}
                                {order.orderItems.length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{order.orderItems.length - 2} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                <div>Order placed</div>
                                <div className="text-gray-300">Items not specified</div>
                              </div>
                            )}
                          </div>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${(order.totalAmount || 0) > 0 ? 'text-success-600' : 'text-gray-400'}`}>
                      ₹{(order.totalAmount || 0).toFixed(2)}
                    </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.paymentMethod === 'COD' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id!, e.target.value as any)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors`}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                            className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(order.id!); }}
                            className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-purple-50">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-lg">🌆</span>
              </div>
              <h4 className="text-sm font-medium text-purple-900 mb-1">No evening orders</h4>
              <p className="text-xs text-purple-600 mb-3">No orders scheduled for evening delivery</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary text-xs px-3 py-1 inline-flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Evening Order</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
            <p className="text-3xl font-bold text-gray-900">{pendingOrders.length}</p>
            <p className="text-sm text-warning-600 mt-1">Awaiting delivery</p>
          </div>
        </div>
        
        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-success-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Completed Orders</p>
            <p className="text-3xl font-bold text-gray-900">{completedOrders.length}</p>
            <p className="text-sm text-success-600 mt-1">Successfully delivered</p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-danger-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <XCircle className="w-6 h-6 text-danger-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-danger-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Cancelled Orders</p>
            <p className="text-3xl font-bold text-gray-900">{cancelledOrders.length}</p>
            <p className="text-sm text-danger-600 mt-1">Cancelled by customer</p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="w-6 h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-primary-600 mt-1">From completed orders</p>
          </div>
        </div>
      </div>

      {/* All Orders Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">All Orders</h2>
              <p className="text-sm text-gray-500 mt-1">Complete order history and management</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <Users className="w-4 h-4" />
              <span className="text-sm">{orders.length} total orders</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                  onClick={() => { setDetailsOrder(order); setIsDetailsOpen(true); }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {order.orderNumber || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2"></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {order.customerAddress}
                        </div>
                        {order.locationLink && (
                          <a 
                            href={order.locationLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-800 flex items-center mt-1"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            View Location
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{order.customerPhone !== 'N/A' ? order.customerPhone : '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {order.orderTime ? format(new Date(`2000-01-01T${order.orderTime}`), 'hh:mm a') : 'N/A'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.orderDate && !isNaN(new Date(order.orderDate).getTime()) ? format(new Date(order.orderDate), 'MMM dd, yyyy') : (order.createdAt ? format(new Date((order as any).createdAt.toDate ? (order as any).createdAt.toDate() : order.orderDate), 'MMM dd, yyyy') : '')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${order.quantity > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {order.quantity > 0 ? `${order.quantity}L` : 'Not specified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{order.orderItems ? order.orderItems.length : 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {order.orderItems && order.orderItems.length > 0 ? (
                        <div className="space-y-1">
                          {order.orderItems.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-xs text-gray-600 truncate">
                              {Number(item.quantity ?? 0)}x {item.name}
                            </div>
                          ))}
                          {order.orderItems.length > 2 && (
                            <div className="text-xs text-gray-400">
                              +{order.orderItems.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          <div>Order placed</div>
                          <div className="text-gray-300">Items not specified</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-bold ${(order.totalAmount || 0) > 0 ? 'text-success-600' : 'text-gray-400'}`}>
                      ₹{(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      order.paymentMethod === 'COD' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {order.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900">
                        {order.deliveryDate && !isNaN(new Date(order.deliveryDate).getTime()) 
                          ? format(new Date(order.deliveryDate), 'MMM dd') 
                          : 'N/A'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDeliveryTimeColor(order.deliveryTime || 'morning')}`}>
                        {order.deliveryTime === 'morning' ? 'Morning' : 'Evening'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailsOrder(order); setIsDetailsOpen(true); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id!, e.target.value as any)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(order.id!); }}
                        className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first order.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Order</span>
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-2xl w-full p-6 animate-scale-in max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingOrder ? 'Edit Order' : 'Add New Order'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingOrder ? 'Update order details below' : 'Fill in the order details to create a new order'}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Number Section */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Hash className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-blue-900">Order Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Order Number</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                        className="input-field flex-1 bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Auto-generated"
                        readOnly={!editingOrder}
                      />
                      {!editingOrder && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, orderNumber: generateOrderNumber() })}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                          title="Generate new order number"
                        >
                          <RefreshCw className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {!editingOrder ? 'Auto-generated based on time of day (M1, M2... for morning, E1, E2... for evening)' : 'Order number cannot be changed'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-2">Order Time</label>
                    <input
                      type="time"
                      value={formData.orderTime}
                      onChange={(e) => setFormData({ ...formData, orderTime: e.target.value })}
                      className="input-field bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Time when the order was placed (12-hour format)
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information Section */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-medium text-green-900">Customer Information (Optional)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      Customer Name
                      <span className="text-green-500 ml-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="input-field bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
                      placeholder="Enter customer name or leave blank"
                    />
                    <p className="text-xs text-green-600 mt-1">Will show as "Anonymous Customer" if left blank</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-2">
                      Phone Number
                      <span className="text-green-500 ml-1">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="input-field bg-white border-green-300 focus:border-green-500 focus:ring-green-500"
                      placeholder="Enter phone number or leave blank"
                    />
                    <p className="text-xs text-green-600 mt-1">Will show as "No Phone" if left blank</p>
                  </div>
                </div>
              </div>

              {/* Order Details Section */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-2 mb-3">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-medium text-purple-900">Order Details</h3>
                </div>
                
                {/* Quantity with Quick Actions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Quantity (Liters) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="0.5"
                      step="0.5"
                      className="input-field bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Enter quantity in liters"
                    />
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-purple-600 font-medium">Quick select:</span>
                      {[0.5, 1, 2, 3, 5, 10].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => setFormData({ ...formData, quantity: qty.toString() })}
                          className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                        >
                          {qty}L
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price per Liter */}
                <div>
                  <label className="block text-sm font-medium text-purple-700 mb-2">
                    Price per Liter (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={formData.pricePerLiter}
                      onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="input-field bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                      placeholder="Enter price per liter"
                    />
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-purple-600 font-medium">Common prices:</span>
                      {[25, 30, 35, 40, 45, 50].map((price) => (
                        <button
                          key={price}
                          type="button"
                          onClick={() => setFormData({ ...formData, pricePerLiter: price.toString() })}
                          className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors"
                        >
                          ₹{price}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Information Section */}
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-medium text-orange-900">Delivery Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-2">
                      Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      required
                      className="input-field bg-white border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-2">
                      Delivery Time <span className="text-red-500">*</span>
                      {!editingOrder && (
                        <span className="text-xs text-orange-600 ml-2 font-normal">
                          (Auto-set based on current time)
                        </span>
                      )}
                    </label>
                    <select
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                      className="input-field bg-white border-orange-300 focus:border-orange-500 focus:ring-orange-500"
                    >
                      <option value="morning">🌅 Morning (6 AM - 10 AM)</option>
                      <option value="evening">🌆 Evening (5 PM - 10 PM)</option>
                    </select>
                    {!editingOrder && (
                      <p className="text-xs text-orange-600 mt-1">
                        Automatically set to {formData.deliveryTime === 'morning' ? 'Morning' : 'Evening'} based on current time
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Notes Section */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="input-field bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="completed">✅ Completed</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes <span className="text-gray-500">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input-field bg-white border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      rows={2}
                      placeholder="Any special instructions, delivery notes, or comments..."
                    />
                  </div>
                </div>
              </div>

              {/* Total Amount Preview */}
              {formData.quantity && formData.pricePerLiter && (
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 rounded-xl border border-primary-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-primary-700 font-medium">Order Summary</p>
                      <p className="text-xs text-primary-600">
                        {formData.quantity}L × ₹{formData.pricePerLiter} per liter
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-primary-700">Total Amount</p>
                      <p className="text-2xl font-bold text-primary-900">
                        ₹{(parseFloat(formData.quantity) * parseFloat(formData.pricePerLiter)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1 sm:flex-none px-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 sm:flex-none px-8"
                  disabled={!formData.quantity || !formData.pricePerLiter}
                >
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {isDetailsOpen && detailsOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions: Call and Navigate */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {detailsOrder.customerPhone && detailsOrder.customerPhone !== 'N/A' && (
                <a
                  href={`tel:${detailsOrder.customerPhone}`}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                >
                  <Phone className="w-4 h-4 mr-2" /> Call {detailsOrder.customerPhone}
                </a>
              )}
              {getMapsUrlForOrder(detailsOrder) && (
                <a
                  href={getMapsUrlForOrder(detailsOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  <MapPin className="w-4 h-4 mr-2" /> Open in Google Maps
                </a>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="text-sm font-medium font-mono">{detailsOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium">{detailsOrder.customerName}</p>
                  {detailsOrder.customerPhone !== 'N/A' && (
                    <a href={`tel:${detailsOrder.customerPhone}`} className="text-xs text-primary-600 hover:text-primary-800">{detailsOrder.customerPhone}</a>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Order Time</p>
                  <p className="text-sm text-gray-700">
                    {detailsOrder.orderDate ? format(new Date(detailsOrder.orderDate), 'MMM dd, yyyy') : ''}
                    {detailsOrder.orderTime && detailsOrder.orderTime.match(/^\d{2}:\d{2}$/)
                      ? ` • ${format(new Date(`2000-01-01T${detailsOrder.orderTime}`), 'hh:mm a')}`
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Delivery Time</p>
                  <p className="text-sm text-gray-700">{detailsOrder.deliveryTime === 'morning' ? 'Morning (6 AM - 10 AM)' : 'Evening (5 PM - 10 PM)'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className="text-sm text-gray-700">
                    {detailsOrder.quantity && detailsOrder.quantity > 0
                      ? `${detailsOrder.quantity} L`
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg. Price / Litre</p>
                  <p className="text-sm text-gray-700">
                    {detailsOrder.pricePerLiter && detailsOrder.pricePerLiter > 0
                      ? `₹${detailsOrder.pricePerLiter.toFixed(2)}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm text-gray-700">{detailsOrder.customerAddress}</p>
                  {detailsOrder.locationLink && (
                    <a href={detailsOrder.locationLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800 inline-flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" /> Open in Maps
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Items</p>
                <div className="divide-y rounded-lg border">
                  {detailsOrder.orderItems && detailsOrder.orderItems.length > 0 ? (
                    detailsOrder.orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center p-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 mr-3 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity} × ₹{Number(item.price ?? 0).toFixed(2)}</p>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">₹{(((item.quantity ?? 0) as number) * ((item.price ?? 0) as number)).toFixed(2)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500">No items found for this order.</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-600">
                  <div>Payment Method: <span className="font-medium">{detailsOrder.paymentMethod}</span></div>
                  {detailsOrder.paymentType && (
                    <div>Payment Type: <span className="font-medium capitalize">{detailsOrder.paymentType}</span></div>
                  )}
                  <div>Status: <span className="font-medium capitalize">{detailsOrder.status}</span></div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(detailsOrder.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;