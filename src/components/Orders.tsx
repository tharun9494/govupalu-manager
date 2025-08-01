import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Phone, Calendar, CheckCircle, XCircle, Clock, 
  ShoppingCart, Users, TrendingUp, X, Package, CreditCard, AlertTriangle, 
  Info, Loader2, AlertCircle, Eye, EyeOff, Filter, Search, RefreshCw
} from 'lucide-react';
import { useFirestore, Order } from '../hooks/useFirestore';
import { format, isToday, parseISO, startOfDay, endOfDay, isAfter, isBefore, addDays } from 'date-fns';
import TimeFilter, { TimeFilterType } from './TimeFilter';
import { filterByTimePeriod, getTimePeriodLabel, getTimePeriodStats } from '../utils/timeFilterUtils';

interface OrdersProps {
  autoOpenModal?: boolean;
}

interface DailyStockInfo {
  totalReceived: number;
  totalSold: number;
  availableStock: number;
  lastUpdated: string;
  stockStatus: 'sufficient' | 'low' | 'out';
}

interface FormValidationErrors {
  customerName?: string;
  customerPhone?: string;
  quantity?: string;
  pricePerLiter?: string;
  orderDate?: string;
  deliveryDate?: string;
  general?: string;
}

interface OrderFilters {
  status: 'all' | 'pending' | 'completed' | 'cancelled';
  searchTerm: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

const Orders: React.FC<OrdersProps> = ({ autoOpenModal = false }) => {
  const { orders, addOrder, updateOrder, deleteOrder, loading, inventory } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [formValidationErrors, setFormValidationErrors] = useState<FormValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [dailyStockInfo, setDailyStockInfo] = useState<DailyStockInfo>({
    totalReceived: 0,
    totalSold: 0,
    availableStock: 0,
    lastUpdated: format(new Date(), 'yyyy-MM-dd'),
    stockStatus: 'sufficient'
  });

  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    searchTerm: '',
    dateRange: 'all',
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

  // Calculate daily stock information
  useEffect(() => {
    if (inventory && inventory.length > 0) {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get today's inventory records
      const todaysInventory = inventory.filter(item => item.date === today);
      
      // Get today's orders (completed orders that affect today's stock)
      const todaysOrders = orders.filter(order => 
        order.status === 'completed' && 
        order.orderDate === today
      );

      const totalReceived = todaysInventory.reduce((sum, item) => sum + item.stockReceived, 0);
      const totalSold = todaysOrders.reduce((sum, order) => sum + order.quantity, 0);
      const availableStock = totalReceived - totalSold;

      // Determine stock status
      let stockStatus: 'sufficient' | 'low' | 'out';
      if (availableStock <= 0) {
        stockStatus = 'out';
      } else if (availableStock < 10) {
        stockStatus = 'low';
      } else {
        stockStatus = 'sufficient';
      }

      setDailyStockInfo({
        totalReceived,
        totalSold,
        availableStock: Math.max(0, availableStock),
        lastUpdated: today,
        stockStatus
      });


    }
  }, [inventory, orders]);

  // Utility function to get today's available stock
  const getTodaysAvailableStock = useCallback((): number => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Get today's inventory records
    const todaysInventory = inventory.filter(item => item.date === today);
    
    // Get today's completed orders
    const todaysOrders = orders.filter(order => 
      order.status === 'completed' && 
      order.orderDate === today
    );

    const totalReceived = todaysInventory.reduce((sum, item) => sum + item.stockReceived, 0);
    const totalSold = todaysOrders.reduce((sum, order) => sum + order.quantity, 0);
    
    return Math.max(0, totalReceived - totalSold);
  }, [inventory, orders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormValidationErrors({});
    setIsSubmitting(true);

    // Enhanced validation
    const validationErrors: FormValidationErrors = {};

    // Required field validation
    if (!formData.customerName.trim()) {
      validationErrors.customerName = 'Customer name is required';
    } else if (formData.customerName.trim().length < 2) {
      validationErrors.customerName = 'Customer name must be at least 2 characters';
    }

    if (!formData.customerPhone.trim()) {
      validationErrors.customerPhone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.customerPhone.replace(/\s/g, ''))) {
      validationErrors.customerPhone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.quantity) {
      validationErrors.quantity = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        validationErrors.quantity = 'Quantity must be a positive number';
      } else if (quantity > 1000) {
        validationErrors.quantity = 'Quantity cannot exceed 1000 liters';
      }
    }

    if (!formData.pricePerLiter) {
      validationErrors.pricePerLiter = 'Price per liter is required';
    } else {
      const price = parseFloat(formData.pricePerLiter);
      if (isNaN(price) || price <= 0) {
        validationErrors.pricePerLiter = 'Price must be a positive number';
      } else if (price > 1000) {
        validationErrors.pricePerLiter = 'Price per liter cannot exceed ₹1000';
      }
    }

    // Date validation
    if (!formData.orderDate) {
      validationErrors.orderDate = 'Order date is required';
    } else {
      const orderDate = parseISO(formData.orderDate);
      const today = startOfDay(new Date());
      if (isBefore(orderDate, today)) {
        validationErrors.orderDate = 'Order date cannot be in the past';
      }
    }

    if (!formData.deliveryDate) {
      validationErrors.deliveryDate = 'Delivery date is required';
    } else {
      const deliveryDate = parseISO(formData.deliveryDate);
      const orderDate = formData.orderDate ? parseISO(formData.orderDate) : new Date();
      const maxDeliveryDate = addDays(orderDate, 7);
      
      if (isBefore(deliveryDate, orderDate)) {
        validationErrors.deliveryDate = 'Delivery date cannot be before order date';
      } else if (isAfter(deliveryDate, maxDeliveryDate)) {
        validationErrors.deliveryDate = 'Delivery date cannot be more than 7 days after order date';
      }
    }

    // Stock validation
    const todaysAvailableStock = getTodaysAvailableStock();
    const isOrderForToday = formData.orderDate === format(new Date(), 'yyyy-MM-dd');
    
    if (formData.quantity && todaysAvailableStock > 0) {
      const quantity = parseFloat(formData.quantity);
      if (isOrderForToday && quantity > todaysAvailableStock) {
        validationErrors.quantity = `Insufficient stock. Only ${todaysAvailableStock}L available for today`;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormValidationErrors(validationErrors);
      setFormError('Please fix the validation errors below');
      return;
    }

    try {
      const quantity = parseFloat(formData.quantity);
      const pricePerLiter = parseFloat(formData.pricePerLiter);
      const totalAmount = quantity * pricePerLiter;

      const orderData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
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
      setFormError('Failed to save order. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
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
    setFormError('');
    setFormValidationErrors({});
    setIsSubmitting(false);
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
    setFormError('');
    setFormValidationErrors({});
    setIsSubmitting(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone and will also update the inventory records.')) {
      try {
        await deleteOrder(orderId);
        setSuccessMessage('Order deleted successfully! Inventory has been automatically updated.');
        setShowSuccessMessage(true);
      } catch (error) {
        console.error('Error deleting order:', error);
        setFormError('Failed to delete order. Please check your connection and try again.');
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      await updateOrder(orderId, { status: newStatus });
      if (newStatus === 'completed') {
        setSuccessMessage('Order marked as completed! Payment record has been automatically created.');
        setShowSuccessMessage(true);
      } else if (newStatus === 'cancelled') {
        setSuccessMessage('Order cancelled successfully! Inventory has been automatically updated.');
        setShowSuccessMessage(true);
      } else {
        setSuccessMessage('Order status updated successfully!');
        setShowSuccessMessage(true);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setFormError('Failed to update order status. Please check your connection and try again.');
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
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          <p className="text-gray-500 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Enhanced filtering and search
  const filteredOrders = useMemo(() => {
    let filtered = filterByTimePeriod(orders, timeFilter);
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    // Apply search filter
    if (filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(searchTerm) ||
        order.customerPhone.includes(searchTerm) ||
        order.id?.includes(searchTerm)
      );
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const today = new Date();
      const startOfToday = startOfDay(today);
      
      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(order => 
            order.orderDate === format(today, 'yyyy-MM-dd')
          );
          break;
        case 'week':
          const weekAgo = addDays(today, -7);
          filtered = filtered.filter(order => 
            isAfter(parseISO(order.orderDate), weekAgo) || 
            isToday(parseISO(order.orderDate))
          );
          break;
        case 'month':
          const monthAgo = addDays(today, -30);
          filtered = filtered.filter(order => 
            isAfter(parseISO(order.orderDate), monthAgo) || 
            isToday(parseISO(order.orderDate))
          );
          break;
      }
    }
    
    return filtered;
  }, [orders, timeFilter, filters]);
  
  const timeStats = getTimePeriodStats(orders, timeFilter);

  // Today's orders
  const todaysOrders = orders.filter(order => order.orderDate === format(new Date(), 'yyyy-MM-dd'));
  const todaysPendingOrders = todaysOrders.filter(order => order.status === 'pending');
  const todaysCompletedOrders = todaysOrders.filter(order => order.status === 'completed');
  const todaysRevenue = todaysCompletedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  const pendingOrders = filteredOrders.filter(order => order.status === 'pending');
  const completedOrders = filteredOrders.filter(order => order.status === 'completed');
  const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled');
  const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 shadow-lg max-w-md">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
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
                <div className="mt-2 text-xs text-success-600">
                  <span>✓ Real-time synchronization across all modules</span>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="ml-3 text-success-400 hover:text-success-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {formError && !isModalOpen && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 shadow-lg max-w-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-danger-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger-800">Operation Failed</p>
                <p className="text-xs text-danger-700 mt-1">{formError}</p>
                <div className="mt-2 text-xs text-danger-600">
                  <span>Please check your connection and try again</span>
                </div>
              </div>
              <button
                onClick={() => setFormError('')}
                className="ml-3 text-danger-400 hover:text-danger-600 transition-colors"
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage customer orders and deliveries</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary mt-3 sm:mt-0 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Order</span>
        </button>
      </div>

      {/* Today's Stock Information */}
      <div className="card p-4 sm:p-6 bg-primary-50 border border-primary-200">
        <div className="flex items-start">
          <div className="p-2 bg-primary-100 rounded-lg mr-3 sm:mr-4">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-2">Today's Milk Stock</h3>
            <p className="text-xs sm:text-sm text-primary-700 mb-3">
              Orders can only use today's available milk stock. Stock is updated based on today's inventory and completed orders.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-primary-100">
                <div className="text-xs text-primary-600 font-medium">Total Received</div>
                <div className="text-lg font-bold text-primary-900">{dailyStockInfo.totalReceived}L</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-primary-100">
                <div className="text-xs text-primary-600 font-medium">Total Sold</div>
                <div className="text-lg font-bold text-primary-900">{dailyStockInfo.totalSold}L</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-primary-100">
                <div className="text-xs text-primary-600 font-medium">Available</div>
                <div className={`text-lg font-bold ${dailyStockInfo.availableStock < 10 ? 'text-danger-600' : 'text-primary-900'}`}>
                  {dailyStockInfo.availableStock}L
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-primary-100">
                <div className="text-xs text-primary-600 font-medium">Last Updated</div>
                <div className="text-sm font-medium text-primary-900">
                  {format(new Date(dailyStockInfo.lastUpdated), 'MMM dd')}
                </div>
              </div>
            </div>

            {/* Stock Status Alerts */}
            {dailyStockInfo.stockStatus === 'low' && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-warning-600 mr-2" />
                  <div>
                    <span className="text-sm font-medium text-warning-800">
                      Low stock alert: Only {dailyStockInfo.availableStock}L remaining for today
                    </span>
                    <p className="text-xs text-warning-700 mt-1">
                      Consider adding more inventory or managing orders carefully
                    </p>
                  </div>
                </div>
              </div>
            )}

            {dailyStockInfo.stockStatus === 'out' && (
              <div className="mt-3 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 text-danger-600 mr-2" />
                  <div>
                    <span className="text-sm font-medium text-danger-800">
                      No stock available for today
                    </span>
                    <p className="text-xs text-danger-700 mt-1">
                      Please add inventory for today before creating orders
                    </p>
                  </div>
                </div>
              </div>
            )}

            {dailyStockInfo.stockStatus === 'sufficient' && dailyStockInfo.availableStock > 0 && (
              <div className="mt-3 p-3 bg-success-50 border border-success-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                  <div>
                    <span className="text-sm font-medium text-success-800">
                      Stock available: {dailyStockInfo.availableStock}L ready for orders
                    </span>
                    <p className="text-xs text-success-700 mt-1">
                      You can create new orders for today
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="card p-4 sm:p-6 bg-primary-50 border border-primary-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-2">Time Period Filter</h3>
            <p className="text-xs sm:text-sm text-primary-700">
              Filter orders by time of day: {getTimePeriodLabel(timeFilter)}
            </p>
          </div>
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>
        
        {/* Time Period Statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Total Orders</div>
            <div className="text-lg font-bold text-primary-900">{timeStats.total}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Morning</div>
            <div className="text-lg font-bold text-primary-900">{timeStats.morning}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Evening</div>
            <div className="text-lg font-bold text-primary-900">{timeStats.evening}</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Night</div>
            <div className="text-lg font-bold text-primary-900">{timeStats.night}</div>
          </div>
        </div>
      </div>

      {/* Auto-Update Info Card */}
      <div className="card p-4 sm:p-6 bg-primary-50 border border-primary-200">
        <div className="flex items-start">
          <div className="p-2 bg-primary-100 rounded-lg mr-3 sm:mr-4">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-1 sm:mb-2">Automatic Updates</h3>
            <p className="text-xs sm:text-sm text-primary-700 mb-2 sm:mb-3">
              When you create or update orders, the system automatically:
            </p>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center text-xs sm:text-sm text-primary-700">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Updates inventory stock levels</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-primary-700">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Creates payment records when orders are completed</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-primary-700">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Maintains real-time synchronization across all modules</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-warning-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Today's Pending</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{todaysPendingOrders.length}</p>
            <p className="text-xs sm:text-sm text-warning-600 mt-1">Awaiting delivery</p>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-success-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Today's Completed</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{todaysCompletedOrders.length}</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">Successfully delivered</p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-info-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-info-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-info-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Today's Total Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{todaysOrders.length}</p>
            <p className="text-xs sm:text-sm text-info-600 mt-1">All orders for today</p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Today's Revenue</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">₹{todaysRevenue.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-primary-600 mt-1">From today's orders</p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-danger-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-danger-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-danger-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Cancelled Orders</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{cancelledOrders.length}</p>
            <p className="text-xs sm:text-sm text-danger-600 mt-1">Cancelled by customer</p>
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
              <span className="text-xs sm:text-sm">{filteredOrders.length} total orders</span>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-25">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or order ID..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="sm:w-48">
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => setFilters({ status: 'all', searchTerm: '', dateRange: 'all' })}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                <p className="text-gray-500 font-medium">Loading orders...</p>
              </div>
            </div>
          ) : (
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
              {filteredOrders.map((order) => (
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
          )}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {filters.searchTerm || filters.status !== 'all' || filters.dateRange !== 'all' 
                ? 'No orders match your filters' 
                : 'No orders yet'
              }
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {filters.searchTerm || filters.status !== 'all' || filters.dateRange !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your first order.'
              }
            </p>
            {filters.searchTerm || filters.status !== 'all' || filters.dateRange !== 'all' ? (
              <button
                onClick={() => setFilters({ status: 'all', searchTerm: '', dateRange: 'all' })}
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Clear Filters</span>
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Order</span>
              </button>
            )}
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
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-danger-800">{formError}</p>
                      {Object.keys(formValidationErrors).length > 0 && (
                        <ul className="mt-2 text-xs text-danger-700 space-y-1">
                          {Object.entries(formValidationErrors).map(([field, error]) => (
                            <li key={field} className="flex items-center">
                              <span className="w-1 h-1 bg-danger-600 rounded-full mr-2"></span>
                              <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span> {error}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Info Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Customer Info</div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Customer Name <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className={`input-field ${formValidationErrors.customerName ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                      placeholder="Enter customer name"
                    />
                    {formValidationErrors.customerName && (
                      <p className="text-xs text-danger-600 mt-1">{formValidationErrors.customerName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      className={`input-field ${formValidationErrors.customerPhone ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                    />
                    {formValidationErrors.customerPhone && (
                      <p className="text-xs text-danger-600 mt-1">{formValidationErrors.customerPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Details Section */}
              <div>
                <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">Order Details</div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity (Liters) <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                      min="0.1"
                      max="1000"
                      step="0.1"
                      className={`input-field ${formValidationErrors.quantity ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                      placeholder="Enter quantity in liters"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Available today: <span className="font-medium">{getTodaysAvailableStock()}L</span>
                      {formValidationErrors.quantity && (
                        <span className="text-danger-600 ml-2">{formValidationErrors.quantity}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price per Liter (₹) <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerLiter}
                      onChange={(e) => setFormData({ ...formData, pricePerLiter: e.target.value })}
                      required
                      min="0.01"
                      max="1000"
                      step="0.01"
                      className={`input-field ${formValidationErrors.pricePerLiter ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                      placeholder="Enter price per liter"
                    />
                    {formValidationErrors.pricePerLiter && (
                      <p className="text-xs text-danger-600 mt-1">{formValidationErrors.pricePerLiter}</p>
                    )}
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Order Date <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      required
                      className={`input-field ${formValidationErrors.orderDate ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Orders can only be placed for today's available stock
                      {formValidationErrors.orderDate && (
                        <span className="text-danger-600 ml-2">{formValidationErrors.orderDate}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Delivery Date <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      min={formData.orderDate}
                      max={format(addDays(parseISO(formData.orderDate), 7), 'yyyy-MM-dd')}
                      required
                      className={`input-field ${formValidationErrors.deliveryDate ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : ''}`}
                    />
                    {formValidationErrors.deliveryDate && (
                      <p className="text-xs text-danger-600 mt-1">{formValidationErrors.deliveryDate}</p>
                    )}
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

              {/* Stock Availability & Total Amount Preview */}
              <div className="space-y-3">
                {/* Stock Availability */}
                <div className={`p-3 sm:p-4 rounded-xl border ${
                  dailyStockInfo.stockStatus === 'out'
                    ? 'bg-danger-50 border-danger-200' 
                    : dailyStockInfo.stockStatus === 'low'
                    ? 'bg-warning-50 border-warning-200'
                    : 'bg-success-50 border-success-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {dailyStockInfo.stockStatus === 'out' ? (
                        <XCircle className="w-4 h-4 text-danger-600 mr-2" />
                      ) : dailyStockInfo.stockStatus === 'low' ? (
                        <AlertTriangle className="w-4 h-4 text-warning-600 mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                      )}
                      <span className="text-xs sm:text-sm font-medium">
                        {dailyStockInfo.stockStatus === 'out'
                          ? 'No stock available for today'
                          : dailyStockInfo.stockStatus === 'low'
                          ? 'Low stock available'
                          : 'Stock available for today'
                        }
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${
                      dailyStockInfo.stockStatus === 'out'
                        ? 'text-danger-600' 
                        : dailyStockInfo.stockStatus === 'low'
                        ? 'text-warning-600'
                        : 'text-success-600'
                    }`}>
                      {dailyStockInfo.availableStock}L
                    </span>
                  </div>
                  {dailyStockInfo.stockStatus === 'low' && (
                    <p className="text-xs text-warning-700 mt-2">
                      Consider adding more inventory or managing orders carefully
                    </p>
                  )}
                  {dailyStockInfo.stockStatus === 'out' && (
                    <p className="text-xs text-danger-700 mt-2">
                      Please add inventory for today before creating orders
                    </p>
                  )}
                </div>

                {/* Total Amount Preview */}
                {formData.quantity && formData.pricePerLiter && (
                  <div className="bg-primary-50 p-3 sm:p-4 rounded-xl border border-primary-200">
                    <p className="text-xs sm:text-sm text-primary-700">
                      Total Amount: <span className="font-bold text-base sm:text-lg">₹{(parseFloat(formData.quantity) * parseFloat(formData.pricePerLiter)).toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="btn-secondary flex-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 text-xs sm:text-sm font-semibold py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingOrder ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingOrder ? 'Update Order' : 'Add Order'
                  )}
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