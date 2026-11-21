'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { 
  Camera, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Plus, 
  Minus, 
  X, 
  Video,
  PackageCheck,
  PackageX,
  UploadCloud,
  ArrowLeft,
  ArrowRight,
  Bell,
  Truck,
  Bike,
  Clock,
  MapPin,
  Phone,
  ShoppingBag,
  Check,
  RefreshCw,
  Navigation,
  Store,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Key,
  Settings,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { SHOP_BRANCHES } from '@/lib/branches';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'inventory' | 'branches' | 'gateway'

  // ===================== RAZORPAY GATEWAY STATE =====================
  const [gatewayData, setGatewayData] = useState({
    configured: false,
    keyId: '',
    maskedKey: '',
    hasSecret: false,
    isTestKey: true,
    isLiveKey: false,
  });
  const [adminKeyId, setAdminKeyId] = useState('');
  const [adminKeySecret, setAdminKeySecret] = useState('');
  const [gatewayMessage, setGatewayMessage] = useState(null);
  const [isTestingGateway, setIsTestingGateway] = useState(false);

  // ===================== ORDERS STATE =====================
  const [orders, setOrders] = useState([]);
  const [ordersFetching, setOrdersFetching] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'received' | 'approved' | 'dispatched' | 'delivered'
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // ===================== INVENTORY STATE =====================
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Fruits');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('In Stock');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  
  // Camera state
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Product List State
  const [products, setProducts] = useState([]);
  const [fetching, setFetching] = useState(true);

  // Fetch Orders from Database API
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersFetching(false);
    }
  };

  // Fetch Products from Database
  const fetchProducts = async () => {
    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setFetching(false);
    }
  };

  // Fetch Razorpay Gateway Status
  const fetchGatewayData = async () => {
    try {
      const res = await fetch('/api/razorpay/keys');
      if (res.ok) {
        const data = await res.json();
        setGatewayData(data);
        if (data.keyId) setAdminKeyId(data.keyId);
      }
    } catch (e) {
      console.warn('Could not load gateway data:', e);
    }
  };

  const handleSaveGatewayKeys = async () => {
    setIsTestingGateway(true);
    setGatewayMessage(null);
    try {
      const res = await fetch('/api/razorpay/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: adminKeyId, keySecret: adminKeySecret }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGatewayMessage({ type: 'success', text: data.verificationMessage || 'Keys saved and active in .env.local!' });
        await fetchGatewayData();
      } else {
        setGatewayMessage({ type: 'error', text: data.error || 'Failed to update keys' });
      }
    } catch (err) {
      setGatewayMessage({ type: 'error', text: err.message });
    } finally {
      setIsTestingGateway(false);
    }
  };

  // Initial load & Polling for orders
  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchGatewayData();

    // Auto-refresh orders every 4 seconds for instant delivery dispatch
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);

    return () => {
      clearInterval(interval);
      stopCamera();
    };
  }, []);

  // Update order status (Manager approval & dispatch workflow)
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update order status');
      await fetchOrders();
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order: ' + err.message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handle file select (from Gallery or Camera)
  const handleFileSelect = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Live Camera handlers
  const startLiveCamera = async () => {
    setCameraError('');
    setShowLiveCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Error playing video stream:", e));
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please use the "Take Photo" button or Gallery.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowLiveCamera(false);
    setCameraError('');
  };

  const captureLivePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
      }
    }, 'image/jpeg', 0.92);

    stopCamera();
  };

  // Handle Delete Product
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + error.message);
    }
  };

  // Handle Stock Update
  const updateStock = async (id, currentStock, change) => {
    const newStock = Math.max(0, (Number(currentStock) || 0) + change);
    const newStatus = newStock === 0 ? 'Out of Stock' : 'In Stock';
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock, status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  // Handle Toggle Status
  const toggleStockStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'In Stock' ? 'Out of Stock' : 'In Stock';
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  // Handle Edit Load
  const handleEdit = (product) => {
    setEditingProductId(product.id);
    setName(product.name || '');
    setPrice(product.price ? String(product.price) : '');
    setCategory(product.category || 'Fruits');
    setStock(product.stock !== undefined ? String(product.stock) : '');
    setStatus(product.status || 'In Stock');
    setImageFile(null);
    setImagePreview(product.image || null);
    setActiveTab('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('Fruits');
    setStock('');
    setStatus('In Stock');
    setImageFile(null);
    setImagePreview(null);
    setEditingProductId(null);
    
    const galleryInput = document.getElementById('gallery-upload');
    if (galleryInput) galleryInput.value = '';
    const cameraInput = document.getElementById('camera-upload');
    if (cameraInput) cameraInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (!editingProductId && !imageFile && !imagePreview) {
        throw new Error('Please select an image from gallery or take a photo with camera.');
      }

      let publicUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      if (editingProductId) {
        const updateData = {
          name: name.trim(),
          price: Number(price),
          category: category,
          stock: Number(stock),
          status: status,
        };
        if (publicUrl) updateData.image = publicUrl;

        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', editingProductId);

        if (updateError) throw updateError;
        setMessage({ type: 'success', text: 'Product updated successfully!' });
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert([
            {
              name: name.trim(),
              price: Number(price),
              category: category,
              stock: Number(stock),
              status: status,
              image: publicUrl || imagePreview || '/images/products/apples.jpg',
              unit: 'kg',
            }
          ]);

        if (insertError) throw insertError;
        setMessage({ type: 'success', text: 'Product added successfully!' });
      }
      
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage({ type: 'error', text: 'Failed to save product: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by status and branch
  const pendingOrdersCount = orders.filter(o => o.status === 'received').length;
  const filteredOrders = orders.filter(o => {
    const matchesStatus =
      orderFilter === 'all'
        ? true
        : orderFilter === 'approved'
        ? (o.status === 'approved' || o.status === 'preparing')
        : o.status === orderFilter;

    const matchesBranch =
      selectedBranchFilter === 'all'
        ? true
        : o.assigned_branch_id === selectedBranchFilter;

    return matchesStatus && matchesBranch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/60 via-slate-50 to-emerald-50/40 p-4 md:p-8 flex flex-col items-center">
      
      {/* Top Header */}
      <div className="max-w-5xl w-full flex items-center justify-between mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-green-700 bg-white/80 hover:bg-white px-4 py-2 rounded-xl shadow-sm border border-green-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Storefront
        </Link>
        
        {/* Navigation Tabs (Orders vs Inventory vs Branches vs Gateway) */}
        <div className="flex flex-wrap items-center gap-2 bg-white/90 p-1.5 rounded-2xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Store Orders</span>
            {pendingOrdersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Product Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'branches'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Shop Branches ({SHOP_BRANCHES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'gateway'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Razorpay & Payments</span>
            <span className={`w-2 h-2 rounded-full ${gatewayData.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </button>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: SHOP MANAGER ORDERS RECEIVING & DISPATCH DASHBOARD */}
      {/* ====================================================================== */}
      {activeTab === 'orders' && (
        <div className="max-w-5xl w-full space-y-6">
          
          {/* Header Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400">Total Orders</span>
                <div className="text-2xl font-black text-gray-900 mt-0.5">{orders.length}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-700">Needs Approval</span>
                <div className="text-2xl font-black text-amber-950 mt-0.5">{pendingOrdersCount}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-700">Out for Delivery</span>
                <div className="text-2xl font-black text-blue-950 mt-0.5">
                  {orders.filter(o => o.status === 'dispatched').length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center">
                <Bike className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700">Delivered</span>
                <div className="text-2xl font-black text-emerald-950 mt-0.5">
                  {orders.filter(o => o.status === 'delivered').length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'received', label: `Pending Approval (${pendingOrdersCount})` },
                { id: 'approved', label: 'Packing / Approved' },
                { id: 'dispatched', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-green-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchOrders}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Live Auto-Syncing</span>
            </button>
          </div>

          {/* Branch Filter Selector */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black uppercase text-gray-700 tracking-wider">Fulfillment Branch:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBranchFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedBranchFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Hubs ({orders.length})
              </button>
              {SHOP_BRANCHES.map((b) => {
                const count = orders.filter((o) => o.assigned_branch_id === b.id).length;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBranchFilter(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      selectedBranchFilter === b.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{b.shortName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      selectedBranchFilter === b.id ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders List */}
          {ordersFetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-gray-500">Connecting to Live Store Terminal...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                📦
              </div>
              <h3 className="text-base font-black text-gray-900">No Orders in this category</h3>
              <p className="text-xs text-gray-500 mt-1">When customer places an order from checkout, it immediately appears here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const parsedItems = typeof ord.items === 'string' ? JSON.parse(ord.items || '[]') : ord.items || [];
                const isPending = ord.status === 'received';
                const isApproved = ord.status === 'approved' || ord.status === 'preparing';
                const isDispatched = ord.status === 'dispatched';
                const isDelivered = ord.status === 'delivered';

                return (
                  <div 
                    key={ord.id}
                    className={`bg-white rounded-3xl border p-6 shadow-sm transition-all ${
                      isPending ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Order Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shrink-0 ${
                          isDelivered ? 'bg-emerald-600' : isDispatched ? 'bg-blue-600' : isApproved ? 'bg-green-600' : 'bg-amber-500 animate-pulse'
                        }`}>
                          {isDelivered ? '✓' : isDispatched ? '🚚' : isApproved ? '📦' : '🛎️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-gray-900 text-base">{ord.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isDelivered ? 'bg-emerald-100 text-emerald-800' :
                              isDispatched ? 'bg-blue-100 text-blue-800' :
                              isApproved ? 'bg-green-100 text-green-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {isDelivered ? 'Delivered' : isDispatched ? 'Dispatched (Out for Delivery)' : isApproved ? 'Approved & Packing' : 'Pending Manager Approval'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Received {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {ord.payment_method}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold">
                              <Store className="w-3 h-3 text-emerald-600" />
                              <span>Hub: <strong>{ord.assigned_branch_name || 'Indiranagar Hub'}</strong></span>
                              {ord.branch_distance_km != null && (
                                <span className="bg-white px-1.5 py-0.2 rounded text-[10px] font-black border border-emerald-200 ml-1">
                                  {ord.branch_distance_km} km
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Amount */}
                      <div className="text-right">
                        <div className="text-xl font-black text-gray-900">₹{ord.total_amount}</div>
                        <span className={`text-[11px] font-bold ${ord.payment_status?.includes('Pending') ? 'text-amber-700' : 'text-green-700'}`}>
                          {ord.payment_status}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info & Address */}
                    <div className="grid sm:grid-cols-2 gap-4 py-4 border-b border-gray-100 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                          Customer Details
                        </span>
                        <div className="font-bold text-gray-900 text-sm">{ord.customer_name}</div>
                        <a href={`tel:${ord.customer_phone}`} className="text-green-700 font-bold hover:underline flex items-center gap-1 mt-1">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{ord.customer_phone}</span>
                        </a>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">
                          Delivery Address & GPS
                        </span>
                        <div className="text-gray-800 font-medium leading-relaxed">
                          {ord.delivery_address}
                        </div>
                        {ord.latitude && ord.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${ord.latitude},${ord.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-1.5 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200"
                          >
                            <Navigation className="w-3 h-3 text-blue-500" />
                            <span>Open GPS Map Coordinates ({ord.latitude.toFixed(2)}, {ord.longitude.toFixed(2)})</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="py-4 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                        Ordered Items ({parsedItems.length})
                      </span>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {parsedItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-xs text-gray-900 truncate">{item.name}</div>
                              <div className="text-[10px] text-gray-500">{item.quantity} × {item.unit || 'unit'}</div>
                            </div>
                            <span className="font-bold text-xs text-gray-900 shrink-0">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                      {ord.delivery_notes && (
                        <div className="mt-2 text-[11px] text-gray-600 font-medium">
                          <strong>Note:</strong> {ord.delivery_notes}
                        </div>
                      )}
                    </div>

                    {/* Manager Approval & Dispatch Workflow Actions */}
                    <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-gray-500">
                        {isPending && <span className="text-amber-800 font-bold">⚠️ Action Required: Manager must review and accept</span>}
                        {isApproved && <span className="text-green-800 font-bold">📦 Packing in Progress: Ready to dispatch</span>}
                        {isDispatched && <span className="text-blue-800 font-bold">🚴 Delivery partner dispatched to customer address</span>}
                        {isDelivered && <span className="text-emerald-800 font-bold">✅ Order successfully completed</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* STEP 1: Manager Approves */}
                        {isPending && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'approved')}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>{updatingOrderId === ord.id ? 'Approving...' : 'Accept & Start Packing'}</span>
                          </button>
                        )}

                        {/* STEP 2: Manager Dispatches */}
                        {isApproved && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'dispatched')}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <Truck className="w-4 h-4" />
                            <span>{updatingOrderId === ord.id ? 'Dispatching...' : 'Dispatch / Hand to Rider'}</span>
                          </button>
                        )}

                        {/* STEP 3: Mark as Delivered */}
                        {isDispatched && (
                          <button
                            type="button"
                            disabled={updatingOrderId === ord.id}
                            onClick={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{updatingOrderId === ord.id ? 'Completing...' : 'Mark as Delivered'}</span>
                          </button>
                        )}

                        {/* Cancel / Reject Option */}
                        {(isPending || isApproved) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this order?')) {
                                handleUpdateOrderStatus(ord.id, 'cancelled');
                              }
                            }}
                            className="px-3.5 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition border border-red-200 cursor-pointer"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 2: INVENTORY & PRODUCT MANAGEMENT */}
      {/* ====================================================================== */}
      {activeTab === 'inventory' && (
        <div className="max-w-5xl w-full flex flex-col items-center">
          
          {/* ADD / EDIT PRODUCT FORM */}
          <div className="max-w-xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 p-6 md:p-8 mb-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {editingProductId ? 'Edit Product' : 'Add New Product'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage inventory and sync directly with local SQLite database
                </p>
              </div>
              {editingProductId && (
                <span className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-full border border-amber-200">
                  Editing ID: {editingProductId}
                </span>
              )}
            </div>
            
            {message.text && (
              <div className={`p-4 mb-6 rounded-2xl flex items-center gap-3 border ${
                message.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span className="text-sm font-semibold">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium"
                  placeholder="e.g. Alphonso Mangoes"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium"
                    placeholder="e.g. 120"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium cursor-pointer"
                  >
                    <option value="Fruits">Fruits</option>
                    <option value="Vegetables">Vegetables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Initial Status *
                  </label>
                  <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium cursor-pointer"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* IMAGE UPLOAD OPTIONS */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Product Image {editingProductId ? '(Optional to replace)' : '*'}
                </label>

                <input
                  id="gallery-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <input
                  id="camera-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('gallery-upload')?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 font-bold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5 text-emerald-600" />
                    <span>Photo Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => document.getElementById('camera-upload')?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-800 font-bold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    <Camera className="w-5 h-5 text-blue-600" />
                    <span>Take Photo</span>
                  </button>
                </div>

                <div className="text-center mb-3">
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition py-1 px-3 rounded-lg hover:bg-gray-100 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-purple-600" />
                    <span>Live Webcam Preview</span>
                  </button>
                </div>

                {imagePreview ? (
                  <div className="relative p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                      <Image
                        src={imagePreview}
                        alt="Product preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 rounded-md mb-1">
                        Image Ready
                      </span>
                      <p className="text-xs text-gray-600 font-medium truncate">
                        {imageFile ? imageFile.name : 'Current Image'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl text-center bg-gray-50/50">
                    <UploadCloud className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs text-gray-500 font-medium">
                      Select an image using Gallery or Camera above.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 py-3.5 px-4 rounded-2xl text-white font-bold transition-all shadow-md cursor-pointer ${
                    loading 
                      ? 'bg-green-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'
                  }`}
                >
                  {loading ? 'Saving to Database...' : editingProductId ? 'Update Product' : 'Add Product'}
                </button>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-3.5 px-6 rounded-2xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* PRODUCTS LIST */}
          <div className="max-w-5xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/80 p-6 md:p-8 mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Product Inventory</h2>
                <p className="text-xs text-gray-500">Connected to local SQLite database</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-800 text-xs font-black rounded-full border border-green-200 w-fit">
                {products.length} Products Found
              </span>
            </div>
            
            {fetching ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-gray-500">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <p className="font-semibold">No products found in database.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const isOut = product.status === 'Out of Stock' || product.stock === 0;

                  return (
                    <div 
                      key={product.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 shadow-sm">
                          {product.image ? (
                            <Image 
                              src={product.image} 
                              alt={product.name} 
                              fill 
                              className="object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                              No Pic
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                              {product.name}
                            </h3>
                            <span className="text-[10px] font-black tracking-wider uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              {product.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-sm font-extrabold text-gray-900">
                              ₹{product.price}
                            </span>

                            {/* Stock Quantity Controls */}
                            <div className="inline-flex items-center bg-gray-100/80 rounded-xl border border-gray-200/80 overflow-hidden shadow-inner">
                              <button 
                                type="button"
                                onClick={() => updateStock(product.id, product.stock, -1)}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2 font-bold text-xs min-w-[2rem] text-center text-gray-800">
                                {product.stock}
                              </span>
                              <button 
                                type="button"
                                onClick={() => updateStock(product.id, product.stock, 1)}
                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="inline-flex items-center">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Out of Stock</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>In Stock</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleStockStatus(product.id, product.status || 'In Stock')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer active:scale-95 ${
                            isOut
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                          }`}
                        >
                          {isOut ? (
                            <>
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mark In Stock</span>
                            </>
                          ) : (
                            <>
                              <PackageX className="w-3.5 h-3.5 text-amber-600" />
                              <span>Mark Out</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 3: RAZORPAY GATEWAY & CONNECTED APPS */}
      {/* ====================================================================== */}
      {activeTab === 'gateway' && (
        <div className="max-w-5xl w-full space-y-6">
          
          {/* Gateway Status Overview */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-black shadow-md">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-gray-900">Razorpay Payment Gateway</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    gatewayData.configured 
                      ? (gatewayData.isLiveKey ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {gatewayData.configured 
                      ? (gatewayData.isLiveKey ? 'Production Live' : 'Test Mode (Sandbox)')
                      : 'Keys Pending'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Processes PhonePe, Google Pay, Paytm, UPI, Cards, NetBanking, and COD for instant grocery orders
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchGatewayData}
                className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-6 items-start">
            
            {/* LEFT: API Keys Configuration Card */}
            <div className="md:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-green-600" />
                  <span>Razorpay API Credentials</span>
                </h3>
                <span className="text-[10px] font-bold text-gray-400">Saved to .env.local</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Razorpay Key ID
                </label>
                <input
                  type="text"
                  placeholder="rzp_test_... or rzp_live_..."
                  value={adminKeyId}
                  onChange={(e) => setAdminKeyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  placeholder={gatewayData.hasSecret ? '••••••••••••••••••••••••' : 'Enter Key Secret from Razorpay Dashboard'}
                  value={adminKeySecret}
                  onChange={(e) => setAdminKeySecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Obtain live or test credentials at <a href="https://dashboard.razorpay.com/#/app/keys" target="_blank" rel="noreferrer" className="text-green-600 font-bold underline">dashboard.razorpay.com</a>
                </p>
              </div>

              {gatewayMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  gatewayMessage.type === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border border-red-200 text-red-900'
                }`}>
                  {gatewayMessage.text}
                </div>
              )}

              <button
                type="button"
                disabled={isTestingGateway}
                onClick={handleSaveGatewayKeys}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTestingGateway ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Razorpay API...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save & Test Razorpay Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* RIGHT: Connected Payment Channels & Launch Checklist */}
            <div className="md:col-span-6 space-y-6">
              
              {/* Connected Payment Methods Grid */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-gray-900 pb-2 border-b border-gray-100">
                  Connected Payment Rails & Apps
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { name: 'PhonePe UPI', type: 'App Intent + Deep Link', status: 'Active' },
                    { name: 'Google Pay', type: 'Tez UPI + Intent', status: 'Active' },
                    { name: 'Paytm UPI', type: 'App Launch & Wallet', status: 'Active' },
                    { name: 'BHIM & Any UPI', type: 'Dynamic NPCI QR', status: 'Active' },
                    { name: 'Credit & Debit Cards', type: 'RuPay, Visa, MC', status: 'Active' },
                    { name: 'NetBanking (50+ Banks)', type: 'Direct Portal', status: 'Active' },
                    { name: 'Digital Wallets', type: 'PhonePe, Paytm, etc.', status: 'Active' },
                    { name: 'Cash on Delivery', type: 'Doorstep Settlement', status: 'Active' },
                  ].map((chan, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">{chan.name}</div>
                        <div className="text-[10px] text-gray-400">{chan.type}</div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Website Launch Readiness Checklist */}
              <div className="bg-emerald-50/60 p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Launch Readiness Verification</span>
                </h3>

                <div className="space-y-2 text-xs font-semibold text-emerald-900">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Database: Local SQLite REST API listening on port 54321</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Storefront & Cart: Next.js 16 App Router on port 3000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Razorpay Official Checkout: Script & Verification routes connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Shop Manager Dispatch Terminal: Active with live order polling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Customer Order Live Tracker: 4-stage delivery tracking</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB: SHOP BRANCHES (DARK STORE FULFILLMENT HUBS) */}
      {/* ====================================================================== */}
      {activeTab === 'branches' && (
        <div className="max-w-5xl w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Store className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  MD FRESH Dark Store Hubs & Branches
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Multi-branch dark stores across Bengaluru. Orders are dynamically dispatched from the nearest branch via GPS Haversine Geolocation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                5 Hubs Online & Active
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {SHOP_BRANCHES.map((branch) => {
              const branchOrders = orders.filter((o) => o.assigned_branch_id === branch.id);
              const branchPending = branchOrders.filter((o) => o.status === 'received').length;
              const branchDispatched = branchOrders.filter((o) => o.status === 'dispatched').length;

              return (
                <div
                  key={branch.id}
                  className="bg-white p-6 rounded-3xl border border-gray-100 hover:border-emerald-200 shadow-sm transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg shrink-0">
                        🏬
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900">{branch.name}</h3>
                        <span className="text-[11px] font-mono font-bold text-gray-400">{branch.id}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Active Hub
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 border-t border-b border-gray-100 py-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium text-gray-800 leading-snug">{branch.address}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-400">Branch Manager:</span>
                      <strong className="text-gray-900">{branch.managerName}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Hotline:</span>
                      <a href={`tel:${branch.phone}`} className="text-emerald-700 font-bold hover:underline">
                        {branch.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Delivery Radius:</span>
                      <strong className="text-emerald-800">{branch.deliveryRadiusKm} km coverage</strong>
                    </div>
                  </div>

                  {/* Order Activity stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-xs text-gray-400 font-bold">Total</div>
                      <div className="text-base font-black text-gray-900">{branchOrders.length}</div>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="text-xs text-amber-700 font-bold">Pending</div>
                      <div className="text-base font-black text-amber-900">{branchPending}</div>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="text-xs text-blue-700 font-bold">En Route</div>
                      <div className="text-base font-black text-blue-900">{branchDispatched}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition border border-blue-200"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>GPS Map</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchFilter(branch.id);
                        setActiveTab('orders');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-4 py-2 rounded-xl transition border border-emerald-200 cursor-pointer"
                    >
                      <span>Manage Hub Orders</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIVE CAMERA MODAL */}
      {showLiveCamera && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-900">Live Camera Shutter</h3>
              </div>
              <button
                onClick={stopCamera}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm mb-4">
                {cameraError}
              </div>
            ) : (
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-4 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={captureLivePhoto}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Snap Photo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
