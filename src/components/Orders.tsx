import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Calendar, CheckCircle, XCircle, Clock, ShoppingCart, Users, TrendingUp, X, Package, CreditCard } from 'lucide-react';
import { useFirestore, Order } from '../hooks/useFirestore';
import { format } from 'date-fns';

interface OrdersProps {
  autoOpenModal?: boolean;
}

const Orders: React.FC<OrdersProps> = ({ autoOpenModal = false }) => {
  const { orders, addOrder, updateOrder, deleteOrder, loading, inventory } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    quantity: '',
    pricePerLiter: '',
    orderDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    paymentType: 'online' as 'online' | 'offline',
  });

  // Auto-open modal if prop is true
  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
    }
  }, [autoOpenModal]);

  // Show success message for 3 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const quantity = parseFloat(formData.quantity);
      const pricePerLiter = parseFloat(formData.pricePerLiter);
      const totalAmount = quantity * pricePerLiter;

      // Calculate current stock (sum of stockRemaining in inventory)
      const currentStock = inventory && inventory.length > 0
        ? inventory.reduce((sum, item) => sum + (item.stockRemaining || 0), 0)
        : 0;

      if (quantity > currentStock) {
        setFormError(`Not enough stock. Only ${currentStock} liters available.`);
        return;
      }

      const orderData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        quantity,
        pricePerLiter,
        totalAmount,
        status: formData.status,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        paymentType: formData.paymentType,
      };

      if (editingOrder) {
        await updateOrder(editingOrder.id!, orderData);
        setSuccessMessage('Order updated successfully! Inventory and payment records have been automatically updated.');
      } else {
        await addOrder(orderData);
        setSuccessMessage('Order created successfully! Inventory has been automatically updated and payment will be created when order is completed.');
      }

      setShowSuccessMessage(true);
      resetForm();
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error saving order. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      quantity: '',
      pricePerLiter: '',
      orderDate: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      paymentType: 'online',
    });
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      quantity: order.quantity.toString(),
      pricePerLiter: order.pricePerLiter.toString(),
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      status: order.status,
      paymentType: (order as any).paymentType || 'online',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This will also update the inventory records.')) {
      try {
        await deleteOrder(orderId);
        setSuccessMessage('Order deleted successfully! Inventory has been automatically updated.');
        setShowSuccessMessage(true);
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order. Please try again.');
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      await updateOrder(orderId, { status: newStatus });
      if (newStatus === 'completed') {
        setSuccessMessage('Order marked as completed! Payment record has been automatically created.');
        setShowSuccessMessage(true);
      } else {
        setSuccessMessage('Order status updated successfully!');
        setShowSuccessMessage(true);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-danger-600" />;
      default:
        return <Clock className="w-4 h-4 text-warning-600" />;
    }
  };

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
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 shadow-lg max-w-md">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success-800">{successMessage}</p>
                <div className="flex items-center mt-2 space-x-4 text-xs text-success-600">
                  <div className="flex items-center">
                    <Package className="w-3 h-3 mr-1" />
                    <span>Inventory Updated</span>
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="w-3 h-3 mr-1" />
                    <span>Payment Created</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-3 text-success-400 hover:text-success-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Auto-Update Info Card */}
      <div className="card p-6 bg-primary-50 border border-primary-200">
        <div className="flex items-start">
          <div className="p-2 bg-primary-100 rounded-lg mr-4">
            <CheckCircle className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-900 mb-2">Automatic Updates</h3>
            <p className="text-primary-700 mb-3">
              When you create or update orders, the system automatically:
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-primary-700">
                <Package className="w-4 h-4 mr-2" />
                <span>Updates inventory stock levels</span>
              </div>
              <div className="flex items-center text-sm text-primary-700">
                <CreditCard className="w-4 h-4 mr-2" />
                <span>Creates payment records when orders are completed</span>
              </div>
              <div className="flex items-center text-sm text-primary-700">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>Maintains real-time synchronization across all modules</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-warning-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending Orders</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingOrders.length}</p>
            <p className="text-xs sm:text-sm text-warning-600 mt-1">Awaiting delivery</p>
          </div>
        </div>
        
        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Completed Orders</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{completedOrders.length}</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">Successfully delivered</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-danger-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-danger-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-danger-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Cancelled Orders</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{cancelledOrders.length}</p>
            <p className="text-xs sm:text-sm text-danger-600 mt-1">Cancelled by customer</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-primary-600 mt-1">From completed orders</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Orders</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete order history and management</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-500 mt-2 sm:mt-0">
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{orders.length} total orders</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-2 sm:mr-3"></div>
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{order.customerName}</div>
                        <div className="text-xs sm:text-sm text-gray-500 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {order.customerPhone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-medium text-gray-900">{order.quantity}L</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-success-600">₹{order.totalAmount.toFixed(2)}</span>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{format(new Date(order.orderDate), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{format(new Date(order.deliveryDate), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id!, e.target.value as any)}
                      className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)} focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handleEdit(order)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id!)}
                        className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-sm text-gray-500 mb-6">Get started by creating your first order.</p>
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
          <div className="card max-w-md w-full p-4 sm:p-6 animate-scale-in max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {editingOrder ? 'Edit Order' : 'Add New Order'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            {/* Note about optional fields */}
            <div className="mb-4 text-xs text-gray-500">Fields marked optional can be left blank.</div>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-100">
              {formError && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 rounded p-2 text-xs mb-2">
                  {formError}
                </div>
              )}

              {/* Customer Info Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Customer Info</div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name <span className="text-xs text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="input-field"
                      placeholder="Enter customer name (optional)"
                    />
                    <div className="text-xs text-gray-400 mt-1">You can leave this blank if not needed.</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number <span className="text-xs text-gray-400">(optional)</span></label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className="input-field"
                      placeholder="Enter phone number (optional)"
                    />
                    <div className="text-xs text-gray-400 mt-1">You can leave this blank if not needed.</div>
                  </div>
                </div>
              </div>

              {/* Order Details Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Order Details</div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity (Liters)</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="0"
                      step="0.1"
                      className="input-field"
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Price per Liter (₹)</label>
                    <input
                      type="number"
                      value={formData.pricePerLiter}
                      onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="input-field"
                      placeholder="Enter price per liter"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Type</label>
                    <select
                      value={formData.paymentType}
                      onChange={e => setFormData({ ...formData, paymentType: e.target.value as 'online' | 'offline' })}
                      className="input-field"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Dates</div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Order Date</label>
                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      required
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Status</div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="pending"
                      checked={formData.status === 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'cancelled' })}
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">Pending</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="completed"
                      checked={formData.status === 'completed'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'cancelled' })}
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">Completed</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="cancelled"
                      checked={formData.status === 'cancelled'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'cancelled' })}
                      className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-xs sm:text-sm text-gray-700">Cancelled</span>
                  </label>
                </div>
              </div>

              {/* Total Amount Preview */}
              {formData.quantity && formData.pricePerLiter && (
                <div className="bg-primary-50 p-3 sm:p-4 rounded-xl border border-primary-200">
                  <p className="text-xs sm:text-sm text-primary-700">
                    Total Amount: <span className="font-bold text-base sm:text-lg">₹{(parseFloat(formData.quantity) * parseFloat(formData.pricePerLiter)).toFixed(2)}</span>
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 text-xs sm:text-sm font-semibold py-2"
                >
                  {editingOrder ? 'Update Order' : 'Add Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;