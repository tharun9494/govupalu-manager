import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Phone, Calendar, CheckCircle, XCircle, Clock, 
  Users, TrendingUp, X, Package, CreditCard, AlertTriangle, 
  Info, Loader2, AlertCircle, Eye, EyeOff, Filter, Search, RefreshCw,
  User, MapPin, CalendarDays, Repeat, DollarSign, ExternalLink, Map
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { format, isToday, parseISO, startOfDay, endOfDay, isAfter, isBefore, addDays, addMonths } from 'date-fns';
import TimeFilter, { TimeFilterType } from './TimeFilter';
import { filterByTimePeriod, getTimePeriodLabel, getTimePeriodStats } from '../utils/timeFilterUtils';

interface SubscriptionsProps {
  autoOpenModal?: boolean;
}

interface Subscription {
  id?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  mapLink?: string;
  quantity: number;
  pricePerLiter: number;
  totalAmount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  deliveryDays: string[];
  startDate: string;
  endDate?: string;
  status: 'active' | 'paused' | 'cancelled';
  paymentType: 'online' | 'offline';
  paymentStatus: 'paid' | 'pending' | 'overdue' | 'failed';
  autoRenew: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const Subscriptions: React.FC<SubscriptionsProps> = ({ autoOpenModal = false }) => {
  const { subscriptions, loading, addSubscription, updateSubscription, deleteSubscription } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    mapLink: '',
    quantity: '',
    pricePerLiter: '50',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    deliveryDays: [] as string[],
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    status: 'active' as 'active' | 'paused' | 'cancelled',
    paymentType: 'online' as 'online' | 'offline',
    paymentStatus: 'pending' as 'paid' | 'pending' | 'overdue' | 'failed',
    autoRenew: true,
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');

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
    setIsSubmitting(true);
    
    try {
      const subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerAddress: formData.customerAddress.trim(),
        mapLink: formData.mapLink.trim() || undefined,
        quantity: parseFloat(formData.quantity),
        pricePerLiter: parseFloat(formData.pricePerLiter),
        totalAmount: parseFloat(formData.quantity) * parseFloat(formData.pricePerLiter),
        frequency: formData.frequency,
        deliveryDays: formData.frequency === 'daily' 
          ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          : formData.deliveryDays,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        status: formData.status,
        paymentType: formData.paymentType,
        paymentStatus: formData.paymentStatus,
        autoRenew: formData.autoRenew,
      };

      if (editingSubscription) {
        await updateSubscription(editingSubscription.id!, subscriptionData);
        setSuccessMessage('Subscription updated successfully!');
      } else {
        await addSubscription(subscriptionData);
        setSuccessMessage('Subscription added successfully!');
      }

      setShowSuccessMessage(true);
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving subscription:', error);
      setFormError('Failed to save subscription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      mapLink: '',
      quantity: '',
      pricePerLiter: '50',
      frequency: 'daily',
      deliveryDays: [],
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      status: 'active',
      paymentType: 'online',
      paymentStatus: 'pending',
      autoRenew: true,
    });
    setEditingSubscription(null);
    setFormError('');
  };

  const handleEdit = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      customerName: subscription.customerName,
      customerPhone: subscription.customerPhone,
      customerAddress: subscription.customerAddress,
      mapLink: subscription.mapLink || '',
      quantity: subscription.quantity.toString(),
      pricePerLiter: subscription.pricePerLiter.toString(),
      frequency: subscription.frequency,
      deliveryDays: subscription.deliveryDays,
      startDate: subscription.startDate,
      endDate: subscription.endDate || '',
      status: subscription.status,
      paymentType: subscription.paymentType,
      paymentStatus: subscription.paymentStatus || 'pending',
      autoRenew: subscription.autoRenew,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (subscriptionId: string) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await deleteSubscription(subscriptionId);
        setSuccessMessage('Subscription deleted successfully!');
        setShowSuccessMessage(true);
      } catch (error) {
        console.error('Error deleting subscription:', error);
        setFormError('Failed to delete subscription. Please try again.');
      }
    }
  };

  const handleStatusUpdate = async (subscriptionId: string, newStatus: 'active' | 'paused' | 'cancelled') => {
    try {
      await updateSubscription(subscriptionId, { status: newStatus });
      setSuccessMessage(`Subscription ${newStatus} successfully!`);
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      setFormError('Failed to update subscription status. Please try again.');
    }
  };

  const handlePaymentStatusUpdate = async (subscriptionId: string, newPaymentStatus: 'paid' | 'pending' | 'overdue' | 'failed') => {
    try {
      await updateSubscription(subscriptionId, { paymentStatus: newPaymentStatus });
      setSuccessMessage(`Payment status updated to ${newPaymentStatus}!`);
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setFormError('Failed to update payment status. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-success-600 bg-success-50 border-success-200';
      case 'paused': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'cancelled': return 'text-danger-600 bg-danger-50 border-danger-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-success-600 bg-success-50 border-success-200';
      case 'pending': return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'overdue': return 'text-danger-600 bg-danger-50 border-danger-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return <Calendar className="w-4 h-4" />;
      case 'weekly': return <CalendarDays className="w-4 h-4" />;
      case 'monthly': return <Repeat className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'text-primary-600 bg-primary-50 border-primary-200';
      case 'weekly': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'monthly': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const stats = useMemo(() => {
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
    const pausedSubscriptions = subscriptions.filter(sub => sub.status === 'paused').length;
    const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled').length;
    const totalRevenue = subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + sub.totalAmount, 0);
    const paidSubscriptions = subscriptions.filter(sub => sub.paymentStatus === 'paid').length;
    const pendingPayments = subscriptions.filter(sub => sub.paymentStatus === 'pending').length;
    const overduePayments = subscriptions.filter(sub => sub.paymentStatus === 'overdue').length;

    return {
      total: totalSubscriptions,
      active: activeSubscriptions,
      paused: pausedSubscriptions,
      cancelled: cancelledSubscriptions,
      revenue: totalRevenue,
      paid: paidSubscriptions,
      pending: pendingPayments,
      overdue: overduePayments,
    };
  }, [subscriptions]);

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-success-600" />
              <span className="text-success-800 font-medium">{successMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage customer subscriptions and recurring orders</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-success-600">{stats.active}</p>
            </div>
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-success-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-success-600">{stats.paid}</p>
            </div>
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-success-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-danger-600">{stats.overdue}</p>
            </div>
            <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-danger-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paused</p>
              <p className="text-2xl font-bold text-warning-600">{stats.paused}</p>
            </div>
            <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-warning-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-danger-600">{stats.cancelled}</p>
            </div>
            <div className="w-8 h-8 bg-danger-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-danger-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-purple-600">₹{stats.revenue}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-lg shadow-soft border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first subscription.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Subscription
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{subscription.customerName}</div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1" />
                          {subscription.customerPhone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {subscription.customerAddress}
                        </div>
                        {subscription.mapLink && (
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <Map className="w-3 h-3 mr-1" />
                            <a 
                              href={subscription.mapLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 flex items-center"
                            >
                              View on Map
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Package className="w-3 h-3 mr-1" />
                          {subscription.quantity}L per delivery
                        </div>
                        <div className="flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          Started: {format(parseISO(subscription.startDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getFrequencyColor(subscription.frequency)}`}>
                          {getFrequencyIcon(subscription.frequency)}
                          <span className="ml-1 capitalize">{subscription.frequency}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(subscription.status)}`}>
                          {getStatusIcon(subscription.status)}
                          <span className="ml-1 capitalize">{subscription.status}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPaymentStatusColor(subscription.paymentStatus || 'pending')}`}>
                          {getPaymentStatusIcon(subscription.paymentStatus || 'pending')}
                          <span className="ml-1 capitalize">{subscription.paymentStatus || 'pending'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">₹{subscription.totalAmount}</div>
                        <div className="text-gray-500">₹{subscription.pricePerLiter}/L</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="Edit subscription"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        {/* Payment Status Actions */}
                        <div className="relative group">
                          <button
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Update payment status"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => handlePaymentStatusUpdate(subscription.id!, 'paid')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <CheckCircle className="w-4 h-4 mr-2 text-success-600" />
                                Mark as Paid
                              </button>
                              <button
                                onClick={() => handlePaymentStatusUpdate(subscription.id!, 'pending')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Clock className="w-4 h-4 mr-2 text-warning-600" />
                                Mark as Pending
                              </button>
                              <button
                                onClick={() => handlePaymentStatusUpdate(subscription.id!, 'overdue')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2 text-danger-600" />
                                Mark as Overdue
                              </button>
                              <button
                                onClick={() => handlePaymentStatusUpdate(subscription.id!, 'failed')}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                Mark as Failed
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {subscription.status === 'active' && (
                          <button
                            onClick={() => handleStatusUpdate(subscription.id!, 'paused')}
                            className="p-1 text-gray-400 hover:text-warning-600 transition-colors"
                            title="Pause subscription"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        
                        {subscription.status === 'paused' && (
                          <button
                            onClick={() => handleStatusUpdate(subscription.id!, 'active')}
                            className="p-1 text-gray-400 hover:text-success-600 transition-colors"
                            title="Activate subscription"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(subscription.id!)}
                          className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                          title="Delete subscription"
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
        )}
      </div>

      {/* Add/Edit Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-danger-600" />
                    <span className="text-danger-800">{formError}</span>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={formData.customerAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter complete address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Map Link (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={formData.mapLink}
                      onChange={(e) => setFormData(prev => ({ ...prev, mapLink: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://maps.google.com/..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const address = encodeURIComponent(formData.customerAddress);
                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
                        setFormData(prev => ({ ...prev, mapLink: mapUrl }));
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
                      title="Generate map link from address"
                    >
                      <Map className="w-4 h-4" />
                      <span className="text-sm">Generate</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Paste a Google Maps link or use the generate button</p>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Subscription Details</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (Liters) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="2.0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price per Liter (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.pricePerLiter}
                      onChange={(e) => setFormData(prev => ({ ...prev, pricePerLiter: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="50.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency *
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                        deliveryDays: e.target.value === 'daily' ? [] : prev.deliveryDays
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                {formData.frequency !== 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Days *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {weekDays.map((day) => (
                        <label key={day} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.deliveryDays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  deliveryDays: [...prev.deliveryDays, day]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  deliveryDays: prev.deliveryDays.filter(d => d !== day)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={formData.startDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type
                    </label>
                    <select
                      value={formData.paymentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as 'online' | 'offline' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value as 'paid' | 'pending' | 'overdue' | 'failed' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="autoRenew"
                    checked={formData.autoRenew}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoRenew: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="autoRenew" className="text-sm text-gray-700">
                    Auto-renew subscription
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingSubscription ? 'Update Subscription' : 'Add Subscription'}</span>
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

export default Subscriptions; 