// src/app/driver/delivery/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import {
  Package,
  MapPin,
  Phone,
  Navigation,
  Store,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ActiveDelivery {
  orderId: string;
  queueId: string;
  vendorId: string;
  vendorName: string;
  vendorAddress: string;
  vendorPhone?: string;
  customerName?: string;
  customerAddress: string;
  customerPhone?: string;
  deliveryFee: number;
  itemCount: number;
  status: 'heading_to_pickup' | 'at_pickup' | 'picked_up' | 'heading_to_customer' | 'at_customer' | 'delivered';
  acceptedAt: any;
}

type DeliveryStatus = ActiveDelivery['status'];

const translations = {
  es: {
    headingToPickup: 'Dirígete al Restaurante',
    atPickup: 'Llegaste al Restaurante',
    pickedUp: 'Pedido Recogido',
    headingToCustomer: 'Dirígete al Cliente',
    atCustomer: 'Llegaste al Destino',
    delivered: 'Entrega Completada',
    headingToPickupDesc: 'Ve a recoger el pedido',
    atPickupDesc: 'Recoge el pedido del restaurante',
    pickedUpDesc: 'Confirma que tienes todos los artículos',
    headingToCustomerDesc: 'Lleva el pedido al cliente',
    atCustomerDesc: 'Entrega el pedido al cliente',
    deliveredDesc: '¡Felicidades! Entrega completada',
    arrivedAtPickup: 'Llegué al Restaurante',
    confirmPickup: 'Confirmar Recogida',
    startDelivery: 'Iniciar Entrega',
    arrivedAtCustomer: 'Llegué al Destino',
    confirmDelivery: 'Confirmar Entrega',
    completeDelivery: 'Completar Entrega',
    pickup: 'Recoger',
    deliver: 'Entregar',
    items: 'artículos',
    item: 'artículo',
    fee: 'Tu Ganancia',
    orderId: 'Pedido',
    call: 'Llamar',
    navigate: 'Navegar',
    noActiveDelivery: 'Sin entrega activa',
    noActiveDeliveryDesc: 'Acepta un pedido para comenzar',
    goToDashboard: 'Ir al Inicio',
    updating: 'Actualizando...',
    cancelDelivery: 'Cancelar Entrega',
    cancelConfirm: '¿Cancelar esta entrega?',
    cancelWarning: 'Tu tasa de cancelación puede afectar tu cuenta.',
    confirmCancel: 'Sí, Cancelar',
    keepDelivery: 'No, Continuar',
  },
  en: {
    headingToPickup: 'Head to Restaurant',
    atPickup: 'Arrived at Restaurant',
    pickedUp: 'Order Picked Up',
    headingToCustomer: 'Head to Customer',
    atCustomer: 'Arrived at Destination',
    delivered: 'Delivery Complete',
    headingToPickupDesc: 'Go pick up the order',
    atPickupDesc: 'Pick up the order from the restaurant',
    pickedUpDesc: 'Confirm you have all items',
    headingToCustomerDesc: 'Take the order to the customer',
    atCustomerDesc: 'Deliver the order to the customer',
    deliveredDesc: 'Congratulations! Delivery completed',
    arrivedAtPickup: 'Arrived at Restaurant',
    confirmPickup: 'Confirm Pickup',
    startDelivery: 'Start Delivery',
    arrivedAtCustomer: 'Arrived at Destination',
    confirmDelivery: 'Confirm Delivery',
    completeDelivery: 'Complete Delivery',
    pickup: 'Pickup',
    deliver: 'Deliver',
    items: 'items',
    item: 'item',
    fee: 'Your Earnings',
    orderId: 'Order',
    call: 'Call',
    navigate: 'Navigate',
    noActiveDelivery: 'No active delivery',
    noActiveDeliveryDesc: 'Accept an order to get started',
    goToDashboard: 'Go to Dashboard',
    updating: 'Updating...',
    cancelDelivery: 'Cancel Delivery',
    cancelConfirm: 'Cancel this delivery?',
    cancelWarning: 'Your cancellation rate may affect your account.',
    confirmCancel: 'Yes, Cancel',
    keepDelivery: 'No, Continue',
  },
};

type Language = 'es' | 'en';

const STATUS_CONFIG: Record<DeliveryStatus, { step: number; color: string; bgColor: string }> = {
  heading_to_pickup: { step: 1, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  at_pickup: { step: 2, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  picked_up: { step: 3, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  heading_to_customer: { step: 4, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  at_customer: { step: 5, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  delivered: { step: 6, color: 'text-green-600', bgColor: 'bg-green-100' },
};

export default function ActiveDeliveryPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [delivery, setDelivery] = useState<ActiveDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const t = translations[language];
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'driver_active_deliveries', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          setDelivery(docSnap.data() as ActiveDelivery);
        } else {
          setDelivery(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const getStatusInfo = (status: DeliveryStatus) => {
    const titles: Record<DeliveryStatus, string> = {
      heading_to_pickup: t.headingToPickup,
      at_pickup: t.atPickup,
      picked_up: t.pickedUp,
      heading_to_customer: t.headingToCustomer,
      at_customer: t.atCustomer,
      delivered: t.delivered,
    };
    const descriptions: Record<DeliveryStatus, string> = {
      heading_to_pickup: t.headingToPickupDesc,
      at_pickup: t.atPickupDesc,
      picked_up: t.pickedUpDesc,
      heading_to_customer: t.headingToCustomerDesc,
      at_customer: t.atCustomerDesc,
      delivered: t.deliveredDesc,
    };
    return { title: titles[status], description: descriptions[status], ...STATUS_CONFIG[status] };
  };

  const getNextAction = (status: DeliveryStatus): { label: string; nextStatus: DeliveryStatus | 'complete' } | null => {
    const actions: Record<DeliveryStatus, { label: string; nextStatus: DeliveryStatus | 'complete' }> = {
      heading_to_pickup: { label: t.arrivedAtPickup, nextStatus: 'at_pickup' },
      at_pickup: { label: t.confirmPickup, nextStatus: 'picked_up' },
      picked_up: { label: t.startDelivery, nextStatus: 'heading_to_customer' },
      heading_to_customer: { label: t.arrivedAtCustomer, nextStatus: 'at_customer' },
      at_customer: { label: t.confirmDelivery, nextStatus: 'delivered' },
      delivered: { label: t.completeDelivery, nextStatus: 'complete' },
    };
    return actions[status] || null;
  };

  const updateStatus = async () => {
    if (!userId || !delivery || actionLoading) return;

    const action = getNextAction(delivery.status);
    if (!action) return;

    setActionLoading(true);
    try {
      if (action.nextStatus === 'complete') {
        await completeDelivery();
      } else {
        const updates: any = { status: action.nextStatus };
        if (action.nextStatus === 'picked_up') {
          updates.pickedUpAt = serverTimestamp();
        }

        await updateDoc(doc(db, 'driver_active_deliveries', userId), updates);

        if (delivery.queueId) {
          await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
            status: action.nextStatus,
          });
        }

        if (delivery.orderId) {
          await updateDoc(doc(db, 'orders', delivery.orderId), {
            delivery_status: action.nextStatus,
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const completeDelivery = async () => {
    if (!userId || !delivery) return;

    try {
      await updateDoc(doc(db, 'driver_stats', userId), {
        todayDeliveries: increment(1),
        todayEarnings: increment(delivery.deliveryFee),
        weekDeliveries: increment(1),
        weekEarnings: increment(delivery.deliveryFee),
        totalDeliveries: increment(1),
      });

      await updateDoc(doc(db, 'drivers', userId), { status: 'online' });

      if (delivery.queueId) {
        await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
          status: 'delivered',
          deliveredAt: serverTimestamp(),
        });
      }

      if (delivery.orderId) {
        await updateDoc(doc(db, 'orders', delivery.orderId), {
          status: 'delivered',
          delivery_status: 'delivered',
          deliveredAt: serverTimestamp(),
        });
      }

      await deleteDoc(doc(db, 'driver_active_deliveries', userId));
      router.push('/driver/dashboard');
    } catch (error) {
      console.error('Error completing delivery:', error);
    }
  };

  const cancelDelivery = async () => {
    if (!userId || !delivery) return;

    setActionLoading(true);
    try {
      if (delivery.queueId) {
        await updateDoc(doc(db, 'delivery_queue', delivery.queueId), {
          status: 'pending',
          driverId: null,
          cancelledBy: userId,
          cancelledAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'drivers', userId), { status: 'online' });
      await deleteDoc(doc(db, 'driver_active_deliveries', userId));
      router.push('/driver/dashboard');
    } catch (error) {
      console.error('Error cancelling delivery:', error);
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  const openNavigation = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (amount: number) => `RD$${amount.toLocaleString()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.noActiveDelivery}</h2>
        <p className="text-gray-600 mb-6">{t.noActiveDeliveryDesc}</p>
        <Link
          href="/driver/dashboard"
          className="px-6 py-3 bg-[#55529d] text-white font-semibold rounded-xl hover:bg-[#444280] transition-colors"
        >
          {t.goToDashboard}
        </Link>
      </div>
    );
  }

  const statusInfo = getStatusInfo(delivery.status);
  const nextAction = getNextAction(delivery.status);
  const isPickupPhase = ['heading_to_pickup', 'at_pickup', 'picked_up'].includes(delivery.status);

  return (
    <div className="pb-32">
      <div className={`${statusInfo.bgColor} px-4 py-6`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm">
            {delivery.status === 'delivered' ? (
              <CheckCircle className={`w-7 h-7 ${statusInfo.color}`} />
            ) : (
              <Package className={`w-7 h-7 ${statusInfo.color}`} />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{statusInfo.title}</h1>
            <p className="text-sm text-gray-600">{statusInfo.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors ${
                step <= statusInfo.step ? 'bg-[#55529d]' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500">{t.orderId}</p>
              <p className="font-mono font-semibold text-gray-900">#{delivery.orderId?.slice(-8)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{t.fee}</p>
              <p className="font-bold text-green-600 text-lg">{formatCurrency(delivery.deliveryFee)}</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {delivery.itemCount} {delivery.itemCount === 1 ? t.item : t.items}
          </div>
        </div>

        <div className={`bg-white rounded-xl border ${isPickupPhase ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-200'} overflow-hidden`}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isPickupPhase ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Store className={`w-5 h-5 ${isPickupPhase ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">{t.pickup}</p>
                <p className="font-semibold text-gray-900">{delivery.vendorName}</p>
                <p className="text-sm text-gray-600 mt-0.5">{delivery.vendorAddress}</p>
              </div>
            </div>
          </div>
          
          {isPickupPhase && (
            <div className="border-t border-gray-100 flex">
              <button
                onClick={() => openNavigation(delivery.vendorAddress)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">{t.navigate}</span>
              </button>
              {delivery.vendorPhone && (
                <>
                  <div className="w-px bg-gray-100" />
                  <a
                    href={`tel:${delivery.vendorPhone}`}
                  <a
                    href={`tel:${delivery.vendorPhone}`}
                  <a
                    href={`tel:${delivery.vendorPhone}`}
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.call}</span>
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`bg-white rounded-xl border ${!isPickupPhase ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'} overflow-hidden`}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!isPickupPhase ? 'bg-green-100' : 'bg-gray-100'}`}>
                <MapPin className={`w-5 h-5 ${!isPickupPhase ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">{t.deliver}</p>
                {delivery.customerName && (
                  <p className="font-semibold text-gray-900">{delivery.customerName}</p>
                )}
                <p className="text-sm text-gray-600 mt-0.5">{delivery.customerAddress}</p>
              </div>
            </div>
          </div>
          
          {!isPickupPhase && delivery.status !== 'delivered' && (
            <div className="border-t border-gray-100 flex">
              <button
                onClick={() => openNavigation(delivery.customerAddress)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 hover:bg-green-50 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                <span className="text-sm font-medium">{t.navigate}</span>
              </button>
              {delivery.customerPhone && (
                <>
                  <div className="w-px bg-gray-100" />
                  
                    href={`tel:${delivery.customerPhone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.call}</span>
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {isPickupPhase && delivery.status !== 'picked_up' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full text-center py-3 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
          >
            {t.cancelDelivery}
          </button>
        )}
      </div>

      {nextAction && delivery.status !== 'delivered' && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 safe-area-bottom">
          <button
            onClick={updateStatus}
            disabled={actionLoading}
            className="w-full py-4 bg-[#55529d] text-white font-bold rounded-xl hover:bg-[#444280] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.updating}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {nextAction.label}
              </>
            )}
          </button>
        </div>
      )}

      {delivery.status === 'delivered' && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 safe-area-bottom">
          <button
            onClick={updateStatus}
            disabled={actionLoading}
            className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-lg"
          >
            {actionLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t.updating}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t.completeDelivery}
              </>
            )}
          </button>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{t.cancelConfirm}</h3>
            <p className="text-sm text-gray-600 text-center mb-6">{t.cancelWarning}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t.keepDelivery}
              </button>
              <button
                onClick={cancelDelivery}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
