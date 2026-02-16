// src/app/cart/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInAppPayment } from '@/hooks/useInAppPayment';
import { CheckoutModal } from '@/components/paymets/CheckoutModal';
import { SavedAddress } from '@/lib/types/address';
import { CartItem } from '@/lib/types/order';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
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
  Store,
  Truck,
  Navigation,
} from 'lucide-react';

type FulfillmentType = 'delivery' | 'pickup';

interface VendorLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
}

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language, setLanguage, formatCurrency, t } = useLanguage();
  const {
    cart,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    deliveryFee,
    tax,
    total,
    vendorGroups,
    vendorCount,
  } = useCart();

  // In-app payment hook
  const {
    isLoading: isPaymentLoading,
    error: paymentError,
    paymentData,
    showPaymentSheet,
    vendorName: paymentVendorName,
    createPaymentIntent,
    handlePaymentSuccess,
    handlePaymentCancel,
    handlePaymentError,
    reset: resetPayment,
  } = useInAppPayment({
    onSuccess: (orderId, trackingPin) => {
      clearCart();
      router.push(`/checkout/success?order_id=${orderId}`);
    },
    onError: (error) => {
      setError(error);
    },
  });

  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fulfillment type (delivery vs pickup)
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('delivery');
  const [vendorLocations, setVendorLocations] = useState<Record<string, VendorLocation>>({});
  const [loadingVendorLocations, setLoadingVendorLocations] = useState(false);

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

  // Manual Delivery Address Form State
  const [manualAddress, setManualAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Dominican Republic',
    instructions: '',
  });

  const [notes, setNotes] = useState('');
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Calculate adjusted totals based on fulfillment type
  const TAX_PERCENT = 0.18;
  const DELIVERY_FEE_PER_VENDOR = 1.99;
  const adjustedDeliveryFee = fulfillmentType === 'pickup' ? 0 : deliveryFee;
  const adjustedTax = (subtotal + adjustedDeliveryFee) * TAX_PERCENT;
  const adjustedTotal = subtotal + adjustedDeliveryFee + adjustedTax;

  // Sync payment errors to local error state
  useEffect(() => {
    if (paymentError) setError(paymentError);
  }, [paymentError]);

  // Fetch vendor locations for pickup
  useEffect(() => {
    const fetchVendorLocations = async () => {
      if (vendorGroups.length === 0) return;

      setLoadingVendorLocations(true);
      try {
        const locations: Record<string, VendorLocation> = {};
        for (const group of vendorGroups) {
          const vendorRef = doc(db, 'vendors', group.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            const data = vendorSnap.data();
            locations[group.vendorId] = {
              address: data.address || data.business_address || '',
              coordinates: data.coordinates,
            };
          }
        }
        setVendorLocations(locations);
      } catch (err) {
        console.error('Failed to fetch vendor locations:', err);
      } finally {
        setLoadingVendorLocations(false);
      }
    };

    fetchVendorLocations();
  }, [vendorGroups.map(g => g.vendorId).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch saved addresses
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
      setCustomerInfo({
        name: user.displayName || '',
        email: user.email || '',
        phone: '',
      });
    }
  }, [user]);

  const handleProceedToCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }
    setShowCheckoutForm(true);
  };

  const getSelectedAddress = () => {
    if (useNewAddress) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId);
  };

  const openInMaps = (vendorId: string) => {
    const loc = vendorLocations[vendorId];
    if (!loc?.coordinates) return;
    const { lat, lng } = loc.coordinates;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // =========================================================================
  // IN-APP PAYMENT CHECKOUT (no redirect!)
  // =========================================================================
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

    // Validate address for delivery
    if (fulfillmentType === 'delivery') {
      const selectedAddress = getSelectedAddress();
      if (!selectedAddress && !useNewAddress) {
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
    }

    // Build delivery address
    // Build delivery address with coordinates for tracking
    let deliveryAddress: any = null;
    if (fulfillmentType === 'delivery') {
      const selectedAddress = getSelectedAddress();
      deliveryAddress = selectedAddress
        ? {
            street: selectedAddress.street,
            city: selectedAddress.city,
            state: selectedAddress.state || '',
            postalCode: selectedAddress.postalCode || '',
            country: selectedAddress.country,
            instructions: selectedAddress.instructions || '',
            coordinates: selectedAddress.coordinates || null,
          }
        : manualAddress;
    }

    // Attach item notes
    const itemsWithNotes = cart.items.map((item: CartItem) => ({
      ...item,
      notes: itemNotes[item.productId] || '',
    }));

    // Build vendor name for display
    const displayVendorName = vendorGroups.map((g) => g.vendorName).join(', ');

    // Create PaymentIntent (stays in-app — no redirect!)
    await createPaymentIntent({
      items: itemsWithNotes,
      customerInfo,
      deliveryAddress,
      fulfillmentType,
      notes,
      vendorName: displayVendorName,
    });
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 pt-[75px]">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Your cart is empty' : 'Tu carrito está vacío'}
          </h1>
          <p className="text-gray-500 mb-6">
            {language === 'en' ? 'Add some items to get started' : 'Agrega artículos para comenzar'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {language === 'en' ? 'Continue Shopping' : 'Seguir Comprando'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================================================================
          IN-APP PAYMENT SHEET MODAL
          Shows Stripe Elements directly in-app — no browser redirect
      ================================================================ */}
      {showPaymentSheet && paymentData && (
        <CheckoutModal
          clientSecret={paymentData.clientSecret}
          orderId={paymentData.orderId}
          trackingPin={paymentData.trackingPin}
          total={paymentData.total}
          vendorName={paymentVendorName}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          onError={handlePaymentError}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 pt-[75px]">
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
                {language === 'en'
                  ? `Your Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`
                  : `Tu Carrito (${itemCount} ${itemCount === 1 ? 'artículo' : 'artículos'})`
                }
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              >
                <span className="text-sm">{language === 'en' ? '🇺🇸' : '🇩🇴'}</span>
                <span className="text-xs font-medium text-gray-600">{language === 'en' ? 'EN' : 'ES'}</span>
              </button>

              {cart.items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  {language === 'en' ? 'Clear Cart' : 'Vaciar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Items - Grouped by Vendor */}
          <div className="lg:col-span-2 space-y-4 mb-6 lg:mb-0">
            {/* Multi-vendor info badge */}
            {vendorCount > 1 && (
              <div className="bg-[#55529d]/5 border border-[#55529d]/20 rounded-xl p-3 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#55529d]" />
                <p className="text-sm text-[#55529d] font-medium">
                  {language === 'en'
                    ? `Ordering from ${vendorCount} vendors — each will be a separate order`
                    : `Ordenando de ${vendorCount} tiendas — cada una será un pedido separado`
                  }
                </p>
              </div>
            )}

            {/* Vendor Groups */}
            {vendorGroups.map((group) => (
              <div key={group.vendorId} className="space-y-3">
                {/* Vendor Header */}
                <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-[#55529d]" />
                    <p className="text-sm font-medium text-gray-900">{group.vendorName}</p>
                  </div>
                  <p className="text-sm text-gray-500">{formatCurrency(group.subtotal)}</p>
                </div>

                {/* Items for this vendor */}
                {group.items.map((item: CartItem) => (
                  <div key={item.productId} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex gap-4">
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

                    {/* Item Notes */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <input
                        type="text"
                        placeholder={language === 'en' ? 'Special instructions (e.g., no onions)' : 'Instrucciones especiales (ej. sin cebolla)'}
                        value={itemNotes[item.productId] || ''}
                        onChange={(e) => setItemNotes({ ...itemNotes, [item.productId]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Order Summary & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 lg:sticky lg:top-[140px] lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {language === 'en' ? 'Order Summary' : 'Resumen del Pedido'}
              </h2>

              {/* Fulfillment Type Toggle */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'How would you like to receive your order?' : '¿Cómo deseas recibir tu pedido?'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      fulfillmentType === 'delivery'
                        ? 'border-[#55529d] bg-[#55529d]/5 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="w-5 h-5" />
                    <span className="font-medium">{language === 'en' ? 'Delivery' : 'Envío'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                      fulfillmentType === 'pickup'
                        ? 'border-[#55529d] bg-[#55529d]/5 text-[#55529d]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                    <span className="font-medium">{language === 'en' ? 'Pickup' : 'Recoger'}</span>
                  </button>
                </div>
              </div>

              {/* Pickup savings badge */}
              {fulfillmentType === 'pickup' && deliveryFee > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {language === 'en'
                      ? `You save ${formatCurrency(deliveryFee)} with pickup!`
                      : `¡Ahorras ${formatCurrency(deliveryFee)} al recoger!`
                    }
                  </p>
                </div>
              )}

              {/* Pickup vendor locations */}
              {fulfillmentType === 'pickup' && Object.keys(vendorLocations).length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {language === 'en' ? 'Pickup Locations' : 'Ubicaciones de Recogida'}
                  </p>
                  {vendorGroups.map((group) => {
                    const loc = vendorLocations[group.vendorId];
                    if (!loc) return null;
                    return (
                      <div key={group.vendorId} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-900">{group.vendorName}</p>
                        {loc.address && <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>}
                        {loc.coordinates && (
                          <button
                            type="button"
                            onClick={() => openInMaps(group.vendorId)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#55529d] font-medium hover:underline"
                          >
                            <Navigation className="w-3 h-3" />
                            {language === 'en' ? 'Get Directions' : 'Obtener Direcciones'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Totals */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{language === 'en' ? 'Subtotal' : 'Subtotal'}</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {language === 'en' ? 'Delivery Fee' : 'Envío'}
                    {vendorCount > 1 && fulfillmentType === 'delivery' && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({formatCurrency(DELIVERY_FEE_PER_VENDOR)} × {vendorCount})
                      </span>
                    )}
                  </span>
                  {fulfillmentType === 'pickup' ? (
                    <span className="font-medium text-green-600 flex items-center gap-1">
                      <span className="line-through text-gray-400">{formatCurrency(deliveryFee)}</span>
                      {language === 'en' ? 'FREE' : 'GRATIS'}
                    </span>
                  ) : (
                    <span className="font-medium">{formatCurrency(adjustedDeliveryFee)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{language === 'en' ? 'Tax (ITBIS 18%)' : 'ITBIS (18%)'}</span>
                  <span className="font-medium">{formatCurrency(adjustedTax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-bold text-gray-900">{language === 'en' ? 'Total' : 'Total'}</span>
                  <span className="font-bold text-[#55529d] text-lg">{formatCurrency(adjustedTotal)}</span>
                </div>
              </div>

              {/* Multi-vendor note */}
              {vendorCount > 1 && (
                <p className="mt-3 text-xs text-gray-400">
                  {language === 'en'
                    ? `This will create ${vendorCount} separate orders — one per vendor.`
                    : `Esto creará ${vendorCount} pedidos separados — uno por tienda.`
                  }
                </p>
              )}

              {/* Not logged in */}
              {!user && (
                <div className="mt-6 text-center">
                  <Link
                    href="/login?redirect=/cart"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors font-medium"
                  >
                    <LogIn className="w-5 h-5" />
                    {language === 'en' ? 'Sign In to Checkout' : 'Inicia Sesión para Pagar'}
                  </Link>
                  <p className="text-sm text-gray-500 mt-2">
                    {language === 'en' ? "New customer? " : '¿Cliente nuevo? '}
                    <Link href="/register?redirect=/cart" className="text-[#55529d] font-medium hover:underline">
                      {language === 'en' ? 'Create an account' : 'Crear cuenta'}
                    </Link>
                  </p>
                </div>
              )}

              {/* Logged in - Checkout button */}
              {user && !showCheckoutForm && (
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full mt-6 py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {language === 'en' ? 'Proceed to Checkout' : 'Continuar al Pago'}
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
                      {language === 'en' ? 'Your Details' : 'Tus Datos'}
                    </h3>

                    <input
                      type="text"
                      placeholder={language === 'en' ? 'Full Name' : 'Nombre Completo'}
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
                      placeholder={language === 'en' ? 'Phone Number' : 'Número de Teléfono'}
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                  </div>

                  {/* Delivery Address or Pickup */}
                  {fulfillmentType === 'delivery' ? (
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {language === 'en' ? 'Delivery Address' : 'Dirección de Entrega'}
                      </h3>

                      {loadingAddresses ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {language === 'en' ? 'Loading addresses...' : 'Cargando direcciones...'}
                        </div>
                      ) : savedAddresses.length > 0 && !useNewAddress ? (
                        <div className="space-y-2">
                          {savedAddresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-[#55529d] bg-[#55529d]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <p className="text-sm font-medium">{addr.street}</p>
                              <p className="text-xs text-gray-500">{addr.city}, {addr.country}</p>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setUseNewAddress(true)}
                            className="text-sm text-[#55529d] font-medium hover:underline"
                          >
                            {language === 'en' ? '+ Use a new address' : '+ Usar nueva dirección'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'Street Address' : 'Dirección'}
                            value={manualAddress.street}
                            onChange={(e) => setManualAddress({ ...manualAddress, street: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'City' : 'Ciudad'}
                            value={manualAddress.city}
                            onChange={(e) => setManualAddress({ ...manualAddress, city: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder={language === 'en' ? 'Delivery Instructions (optional)' : 'Instrucciones de entrega (opcional)'}
                            value={manualAddress.instructions}
                            onChange={(e) => setManualAddress({ ...manualAddress, instructions: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                          />
                          {savedAddresses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setUseNewAddress(false)}
                              className="text-sm text-[#55529d] font-medium hover:underline"
                            >
                              {language === 'en' ? '← Use saved address' : '← Usar dirección guardada'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        {language === 'en' ? 'Pickup Location(s)' : 'Ubicación(es) de Recogida'}
                      </h3>
                      {loadingVendorLocations ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {language === 'en' ? 'Loading locations...' : 'Cargando ubicaciones...'}
                        </div>
                      ) : (
                        vendorGroups.map((group) => {
                          const loc = vendorLocations[group.vendorId];
                          return (
                            <div key={group.vendorId} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-900">{group.vendorName}</p>
                              {loc?.address ? (
                                <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {language === 'en' ? 'Address not available' : 'Dirección no disponible'}
                                </p>
                              )}
                              {loc?.coordinates && (
                                <button
                                  type="button"
                                  onClick={() => openInMaps(group.vendorId)}
                                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#55529d] font-medium hover:underline"
                                >
                                  <Navigation className="w-3 h-3" />
                                  {language === 'en' ? 'Get Directions' : 'Obtener Direcciones'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Order Notes */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {language === 'en' ? 'Order Notes (optional)' : 'Notas del Pedido (opcional)'}
                    </h3>
                    <textarea
                      placeholder={language === 'en' ? 'Any special requests...' : 'Solicitudes especiales...'}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit — triggers in-app payment */}
                  <button
                    type="submit"
                    disabled={isPaymentLoading}
                    className="w-full py-3 bg-[#55529d] text-white rounded-xl hover:bg-[#444287] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isPaymentLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {language === 'en' ? 'Preparing payment...' : 'Preparando pago...'}
                      </>
                    ) : (
                      <>
                        {language === 'en'
                          ? `Pay ${formatCurrency(adjustedTotal)}`
                          : `Pagar ${formatCurrency(adjustedTotal)}`
                        }
                      </>
                    )}
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