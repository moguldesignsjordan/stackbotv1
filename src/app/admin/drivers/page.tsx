// src/app/admin/drivers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Car, Clock, CheckCircle, XCircle, User, Phone, Mail, MapPin, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp, Bell, ExternalLink } from 'lucide-react';

interface DriverApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleColor?: string;
  experience: string;
  whyJoin?: string;
  hasLicense: boolean;
  hasPhone: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  vehicleType: string;
  totalDeliveries: number;
  rating: number;
  verified: boolean;
  createdAt: any;
}

const vehicleLabels: Record<string, string> = {
  motorcycle: 'Motocicleta',
  car: 'Carro',
  bicycle: 'Bicicleta',
  scooter: 'Scooter',
};

const experienceLabels: Record<string, string> = {
  none: 'Sin experiencia',
  lessThan1: 'Menos de 1 año',
  oneToThree: '1-3 años',
  moreThan3: 'Más de 3 años',
};

export default function AdminDriversPage() {
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'drivers'>('applications');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    // Listen to driver applications
    const appsQuery = query(
      collection(db, 'driver_applications'),
      orderBy('createdAt', 'desc')
    );

    const unsubApps = onSnapshot(appsQuery, (snapshot) => {
      const apps = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DriverApplication[];
      setApplications(apps);
      setLoading(false);
    });

    // Listen to approved drivers
    const driversQuery = query(
      collection(db, 'drivers'),
      orderBy('createdAt', 'desc')
    );

    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      const driverList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Driver[];
      setDrivers(driverList);
    });

    return () => {
      unsubApps();
      unsubDrivers();
    };
  }, []);

  const approveApplication = async (app: DriverApplication) => {
    setProcessingId(app.id);
    try {
      // Update application status
      await updateDoc(doc(db, 'driver_applications', app.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
      });

      // Create driver profile (using email as temp ID - will be linked when driver logs in)
      const driverData = {
        name: app.fullName,
        email: app.email,
        phone: app.phone,
        city: app.city,
        vehicleType: app.vehicleType,
        vehiclePlate: app.vehiclePlate,
        vehicleColor: app.vehicleColor || '',
        status: 'offline',
        isOnline: false,
        verified: true,
        isVerified: true,
        rating: 5.0,
        ratingCount: 0,
        totalDeliveries: 0,
        applicationId: app.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Store pending driver (will be moved to drivers/{uid} when they sign up)
      await setDoc(doc(db, 'approved_drivers', app.email.replace(/[.]/g, '_')), driverData);

      alert(`✅ ${app.fullName} ha sido aprobado como conductor`);
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Error al aprobar la aplicación');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectApplication = async (appId: string) => {
    if (!rejectionReason.trim()) {
      alert('Por favor ingresa una razón para el rechazo');
      return;
    }

    setProcessingId(appId);
    try {
      await updateDoc(doc(db, 'driver_applications', appId), {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: serverTimestamp(),
      });

      setShowRejectModal(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Error al rechazar la aplicación');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingApps = applications.filter((a) => a.status === 'pending');
  const reviewedApps = applications.filter((a) => a.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with Link to Driver Applications */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Conductores</h1>
          <Link
            href="/admin/driver-applications"
            className="relative flex items-center gap-2 px-3 py-1.5 bg-[#55529d] text-white text-sm font-medium rounded-lg hover:bg-[#444280] transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Solicitudes</span>
            <ExternalLink className="w-3 h-3" />
            {pendingApps.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingApps.length}
              </span>
            )}
          </Link>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'applications'
                ? 'bg-white text-[#55529d] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Solicitudes ({pendingApps.length})
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'drivers'
                ? 'bg-white text-[#55529d] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Conductores ({drivers.length})
          </button>
        </div>
      </div>

      {/* Pending Applications Alert Banner */}
      {pendingApps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">
                {pendingApps.length} solicitud{pendingApps.length !== 1 ? 'es' : ''} pendiente{pendingApps.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-600">Revisa y aprueba las solicitudes de nuevos conductores</p>
            </div>
          </div>
          <Link
            href="/admin/driver-applications"
            className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors text-sm"
          >
            Revisar Ahora
          </Link>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Pending Applications */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pendientes ({pendingApps.length})
            </h2>

            {pendingApps.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApps.map((app) => (
                  <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{app.fullName}</p>
                            <p className="text-sm text-gray-500">{app.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            Pendiente
                          </span>
                          {expandedApp === app.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedApp === app.id && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{app.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{app.city}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Car className="w-4 h-4 text-gray-400" />
                              <span>{vehicleLabels[app.vehicleType] || app.vehicleType} - {app.vehiclePlate}</span>
                              {app.vehicleColor && <span className="text-gray-400">({app.vehicleColor})</span>}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>Experiencia: {experienceLabels[app.experience] || app.experience}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>Licencia: {app.hasLicense ? '✅ Sí' : '❌ No'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>Smartphone: {app.hasPhone ? '✅ Sí' : '❌ No'}</span>
                            </div>
                          </div>
                        </div>

                        {app.whyJoin && (
                          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">¿Por qué quiere unirse?</p>
                            <p className="text-sm text-gray-700">{app.whyJoin}</p>
                          </div>
                        )}

                        <div className="text-xs text-gray-400 mb-4">
                          Enviado: {formatDate(app.createdAt)}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => approveApplication(app)}
                            disabled={processingId === app.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            {processingId === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => setShowRejectModal(app.id)}
                            disabled={processingId === app.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewed Applications */}
          {reviewedApps.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Historial</h2>
              <div className="space-y-2">
                {reviewedApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          app.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        {app.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{app.fullName}</p>
                        <p className="text-sm text-gray-500">{app.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          app.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {app.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(app.reviewedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div>
          {drivers.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No hay conductores activos</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#55529d] rounded-full flex items-center justify-center text-white font-bold">
                        {driver.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-500">{driver.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          driver.status === 'online'
                            ? 'bg-green-100 text-green-700'
                            : driver.status === 'busy'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            driver.status === 'online'
                              ? 'bg-green-500'
                              : driver.status === 'busy'
                              ? 'bg-orange-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        {driver.status === 'online' ? 'En línea' : driver.status === 'busy' ? 'Ocupado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-600">
                    <span>{vehicleLabels[driver.vehicleType] || driver.vehicleType}</span>
                    <span>{driver.totalDeliveries} entregas</span>
                    <span>★ {driver.rating?.toFixed(1) || '5.0'}</span>
                    {driver.verified && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verificado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Rechazar Solicitud</h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Por favor indica la razón del rechazo
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Razón del rechazo..."
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d]/20 focus:border-[#55529d] resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => rejectApplication(showRejectModal)}
                disabled={processingId !== null || !rejectionReason.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {processingId && <Loader2 className="w-4 h-4 animate-spin" />}
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}