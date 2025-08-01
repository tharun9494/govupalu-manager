import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, Banknote, CheckCircle, Clock, TrendingUp, DollarSign, X, RefreshCw, ShoppingCart } from 'lucide-react';
import { useFirestore, Payment } from '../hooks/useFirestore';
import { format } from 'date-fns';
import TimeFilter, { TimeFilterType } from './TimeFilter';
import { filterByTimePeriod, getTimePeriodLabel, getTimePeriodStats } from '../utils/timeFilterUtils';

interface PaymentsProps {
  autoOpenModal?: boolean;
}

const Payments: React.FC<PaymentsProps> = ({ autoOpenModal = false }) => {
  const { payments, orders, addPayment, loading } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    customerName: '',
    amount: '',
    type: 'offline' as 'online' | 'offline',
    status: 'completed' as 'completed' | 'pending',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

  // Auto-open modal if prop is true
  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
    }
  }, [autoOpenModal]);

  // Show update indicator when payments change
  useEffect(() => {
    if (payments.length > 0) {
      setShowUpdateIndicator(true);
      const timer = setTimeout(() => setShowUpdateIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [payments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentData: Omit<Payment, 'id' | 'createdAt'> = {
        orderId: formData.orderId,
        customerName: formData.customerName,
        amount: parseFloat(formData.amount),
        type: formData.type,
        status: formData.status,
        date: formData.date
      };

      await addPayment(paymentData);
      setFormData({
        orderId: '',
        customerName: '',
        amount: '',
        type: 'offline',
        status: 'completed',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const handleOrderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = e.target.value;
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setFormData({
        ...formData,
        orderId,
        customerName: order.customerName,
        amount: order.totalAmount.toString()
      });
    } else {
      setFormData({
        ...formData,
        orderId: '',
        customerName: '',
        amount: ''
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading payments...</p>
        </div>
      </div>
    );
  }

  // Filter payments based on time period
  const filteredPayments = filterByTimePeriod(payments, timeFilter);
  const timeStats = getTimePeriodStats(payments, timeFilter);

  const completedPayments = filteredPayments.filter(payment => payment.status === 'completed');
  const pendingPayments = filteredPayments.filter(payment => payment.status === 'pending');
  const onlinePayments = completedPayments.filter(payment => payment.type === 'online');
  const offlinePayments = completedPayments.filter(payment => payment.type === 'offline');

  const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const onlineRevenue = onlinePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const offlineRevenue = offlinePayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Count automatic payments (those created from orders)
  const automaticPayments = filteredPayments.filter(payment => payment.orderId && payment.orderId !== '');
  const manualPayments = filteredPayments.filter(payment => !payment.orderId || payment.orderId === '');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Real-time Update Indicator */}
      {showUpdateIndicator && (
        <div className="fixed top-4 left-4 z-50 animate-slide-in">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-center">
              <RefreshCw className="w-4 h-4 text-primary-600 mr-2 animate-spin" />
              <span className="text-sm font-medium text-primary-800">Payments updated in real-time</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600 mt-2">Track and manage all payment transactions</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary mt-4 sm:mt-0 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Time Filter */}
      <div className="card p-4 sm:p-6 bg-primary-50 border border-primary-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-2">Time Period Filter</h3>
            <p className="text-xs sm:text-sm text-primary-700">
              Filter payments by time of day: {getTimePeriodLabel(timeFilter)}
            </p>
          </div>
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>
        
        {/* Time Period Statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Total Payments</div>
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
      <div className="card p-6 bg-success-50 border border-success-200">
        <div className="flex items-start">
          <div className="p-2 bg-success-100 rounded-lg mr-4">
            <CheckCircle className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-success-900 mb-2">Automatic Payment Creation</h3>
            <p className="text-success-700 mb-3">
              Payments are automatically created when orders are completed:
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-success-700">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>When an order status is changed to "completed"</span>
              </div>
              <div className="flex items-center text-sm text-success-700">
                <CreditCard className="w-4 h-4 mr-2" />
                <span>Payment amount matches the order total</span>
              </div>
              <div className="flex items-center text-sm text-success-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>All payment records are synchronized in real-time</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-success-100 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-success-800">Automatic Payments:</span>
                <span className="font-semibold text-success-900">{automaticPayments.length}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-success-800">Manual Payments:</span>
                <span className="font-semibold text-success-900">{manualPayments.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-primary-600 mt-1">+15% from last month</p>
          </div>
        </div>
        
        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-success-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Online Payments</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{onlineRevenue.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">{onlinePayments.length} transactions</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Offline Payments</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{offlineRevenue.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-purple-600 mt-1">{offlinePayments.length} transactions</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-warning-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending Payments</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingPayments.length}</p>
            <p className="text-xs sm:text-sm text-warning-600 mt-1">Awaiting confirmation</p>
          </div>
        </div>
      </div>

      {/* Payment Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Payment Summary */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Payment Breakdown</h3>
            <div className="p-2 bg-primary-50 rounded-lg">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-success-50 rounded-xl">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-success-600 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base font-medium text-gray-700">Online Payments</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm sm:text-base">₹{onlineRevenue.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500">{onlinePayments.length} transactions</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 sm:p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center">
                <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mr-2 sm:mr-3" />
                <span className="text-sm sm:text-base font-medium text-gray-700">Offline Payments</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm sm:text-base">₹{offlineRevenue.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-gray-500">{offlinePayments.length} transactions</p>
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

        {/* Recent Payments */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Payments</h3>
            <div className="p-2 bg-success-50 rounded-lg">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-success-600" />
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {filteredPayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center">
                  {payment.type === 'online' ? (
                    <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-success-600 mr-2 sm:mr-3" />
                  ) : (
                    <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-2 sm:mr-3" />
                  )}
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">{payment.customerName}</p>
                    <p className="text-xs text-gray-500">{format(new Date(payment.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <span className="font-bold text-success-600 text-xs sm:text-sm">₹{payment.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">All Payments</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete payment history and records</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-500 mt-2 sm:mt-0">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{filteredPayments.length} total payments</span>
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
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-2 sm:mr-3"></div>
                      <div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900">{payment.customerName}</span>
                        {payment.orderId && (
                          <div className="flex items-center mt-1">
                            <CheckCircle className="w-3 h-3 text-success-600 mr-1" />
                            <span className="text-xs text-success-600">Auto-generated</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{payment.orderId || 'Manual'}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-bold text-success-600">₹{payment.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {payment.type === 'online' ? (
                        <>
                          <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-success-600 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm text-success-800 bg-success-100 px-2 sm:px-3 py-1 rounded-full font-medium">Online</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm text-purple-800 bg-purple-100 px-2 sm:px-3 py-1 rounded-full font-medium">Offline</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {payment.status === 'completed' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success-600 mr-2" />
                          <span className="text-sm text-success-800 bg-success-100 px-3 py-1 rounded-full font-medium">Completed</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-warning-600 mr-2" />
                          <span className="text-sm text-warning-800 bg-warning-100 px-3 py-1 rounded-full font-medium">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{format(new Date(payment.date), 'MMM dd, yyyy')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No payments recorded</h3>
            <p className="text-sm text-gray-500 mb-6">Start by recording your first payment.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Payment</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full p-4 sm:p-6 animate-scale-in max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Record Payment</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Select Order</label>
                <select
                  value={formData.orderId}
                  onChange={handleOrderSelect}
                  className="input-field"
                >
                  <option value="">Select an order or enter manually</option>
                  {orders.filter(order => order.status === 'completed').map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.customerName} - ₹{order.totalAmount} ({format(new Date(order.orderDate), 'MMM dd')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="offline">Offline (Cash)</option>
                  <option value="online">Online (Digital)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="input-field"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div className="flex space-x-3 pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 text-xs sm:text-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;