import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, Sparkles, X, Star, ChevronLeft, Truck, Shield, Package } from 'lucide-react';
import { useStore, Product, DeliveryInfo } from '@/store/useStore';
import { ProductCardSkeleton } from './SkeletonLoader';

export const Marketplace: React.FC = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, checkout, user } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.category === filter);

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!deliveryInfo.fullName || !deliveryInfo.phone || !deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.pincode) {
      return;
    }
    
    const success = await checkout(deliveryInfo);
    if (success) {
      setCheckoutSuccess(true);
      setTimeout(() => {
        setCheckoutSuccess(false);
        setShowCheckout(false);
        setShowCart(false);
        setDeliveryInfo({
          fullName: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
        });
      }, 3000);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: '🛍️' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
  ];

  // Product Detail View
  if (selectedProduct) {
    return (
      <ProductDetailView 
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
        onAddToCart={() => {
          addToCart(selectedProduct.id);
        }}
        userBalance={user?.kruxBalance || 0}
        cartQuantity={cart.find(c => c.productId === selectedProduct.id)?.quantity || 0}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🛍️ KRUX Shop</h1>
            <p className="text-gray-500 text-sm">Spend your KRUX on sustainable products</p>
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="relative p-3 bg-gray-100 rounded-xl border border-gray-200"
          >
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>

        {/* Balance Display */}
        <div className="bg-green-50 rounded-xl p-3 mb-4 border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">Your Balance</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-green-600">{user?.kruxBalance || 0}</span>
              <span className="text-gray-500">KRUX</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
                filter === cat.id
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={() => addToCart(product.id)}
                onClick={() => setSelectedProduct(product)}
                userBalance={user?.kruxBalance || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => !showCheckout && setShowCart(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden">
            {!showCheckout ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
                    <button onClick={() => setShowCart(false)} className="text-gray-400 p-2">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[45vh] p-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        if (!product) return null;
                        return (
                          <div key={item.productId} className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center text-3xl">
                              {product.image}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-medium text-sm line-clamp-1">{product.name}</h3>
                              <p className="text-green-600 font-bold">{product.price} KRUX</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => updateCartQuantity(product.id, item.quantity - 1)}
                                className="p-1 bg-gray-100 rounded-lg"
                              >
                                <Minus className="w-4 h-4 text-gray-500" />
                              </button>
                              <span className="text-gray-900 w-6 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => updateCartQuantity(product.id, item.quantity + 1)}
                                className="p-1 bg-gray-100 rounded-lg"
                              >
                                <Plus className="w-4 h-4 text-gray-500" />
                              </button>
                              <button 
                                onClick={() => removeFromCart(product.id)}
                                className="p-2 bg-red-50 rounded-lg ml-2"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {cart.length > 0 && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-500">Subtotal:</span>
                      <span className="text-xl font-bold text-green-600">{cartTotal} KRUX</span>
                    </div>
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-gray-500">Your Balance:</span>
                      <span className={`font-bold ${(user?.kruxBalance || 0) >= cartTotal ? 'text-gray-900' : 'text-red-500'}`}>
                        {user?.kruxBalance || 0} KRUX
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setShowCheckout(true)}
                      disabled={(user?.kruxBalance || 0) < cartTotal}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                        (user?.kruxBalance || 0) >= cartTotal
                          ? 'bg-green-500 hover:bg-green-600 text-white pop-out-btn'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(user?.kruxBalance || 0) >= cartTotal 
                        ? 'Proceed to Checkout' 
                        : 'Insufficient KRUX'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <CheckoutView
                deliveryInfo={deliveryInfo}
                setDeliveryInfo={setDeliveryInfo}
                cartTotal={cartTotal}
                onBack={() => setShowCheckout(false)}
                onCheckout={handleCheckout}
                checkoutSuccess={checkoutSuccess}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  onClick: () => void;
  userBalance: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onClick, userBalance }) => {
  const [added, setAdded] = useState(false);
  const canAfford = userBalance >= product.price;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAfford) return;
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-green-300 transition-all duration-300 cursor-pointer"
    >
      <div className="h-32 bg-green-50 flex items-center justify-center text-6xl relative">
        {product.image}
        {product.stock < 10 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            Low Stock
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-gray-900 font-medium text-sm mb-1 line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-gray-400 text-xs">{product.rating} ({product.reviews})</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-green-700 font-bold">{product.price}</span>
            <span className="text-gray-400 text-xs ml-1">KRUX</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={!canAfford}
            className={`p-2 rounded-lg transition-all duration-300 ${
              added 
                ? 'bg-green-500 text-white' 
                : canAfford 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {added ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onAddToCart: () => void;
  userBalance: number;
  cartQuantity: number;
}

const ProductDetailView: React.FC<ProductDetailViewProps> = ({ 
  product, 
  onBack, 
  onAddToCart, 
  userBalance,
  cartQuantity 
}) => {
  const [added, setAdded] = useState(false);
  const canAfford = userBalance >= product.price;

  const handleAdd = () => {
    if (!canAfford) return;
    onAddToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Shop</span>
        </button>
      </div>

      {/* Product Image */}
      <div className="h-64 bg-green-50 flex items-center justify-center text-9xl">
        {product.image}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex-1">{product.name}</h1>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-600 font-medium">{product.rating}</span>
          </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">{product.reviews} reviews • {product.stock} in stock</p>
        
        <p className="text-gray-600 mb-6">{product.description}</p>

        {/* Features */}
        <div className="mb-6">
          <h3 className="text-gray-900 font-bold mb-3">Features</h3>
          <div className="space-y-2">
            {product.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-600 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <Truck className="w-6 h-6 text-green-500 mx-auto mb-1" />
            <p className="text-gray-700 text-xs font-medium">Free Delivery</p>
            <p className="text-gray-400 text-xs">On orders above 200</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <Shield className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-gray-700 text-xs font-medium">Quality Assured</p>
            <p className="text-gray-400 text-xs">Eco-certified</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-200 shadow-sm">
            <Package className="w-6 h-6 text-green-700 mx-auto mb-1" />
            <p className="text-gray-700 text-xs font-medium">Easy Returns</p>
            <p className="text-gray-400 text-xs">7-day policy</p>
          </div>
        </div>

        {/* Price & Add to Cart */}
        <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-sm">Price</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-green-700">{product.price}</span>
                <span className="text-gray-400">KRUX</span>
              </div>
              {!canAfford && (
                <p className="text-red-500 text-xs">Need {product.price - userBalance} more KRUX</p>
              )}
            </div>
            <button
              onClick={handleAdd}
              disabled={!canAfford}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${
                added 
                  ? 'bg-green-500 text-white'
                  : canAfford 
                    ? 'bg-green-500 hover:bg-green-600 text-white pop-out-btn' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  Added to Cart
                </>
              ) : cartQuantity > 0 ? (
                <>
                  <Plus className="w-5 h-5" />
                  Add More ({cartQuantity} in cart)
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CheckoutViewProps {
  deliveryInfo: DeliveryInfo;
  setDeliveryInfo: (info: DeliveryInfo) => void;
  cartTotal: number;
  onBack: () => void;
  onCheckout: () => void;
  checkoutSuccess: boolean;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({
  deliveryInfo,
  setDeliveryInfo,
  cartTotal,
  onBack,
  onCheckout,
  checkoutSuccess,
}) => {
  const isFormValid = deliveryInfo.fullName && deliveryInfo.phone && deliveryInfo.address && deliveryInfo.city && deliveryInfo.pincode;

  if (checkoutSuccess) {
    return (
      <div className="p-8 text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-500 mb-4">Your eco-friendly products are on the way 🌱</p>
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-green-500" />
          <span className="text-green-600 font-bold">Thank you for being an Eco Hero!</span>
          <Sparkles className="w-6 h-6 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-gray-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Delivery Details</h2>
        </div>
      </div>
      
      <div className="overflow-y-auto max-h-[50vh] p-4">
        <div className="space-y-4">
          <div>
            <label className="text-gray-500 text-sm mb-1 block">Full Name *</label>
            <input
              type="text"
              value={deliveryInfo.fullName}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, fullName: e.target.value })}
              placeholder="Enter your full name"
              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="text-gray-500 text-sm mb-1 block">Phone Number *</label>
            <input
              type="tel"
              value={deliveryInfo.phone}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
              placeholder="Enter your phone number"
              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="text-gray-500 text-sm mb-1 block">Delivery Address *</label>
            <textarea
              value={deliveryInfo.address}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
              placeholder="House/Flat No., Street, Landmark"
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-sm mb-1 block">City *</label>
              <input
                type="text"
                value={deliveryInfo.city}
                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                placeholder="City"
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-gray-500 text-sm mb-1 block">State</label>
              <input
                type="text"
                value={deliveryInfo.state}
                onChange={(e) => setDeliveryInfo({ ...deliveryInfo, state: e.target.value })}
                placeholder="State"
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="text-gray-500 text-sm mb-1 block">PIN Code *</label>
            <input
              type="text"
              value={deliveryInfo.pincode}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, pincode: e.target.value })}
              placeholder="6-digit PIN code"
              maxLength={6}
              className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500">Total:</span>
          <span className="text-2xl font-bold text-green-600">{cartTotal} KRUX</span>
        </div>
        
        <button
          onClick={onCheckout}
          disabled={!isFormValid}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
            isFormValid
              ? 'bg-green-500 hover:bg-green-600 text-white pop-out-btn'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isFormValid ? 'Place Order' : 'Fill all required fields'}
        </button>
      </div>
    </>
  );
};
