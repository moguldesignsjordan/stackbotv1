// src/app/cart/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { SavedAddress } from '@/lib/types/address';
import { CartItem } from '@/lib/types/order';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Loader2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Star,
  ChevronRight,
  LogIn,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    cart,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    deliveryFee,
    serviceFee,
    tax,
    total,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  // Customer Info Form State
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Manual Delivery Address Form State (only if no saved address)
  const [manualAddress, setManualAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Dominican Republic',
    instructions: '',
  });

  const [notes, setNotes] = useState('');

  // Fetch saved addresses when user is authenticated
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;

      setLoadingAddresses(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/customer/addresses', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setSavedAddresses(data.addresses || []);
          
          // Auto-select pinned address
          if (data.pinnedAddressId) {
            setSelectedAddressId(data.pinnedAddressId);
          } else if (data.addresses?.length > 0) {
            setSelectedAddressId(data.addresses[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch addresses:', err);
      } finally {
        setLoadingAddresses(false);
      }
    };

    if (user) {
      fetchAddresses();
      // Pre-fill customer info
      setCustomerInfo({
        name: user.displayName || '',
        email: user.email || '',
        phone: '',
      });
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      // Redirect to login with cart as redirect destination
      router.push('/login?redirect=/cart');
      return;
    }
    setShowCheckoutForm(true);
  };

  const getSelectedAddress = () => {
    if (useNewAddress) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId);
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate customer info
    if (!customerInfo.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!customerInfo.email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!customerInfo.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate address
    const selectedAddress = getSelectedAddress();
    if (!selectedAddress && !useNewAddress) {
      // No address selected and not using new address
      if (savedAddresses.length === 0) {
        setUseNewAddress(true);
        setError('Please enter a delivery address');
        return;
      }
      setError('Please select a delivery address');
      return;
    }

    if (useNewAddress) {
      if (!manualAddress.street.trim()) {
        setError('Please enter a street address');
        return;
      }
      if (!manualAddress.city.trim()) {
        setError('Please enter a city');
        return;
      }
    }

    setIsCheckingOut(true);

    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Build delivery address from selected or manual
      const deliveryAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            city: selectedAddress.city,
            state: selectedAddress.state || '',
            postalCode: selectedAddress.postalCode,
            country: selectedAddress.country,
            instructions: selectedAddress.instructions || '',
          }
        : manualAddress;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.items,
          customerInfo,
          deliveryAddress,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsCheckingOut(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  // Empty cart
  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Add some items to get started</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </h1>
            </div>
            
            {cart.items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 mb-6 lg:mb-0">
            {/* Vendor Info */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">
                Ordering from <span className="font-medium text-gray-900">{cart.vendorName}</span>
              </p>
            </div>

            {/* Items */}
            {cart.items.map((item: CartItem) => (
              <div
                key={item.productId}
                className="bg-white rounded-xl shadow-sm p-4 flex gap-4"
              >
                {item.imageUrl && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                  <p className="text-[#55529d] font-semibold">{formatCurrency(item.price)}</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="font-medium">{formatCurrency(serviceFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-[#55529d]">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Not logged in prompt */}
              {!user && !showCheckoutForm && (
                <div className="mt-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Sign in to checkout</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Create an account to save your addresses and track orders
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors font-medium"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In to Checkout
                  </button>
                  
                  <p className="text-center text-sm text-gray-500 mt-3">
                    New customer?{' '}
                    <Link href="/login?redirect=/cart" className="text-[#55529d] hover:underline">
                      Create an account
                    </Link>
                  </p>
                </div>
              )}

              {/* Logged in - Checkout button or form */}
              {user && !showCheckoutForm && (
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full mt-6 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Checkout Form */}
              {user && showCheckoutForm && (
                <form onSubmit={handleCheckout} className="mt-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Your Details
                    </h3>
                    
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                    
                    <input
                      type="email"
                      placeholder="Email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                    
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Delivery Address
                      </h3>
                      <Link
                        href="/account/addresses"
                        className="text-sm text-[#55529d] hover:underline"
                      >
                        Manage
                      </Link>
                    </div>

                    {loadingAddresses ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : savedAddresses.length > 0 && !useNewAddress ? (
                      <div className="space-y-2">
                        {savedAddresses.map((address) => (
                          <label
                            key={address.id}
                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedAddressId === address.id
                                ? 'border-[#55529d] bg-[#55529d]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="address"
                              checked={selectedAddressId === address.id}
                              onChange={() => setSelectedAddressId(address.id)}
                              className="mt-1 text-[#55529d] focus:ring-[#55529d]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{address.label}</span>
                                {address.isPinned && (
                                  <Star className="w-3 h-3 text-[#55529d] fill-current" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">{address.street}</p>
                              <p className="text-sm text-gray-500">
                                {address.city}, {address.country}
                              </p>
                            </div>
                          </label>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => setUseNewAddress(true)}
                          className="w-full p-3 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#55529d] hover:text-[#55529d] transition-colors text-sm"
                        >
                          + Use a different address
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setUseNewAddress(false)}
                            className="text-sm text-[#55529d] hover:underline"
                          >
                            ← Use saved address
                          </button>
                        )}
                        
                        <input
                          type="text"
                          placeholder="Street Address"
                          value={manualAddress.street}
                          onChange={(e) => setManualAddress({ ...manualAddress, street: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={manualAddress.city}
                            onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={manualAddress.postalCode}
                            onChange={(e) => setManualAddress({ ...manualAddress, postalCode: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                          />
                        </div>
                        
                        <input
                          type="text"
                          placeholder="Delivery Instructions (optional)"
                          value={manualAddress.instructions}
                          onChange={(e) => setManualAddress({ ...manualAddress, instructions: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                        />

                        {savedAddresses.length === 0 && (
                          <p className="text-xs text-gray-500">
                            This address will be saved to your account for future orders.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Order Notes (optional)
                    </label>
                    <textarea
                      placeholder="Special requests, allergies, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isCheckingOut}
                    className="w-full py-3 bg-[#f97316] text-white rounded-xl hover:bg-[#ea6a10] disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Pay {formatCurrency(total)}
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCheckoutForm(false)}
                    className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    ← Back to cart
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}