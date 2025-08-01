import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, TrendingUp, TrendingDown, Calendar, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFirestore, InventoryRecord } from '../hooks/useFirestore';
import { format } from 'date-fns';

interface InventoryProps {
  autoOpenModal?: boolean;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.stockReceived || !formData.buyingPrice || !formData.sellingPrice) {
        alert('Please fill in all required fields');
        return;
      }
      
      const stockReceived = parseFloat(formData.stockReceived);
      const stockSold = parseFloat(formData.stockSold) || 0; // Make sold liters optional, default to 0
      const buyingPrice = parseFloat(formData.buyingPrice) || 35; // Default to 35 if invalid
      const sellingPrice = parseFloat(formData.sellingPrice) || 60; // Default to 60 if invalid
      
      // Validate that prices are positive numbers
      if (buyingPrice < 0 || sellingPrice < 0) {
        alert('Prices must be positive numbers');
        return;
      }
      
      // Validate that stock received is positive
      if (stockReceived <= 0) {
        alert('Stock received must be greater than 0');
        return;
      }
      
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
      } else {
        await addInventoryRecord(recordData);
      }
      
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving inventory record:', error);
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
    if (window.confirm('Are you sure you want to delete this inventory record?')) {
      try {
        await deleteInventoryRecord(recordId);
      } catch (error) {
        console.error('Error deleting inventory record:', error);
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

  const totalReceived = inventory.reduce((sum, item) => sum + item.stockReceived, 0);
  const totalSold = inventory.reduce((sum, item) => sum + item.stockSold, 0);
  const currentStock = inventory.reduce((sum, item) => sum + item.stockRemaining, 0);
  const totalRevenue = inventory.reduce((sum, item) => {
    const sellingPrice = item.sellingPrice || 0;
    const stockSold = item.stockSold || 0;
    return sum + (stockSold * sellingPrice);
  }, 0);
  
  const totalProfit = inventory.reduce((sum, item) => {
    const sellingPrice = item.sellingPrice || 0;
    const buyingPrice = item.buyingPrice || 0;
    const stockSold = item.stockSold || 0;
    return sum + (stockSold * (sellingPrice - buyingPrice));
  }, 0);

  // Check for low stock warnings
  const lowStockRecords = inventory.filter(item => item.stockRemaining < 10 && item.stockRemaining > 0);
  const outOfStockRecords = inventory.filter(item => item.stockRemaining <= 0);

  return (
    <div className="space-y-8 animate-fade-in">
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
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Track your milk stock levels and sales</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary mt-4 sm:mt-0 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Inventory</span>
        </button>
      </div>

      {/* Auto-Update Info Card */}
      <div className="card p-6 bg-success-50 border border-success-200">
        <div className="flex items-start">
          <div className="p-2 bg-success-100 rounded-lg mr-4">
            <RefreshCw className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-success-900 mb-2">Automatic Stock Management</h3>
            <p className="text-success-700 mb-3">
              Your inventory is automatically synchronized with orders:
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-success-700">
                <Package className="w-4 h-4 mr-2" />
                <span>Stock sold is automatically updated when orders are created</span>
              </div>
              <div className="flex items-center text-sm text-success-700">
                <TrendingDown className="w-4 h-4 mr-2" />
                <span>Stock remaining is calculated in real-time</span>
              </div>
              <div className="flex items-center text-sm text-success-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>Low stock alerts are shown automatically</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-success-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Stock Received</p>
            <p className="text-3xl font-bold text-gray-900">{totalReceived}L</p>
            <p className="text-sm text-success-600 mt-1">+12% from last month</p>
          </div>
        </div>
        
        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-success-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Stock Sold</p>
            <p className="text-3xl font-bold text-gray-900">{totalSold}L</p>
            <p className="text-sm text-success-600 mt-1">+8% from last month</p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-warning-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Package className="w-6 h-6 text-warning-600" />
            </div>
            <TrendingDown className="w-5 h-5 text-warning-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Current Stock</p>
            <p className="text-3xl font-bold text-gray-900">{currentStock}L</p>
            <p className="text-sm text-warning-600 mt-1">-3% from yesterday</p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-success-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">₹{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-success-600 mt-1">+15% from last month</p>
          </div>
        </div>

        <div className="card p-6 hover:shadow-medium transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-primary-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Profit</p>
            <p className="text-3xl font-bold text-gray-900">₹{formatCurrency(totalProfit)}</p>
            <p className="text-sm text-primary-600 mt-1">+20% from last month</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Inventory Records</h2>
              <p className="text-sm text-gray-500 mt-1">Detailed view of all inventory transactions</p>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Last 30 days</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Received (L)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Sold (L)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Stock Remaining (L)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Buying Price (₹)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Selling Price (₹)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Revenue (₹)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Profit (₹)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">{record.stockReceived}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">{record.stockSold}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${record.stockRemaining < 10 ? 'text-danger-600' : 'text-gray-900'}`}>
                      {record.stockRemaining}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">₹{formatCurrency(record.buyingPrice)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 font-medium">₹{formatCurrency(record.sellingPrice)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-success-600">
                      ₹{formatCurrency((record.stockSold || 0) * (record.sellingPrice || 0))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-primary-600">
                      ₹{formatCurrency((record.stockSold || 0) * ((record.sellingPrice || 0) - (record.buyingPrice || 0)))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit record"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id!)}
                        className="p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                        title="Delete record"
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

        {inventory.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory records</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first inventory record.</p>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit Inventory' : 'Add Inventory'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Received (L)</label>
                <input
                  type="number"
                  name="stockReceived"
                  value={formData.stockReceived}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.1"
                  className="input-field"
                  placeholder="0.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sold (L) <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="number"
                  name="stockSold"
                  value={formData.stockSold}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                  className="input-field"
                  placeholder="0.0 (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price (₹)</label>
                <input
                  type="number"
                  name="buyingPrice"
                  value={formData.buyingPrice}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="35.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="60.00"
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 text-sm"
                >
                  {isEditMode ? 'Update' : 'Add'}
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