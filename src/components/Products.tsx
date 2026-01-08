import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Image as ImageIcon, Tag, X, RefreshCw, Upload } from 'lucide-react';
import { useFirestore, Product } from '../hooks/useFirestore';
import imagePng from '../images/image.png';
import img8923 from '../images/IMG_8923.jpg';

const CATEGORIES: Product['category'][] = [
  'All Products',
  'Milk & Dairy Products',
  'Fresh Vegetables',
  'Leafy Greens',
  'Fresh Fruits'
];

interface ProductsProps {
  autoOpenModal?: boolean;
}

const Products: React.FC<ProductsProps> = ({ autoOpenModal = false }) => {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useFirestore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'All Products' as Product['category'],
    imageUrl: '',
    price: '',
    quantity: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Product['category'] | 'All'>('All');
  const [search, setSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Available images from src/images
  const availableImages = [
    { name: 'image.png', url: imagePng },
    { name: 'IMG_8923.jpg', url: img8923 }
  ];

  useEffect(() => {
    if (autoOpenModal) {
      setIsModalOpen(true);
    }
  }, [autoOpenModal]);

  const resetForm = () => {
    setFormData({ name: '', category: 'All Products', imageUrl: '', price: '', quantity: '', description: '' });
    setEditingProduct(null);
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        imageUrl: formData.imageUrl.trim(),
        quantity: formData.quantity.trim() || undefined,
        price: parseFloat(formData.price || '0'),
        description: formData.description.trim() || undefined
      } as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

      if (editingProduct?.id) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload);
      }

      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, imageUrl: url });
    if (url) {
      setImagePreview(url);
      setImageFile(null);
    } else {
      setImagePreview(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setFormData({ ...formData, imageUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    setFormData({ ...formData, imageUrl });
    setImagePreview(imageUrl);
    setImageFile(null);
  };

  useEffect(() => {
    if (formData.imageUrl && !imageFile) {
      setImagePreview(formData.imageUrl);
    } else if (!formData.imageUrl) {
      setImagePreview(null);
    }
  }, [formData.imageUrl, imageFile]);

  const filteredProducts = products
    .filter(p => (filterCategory === 'All' ? true : p.category === filterCategory))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          <p className="text-gray-500 font-medium">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Add and manage your catalog</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary mt-3 sm:mt-0 inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="All">All</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="card overflow-hidden">
            <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-xs text-gray-500">{product.category}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {product.quantity ? product.quantity : 'Quantity info not set'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-primary-700 font-bold">₹{product.price?.toFixed ? product.price.toFixed(2) : product.price}</span>
                </div>
              </div>
              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setFormData({
                      name: product.name,
                      category: product.category,
                      imageUrl: product.imageUrl || '',
                      quantity: product.quantity || '',
                      price: String(product.price || ''),
                      description: product.description || ''
                    });
                    setImagePreview(product.imageUrl || null);
                    setImageFile(null);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => product.id && deleteProduct(product.id)}
                  className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-6">Add your first product to get started.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary inline-flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-md w-full p-4 sm:p-6 animate-scale-in max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Provide product details below</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="input-field"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product Image</label>
                
                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-3 relative">
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={() => setImagePreview(null)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, imageUrl: '' });
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload File Input */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-2">Upload Image</label>
                  <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                    <Upload className="w-5 h-5 mr-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Choose file or drag and drop</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Select from Available Images */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-2">Or select from available images:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectImage(img.url)}
                        className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          imagePreview === img.url 
                            ? 'border-primary-500 ring-2 ring-primary-200' 
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <img 
                          src={img.url} 
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                        {imagePreview === img.url && (
                          <div className="absolute inset-0 bg-primary-500/20 flex items-center justify-center">
                            <div className="bg-primary-500 text-white rounded-full p-1">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image URL Input */}
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Or enter image URL:</label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => handleImageUrlChange(e.target.value)}
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="input-field"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Quantity details</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="input-field"
                  placeholder="e.g., 10L pack, 500g bag"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input-field"
                  placeholder="Short description (optional)"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="btn-secondary flex-1 text-xs sm:text-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 text-xs sm:text-sm inline-flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {editingProduct ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    <>{editingProduct ? 'Update' : 'Add'}</>
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

export default Products;




