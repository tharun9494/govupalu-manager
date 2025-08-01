import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Package, TrendingUp, TrendingDown, Calendar, X, RefreshCw, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useFirestore, InventoryRecord } from '../hooks/useFirestore';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import TimeFilter, { TimeFilterType } from './TimeFilter';
import { filterByTimePeriod, getTimePeriodLabel, getTimePeriodStats } from '../utils/timeFilterUtils';

interface InventoryProps {
  autoOpenModal?: boolean;
}

interface FormErrors {
  date?: string;
  stockReceived?: string;
  stockSold?: string;
  buyingPrice?: string;
  sellingPrice?: string;
  general?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const Inventory: React.FC<InventoryProps> = ({ autoOpenModal = false }) => {
  const { inventory, addInventoryRecord, updateInventoryRecord, deleteInventoryRecord, loading } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    stockReceived: '',
    stockSold: '',
    buyingPrice: '35',
    sellingPrice: '60'
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'stockReceived' | 'stockSold' | 'revenue'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Auto-open modal if prop is true
  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
    }
  }, [autoOpenModal]);

  // Show update indicator when inventory changes
  useEffect(() => {
    if (inventory.length > 0) {
      setShowUpdateIndicator(true);
      const timer = setTimeout(() => setShowUpdateIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [inventory]);

  // Auto-remove notifications
  useEffect(() => {
    const timers = notifications.map(notification => {
      const duration = notification.duration || 5000;
      return setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [notifications]);

  // Utility functions
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      addNotification({
        type: 'warning',
        message: 'Please select records to delete',
        duration: 3000
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} selected record(s)? This action cannot be undone.`)) {
      try {
        const deletePromises = selectedRecords.map(id => deleteInventoryRecord(id));
        await Promise.all(deletePromises);
        
        addNotification({
          type: 'success',
          message: `${selectedRecords.length} record(s) deleted successfully!`,
          duration: 3000
        });
        
        setSelectedRecords([]);
        setShowBulkActions(false);
      } catch (error) {
        console.error('Error deleting records:', error);
        addNotification({
          type: 'error',
          message: 'Failed to delete some records. Please try again.',
          duration: 5000
        });
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === sortedInventory.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(sortedInventory.map(record => record.id!));
    }
  };

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};
    
    // Date validation
    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      if (isAfter(selectedDate, today)) {
        errors.date = 'Date cannot be in the future';
      }
    }

    // Stock received validation
    if (!formData.stockReceived) {
      errors.stockReceived = 'Stock received is required';
    } else {
      const stockReceived = parseFloat(formData.stockReceived);
      if (isNaN(stockReceived) || stockReceived <= 0) {
        errors.stockReceived = 'Stock received must be a positive number';
      } else if (stockReceived > 10000) {
        errors.stockReceived = 'Stock received cannot exceed 10,000 liters';
      }
    }

    // Stock sold validation
    if (formData.stockSold) {
      const stockSold = parseFloat(formData.stockSold);
      if (isNaN(stockSold) || stockSold < 0) {
        errors.stockSold = 'Stock sold must be a non-negative number';
      } else {
        const stockReceived = parseFloat(formData.stockReceived) || 0;
        if (stockSold > stockReceived) {
          errors.stockSold = 'Stock sold cannot exceed stock received';
        }
      }
    }

    // Price validation
    if (!formData.buyingPrice) {
      errors.buyingPrice = 'Buying price is required';
    } else {
      const buyingPrice = parseFloat(formData.buyingPrice);
      if (isNaN(buyingPrice) || buyingPrice < 0) {
        errors.buyingPrice = 'Buying price must be a positive number';
      } else if (buyingPrice > 1000) {
        errors.buyingPrice = 'Buying price cannot exceed ₹1,000 per liter';
      }
    }

    if (!formData.sellingPrice) {
      errors.sellingPrice = 'Selling price is required';
    } else {
      const sellingPrice = parseFloat(formData.sellingPrice);
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        errors.sellingPrice = 'Selling price must be a positive number';
      } else if (sellingPrice > 1000) {
        errors.sellingPrice = 'Selling price cannot exceed ₹1,000 per liter';
      }
    }

    // Profit margin validation
    if (formData.buyingPrice && formData.sellingPrice) {
      const buyingPrice = parseFloat(formData.buyingPrice);
      const sellingPrice = parseFloat(formData.sellingPrice);
      if (sellingPrice <= buyingPrice) {
        errors.sellingPrice = 'Selling price must be higher than buying price';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Validate form
    if (!validateForm()) {
      addNotification({
        type: 'error',
        message: 'Please fix the errors in the form',
        duration: 3000
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const stockReceived = parseFloat(formData.stockReceived);
      const stockSold = parseFloat(formData.stockSold) || 0;
      const buyingPrice = parseFloat(formData.buyingPrice);
      const sellingPrice = parseFloat(formData.sellingPrice);
      
      const recordData = {
        date: formData.date,
        stockReceived,
        stockSold,
        stockRemaining: stockReceived - stockSold,
        buyingPrice,
        sellingPrice
      };

      if (isEditMode && editingRecordId) {
        await updateInventoryRecord(editingRecordId, recordData);
        addNotification({
          type: 'success',
          message: 'Inventory record updated successfully!',
          duration: 3000
        });
      } else {
        await addInventoryRecord(recordData);
        addNotification({
          type: 'success',
          message: 'Inventory record added successfully!',
          duration: 3000
        });
      }
      
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving inventory record:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save inventory record. Please try again.',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEdit = (record: InventoryRecord) => {
    setEditingRecordId(record.id!);
    setIsEditMode(true);
    setFormData({
      date: record.date,
      stockReceived: record.stockReceived.toString(),
      stockSold: record.stockSold.toString(),
      buyingPrice: record.buyingPrice.toString(),
      sellingPrice: record.sellingPrice.toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (recordId: string) => {
    const record = inventory.find(r => r.id === recordId);
    const recordName = record ? `${record.stockReceived}L on ${format(new Date(record.date), 'MMM dd, yyyy')}` : 'this record';
    
    if (window.confirm(`Are you sure you want to delete ${recordName}? This action cannot be undone.`)) {
      try {
        await deleteInventoryRecord(recordId);
        addNotification({
          type: 'success',
          message: 'Inventory record deleted successfully!',
          duration: 3000
        });
      } catch (error) {
        console.error('Error deleting inventory record:', error);
        addNotification({
          type: 'error',
          message: 'Failed to delete inventory record. Please try again.',
          duration: 5000
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      stockReceived: '',
      stockSold: '',
      buyingPrice: '35',
      sellingPrice: '60'
    });
    setIsEditMode(false);
    setEditingRecordId(null);
  };

  // Helper function to safely format currency values
  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading inventory...</p>
        </div>
      </div>
    );
  }

  // Enhanced data processing
  const processedInventory = inventory.map(record => ({
    ...record,
    revenue: (record.stockSold || 0) * (record.sellingPrice || 0),
    profit: (record.stockSold || 0) * ((record.sellingPrice || 0) - (record.buyingPrice || 0)),
    profitMargin: record.sellingPrice && record.buyingPrice 
      ? ((record.sellingPrice - record.buyingPrice) / record.buyingPrice) * 100 
      : 0
  }));

  // Filter inventory based on time period
  const filteredInventory = filterByTimePeriod(processedInventory, timeFilter);
  const timeStats = getTimePeriodStats(inventory, timeFilter);

  // Search and sort functionality
  const searchFilteredInventory = filteredInventory.filter(record => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      record.date.toLowerCase().includes(searchLower) ||
      record.stockReceived.toString().includes(searchLower) ||
      record.stockSold.toString().includes(searchLower) ||
      record.stockRemaining.toString().includes(searchLower) ||
      record.buyingPrice.toString().includes(searchLower) ||
      record.sellingPrice.toString().includes(searchLower)
    );
  });

  const sortedInventory = [...searchFilteredInventory].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'stockReceived':
        aValue = a.stockReceived;
        bValue = b.stockReceived;
        break;
      case 'stockSold':
        aValue = a.stockSold;
        bValue = b.stockSold;
        break;
      case 'revenue':
        aValue = a.revenue;
        bValue = b.revenue;
        break;
      default:
        aValue = new Date(a.date);
        bValue = new Date(b.date);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalReceived = filteredInventory.reduce((sum, item) => sum + item.stockReceived, 0);
  const totalSold = filteredInventory.reduce((sum, item) => sum + item.stockSold, 0);
  const currentStock = filteredInventory.reduce((sum, item) => sum + item.stockRemaining, 0);
  const totalRevenue = filteredInventory.reduce((sum, item) => {
    const sellingPrice = item.sellingPrice || 0;
    const stockSold = item.stockSold || 0;
    return sum + (stockSold * sellingPrice);
  }, 0);
  
  const totalProfit = filteredInventory.reduce((sum, item) => {
    const sellingPrice = item.sellingPrice || 0;
    const buyingPrice = item.buyingPrice || 0;
    const stockSold = item.stockSold || 0;
    return sum + (stockSold * (sellingPrice - buyingPrice));
  }, 0);

  // Check for low stock warnings
  const lowStockRecords = filteredInventory.filter(item => item.stockRemaining < 10 && item.stockRemaining > 0);
  const outOfStockRecords = filteredInventory.filter(item => item.stockRemaining <= 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`flex items-center p-4 rounded-lg shadow-lg max-w-sm animate-slide-in ${
              notification.type === 'success' ? 'bg-success-50 border border-success-200 text-success-800' :
              notification.type === 'error' ? 'bg-danger-50 border border-danger-200 text-danger-800' :
              notification.type === 'warning' ? 'bg-warning-50 border border-warning-200 text-warning-800' :
              'bg-info-50 border border-info-200 text-info-800'
            }`}
          >
            <div className="flex-shrink-0 mr-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-success-600" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5 text-danger-600" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warning-600" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-info-600" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Real-time Update Indicator */}
      {showUpdateIndicator && (
        <div className="fixed top-4 left-4 z-50 animate-slide-in">
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-center">
              <RefreshCw className="w-4 h-4 text-primary-600 mr-2 animate-spin" />
              <span className="text-sm font-medium text-primary-800">Inventory updated in real-time</span>
            </div>
          </div>
        </div>
      )}

      {/* Stock Warnings */}
      {(lowStockRecords.length > 0 || outOfStockRecords.length > 0) && (
        <div className="card p-6 bg-warning-50 border border-warning-200">
          <div className="flex items-start">
            <div className="p-2 bg-warning-100 rounded-lg mr-4">
              <AlertTriangle className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-warning-900 mb-2">Stock Alerts</h3>
              <div className="space-y-2">
                {outOfStockRecords.length > 0 && (
                  <p className="text-warning-700">
                    <span className="font-medium">{outOfStockRecords.length}</span> record(s) are out of stock
                  </p>
                )}
                {lowStockRecords.length > 0 && (
                  <p className="text-warning-700">
                    <span className="font-medium">{lowStockRecords.length}</span> record(s) have low stock (less than 10L)
                  </p>
                )}
                <p className="text-sm text-warning-600">
                  Stock levels are automatically updated when orders are created or modified.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Track your milk stock levels and sales</p>
        </div>
        <div className="flex items-center space-x-3 mt-3 sm:mt-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Inventory</span>
          </button>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setSortBy('date');
              setSortOrder('desc');
              setTimeFilter('all');
            }}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <div className="card p-4 sm:p-6 bg-primary-50 border border-primary-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold text-primary-900 mb-2">Time Period Filter</h3>
            <p className="text-xs sm:text-sm text-primary-700">
              Filter inventory records by time of day: {getTimePeriodLabel(timeFilter)}
            </p>
          </div>
          <TimeFilter value={timeFilter} onChange={setTimeFilter} />
        </div>
        
        {/* Time Period Statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-primary-100">
            <div className="text-xs text-primary-600 font-medium">Total Records</div>
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
      <div className="card p-4 sm:p-6 bg-success-50 border border-success-200">
        <div className="flex items-start">
          <div className="p-2 bg-success-100 rounded-lg mr-3 sm:mr-4">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-success-600" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-success-900 mb-1 sm:mb-2">Automatic Stock Management</h3>
            <p className="text-xs sm:text-sm text-success-700 mb-2 sm:mb-3">
              Your inventory is automatically synchronized with orders:
            </p>
            <div className="space-y-1 sm:space-y-2">
              <div className="flex items-center text-xs sm:text-sm text-success-700">
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Stock sold is automatically updated when orders are created</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-success-700">
                <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Stock remaining is calculated in real-time</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm text-success-700">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <span>Low stock alerts are shown automatically</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Stock Received</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{totalReceived}L</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">+12% from last month</p>
          </div>
        </div>
        
        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-success-600" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Stock Sold</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{totalSold}L</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">+8% from last month</p>
          </div>
        </div>

        <div className="card p-3 sm:p-4 lg:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="p-1.5 sm:p-2 lg:p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-warning-600" />
            </div>
            <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Current Stock</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{currentStock}L</p>
            <p className="text-xs sm:text-sm text-warning-600 mt-1">-3% from yesterday</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-success-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{formatCurrency(totalRevenue)}</p>
            <p className="text-xs sm:text-sm text-success-600 mt-1">+15% from last month</p>
          </div>
        </div>

        <div className="card p-4 sm:p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Profit</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">₹{formatCurrency(totalProfit)}</p>
            <p className="text-xs sm:text-sm text-primary-600 mt-1">+20% from last month</p>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Analysis */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-success-50 rounded-lg">
              <span className="text-sm font-medium text-success-700">Average Profit Margin</span>
              <span className="text-lg font-bold text-success-900">
                {filteredInventory.length > 0 
                  ? `${(filteredInventory.reduce((sum, item) => sum + (item.profitMargin || 0), 0) / filteredInventory.length).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg">
              <span className="text-sm font-medium text-primary-700">Total Profit</span>
              <span className="text-lg font-bold text-primary-900">
                ₹{formatCurrency(filteredInventory.reduce((sum, item) => sum + (item.profit || 0), 0))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 rounded-lg">
              <span className="text-sm font-medium text-warning-700">Stock Efficiency</span>
              <span className="text-lg font-bold text-warning-900">
                {filteredInventory.length > 0 
                  ? `${((filteredInventory.reduce((sum, item) => sum + item.stockSold, 0) / filteredInventory.reduce((sum, item) => sum + item.stockReceived, 0)) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {sortedInventory.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.stockReceived}L received
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success-600">
                    ₹{formatCurrency(record.revenue || 0)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {record.stockSold}L sold
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Inventory Records</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Showing {sortedInventory.length} of {inventory.length} records
              </p>
            </div>
            
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <Package className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              
              {/* Sort */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="stockReceived">Sort by Stock Received</option>
                  <option value="stockSold">Sort by Stock Sold</option>
                  <option value="revenue">Sort by Revenue</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRecords.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-primary-50 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-primary-700">
                  {selectedRecords.length} record(s) selected
                </span>
                <button
                  onClick={() => setSelectedRecords([])}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 text-sm bg-danger-100 text-danger-700 rounded-md hover:bg-danger-200 transition-colors"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === sortedInventory.length && sortedInventory.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Received (L)
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sold (L)
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Remaining (L)
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Buy Price (₹)
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Sell Price (₹)
                </th>
                <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Revenue (₹)
                </th>
                <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Profit (₹)
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedInventory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id!)}
                      onChange={() => handleSelectRecord(record.id!)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-2 sm:mr-3"></div>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-gray-900 font-medium">{record.stockReceived}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-gray-900 font-medium">{record.stockSold}</span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`text-xs sm:text-sm font-medium ${record.stockRemaining < 10 ? 'text-danger-600' : 'text-gray-900'}`}>
                      {record.stockRemaining}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">₹{formatCurrency(record.buyingPrice)}</span>
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">₹{formatCurrency(record.sellingPrice)}</span>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-success-600">
                      ₹{formatCurrency((record.stockSold || 0) * (record.sellingPrice || 0))}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-primary-600">
                      ₹{formatCurrency((record.stockSold || 0) * ((record.sellingPrice || 0) - (record.buyingPrice || 0)))}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit record"
                      >
                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id!)}
                        className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                        title="Delete record"
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

        {sortedInventory.length === 0 && (
          <div className="text-center py-12 sm:py-16">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No inventory records</h3>
            <p className="text-sm text-gray-500 mb-6">Get started by adding your first inventory record.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Record</span>
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Inventory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="card max-w-sm w-full p-3 sm:p-4 lg:p-6 animate-scale-in max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit Inventory' : 'Add Inventory'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-danger-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className={`input-field ${formErrors.date ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                />
                {formErrors.date && (
                  <p className="text-xs text-danger-600 mt-1 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    {formErrors.date}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Stock Received (L) <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  name="stockReceived"
                  value={formData.stockReceived}
                  onChange={handleInputChange}
                  min="0"
                  max="10000"
                  step="0.1"
                  className={`input-field ${formErrors.stockReceived ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                  placeholder="0.0"
                />
                {formErrors.stockReceived && (
                  <p className="text-xs text-danger-600 mt-1 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    {formErrors.stockReceived}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Sold (L) <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  name="stockSold"
                  value={formData.stockSold}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className={`input-field ${formErrors.stockSold ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                  placeholder="0.0 (optional)"
                />
                {formErrors.stockSold && (
                  <p className="text-xs text-danger-600 mt-1 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    {formErrors.stockSold}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Buying Price (₹) <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  name="buyingPrice"
                  value={formData.buyingPrice}
                  onChange={handleInputChange}
                  min="0"
                  max="1000"
                  step="0.01"
                  className={`input-field ${formErrors.buyingPrice ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                  placeholder="35.00"
                />
                {formErrors.buyingPrice && (
                  <p className="text-xs text-danger-600 mt-1 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    {formErrors.buyingPrice}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Selling Price (₹) <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  min="0"
                  max="1000"
                  step="0.01"
                  className={`input-field ${formErrors.sellingPrice ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                  placeholder="60.00"
                />
                {formErrors.sellingPrice && (
                  <p className="text-xs text-danger-600 mt-1 flex items-center">
                    <XCircle className="w-3 h-3 mr-1" />
                    {formErrors.sellingPrice}
                  </p>
                )}
              </div>

              <div className="flex space-x-2 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="btn-secondary flex-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{isEditMode ? 'Update' : 'Add'}</>
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

export default Inventory;