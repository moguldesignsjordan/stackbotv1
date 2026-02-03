// src/app/admin/driver-applications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import {
  Users,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Car,
  Bike,
  FileText,
  Trash2,
  UserPlus,
  Eye,
  X,
  Globe,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface DriverApplication {
  id: string;
  uid?: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  vehicleType: 'motorcycle' | 'car' | 'bicycle' | 'scooter';
  vehiclePlate: string;
  vehicleColor: string;
  experience: string;
  whyJoin: string;
  hasLicense: boolean;
  hasPhone: boolean;
  agreeTerms: boolean;
  status: 'pending' | 'approved' | 'rejected';
  language: 'es' | 'en';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    title: 'Solicitudes de Conductores',
    subtitle: 'Gestiona las solicitudes de nuevos conductores',
    
    all: 'Todas',
    pending: 'Pendientes',
    approved: 'Aprobadas',
    rejected: 'Rechazadas',
    searchPlaceholder: 'Buscar por nombre, email o teléfono...',
    
    totalApplications: 'Total Solicitudes',
    pendingReview: 'Pendientes',
    approvedCount: 'Aprobadas',
    rejectedCount: 'Rechazadas',
    
    applicant: 'Solicitante',
    contact: 'Contacto',
    vehicle: 'Vehículo',
    location: 'Ubicación',
    status: 'Estado',
    date: 'Fecha',
    actions: 'Acciones',
    
    vehicles: {
      motorcycle: 'Motocicleta',
      car: 'Carro',
      bicycle: 'Bicicleta',
      scooter: 'Scooter',
    },
    
    statusPending: 'Pendiente',
    statusApproved: 'Aprobado',
    statusRejected: 'Rechazado',
    
    viewDetails: 'Ver Detalles',
    approve: 'Aprobar',
    reject: 'Rechazar',
    delete: 'Eliminar',
    approving: 'Aprobando...',
    
    applicationDetails: 'Detalles de Solicitud',
    personalInfo: 'Información Personal',
    vehicleInfo: 'Información del Vehículo',
    additionalInfo: 'Información Adicional',
    experience: 'Experiencia',
    whyJoin: '¿Por qué quiere unirse?',
    hasLicense: 'Tiene licencia de conducir',
    hasSmartphone: 'Tiene smartphone con datos',
    yes: 'Sí',
    no: 'No',
    submittedOn: 'Enviado el',
    submittedIn: 'Idioma de solicitud',
    close: 'Cerrar',
    
    rejectApplication: 'Rechazar Solicitud',
    rejectionReason: 'Motivo del Rechazo (opcional)',
    rejectionPlaceholder: 'Explica el motivo del rechazo...',
    confirmReject: 'Confirmar Rechazo',
    cancel: 'Cancelar',
    
    deleteConfirmTitle: '¿Eliminar solicitud?',
    deleteConfirmMessage: 'Esta acción no se puede deshacer.',
    confirmDelete: 'Sí, Eliminar',
    
    approveSuccess: 'Solicitud aprobada. Conductor creado exitosamente.',
    approveError: 'Error al aprobar la solicitud',
    rejectSuccess: 'Solicitud rechazada',
    rejectError: 'Error al rechazar la solicitud',
    deleteSuccess: 'Solicitud eliminada',
    deleteError: 'Error al eliminar la solicitud',
    
    noApplications: 'No hay solicitudes',
    noApplicationsDesc: 'Las nuevas solicitudes aparecerán aquí',
    noResults: 'Sin resultados',
    noResultsDesc: 'No se encontraron solicitudes con ese filtro',
    
    loading: 'Cargando solicitudes...',
  },
  en: {
    title: 'Driver Applications',
    subtitle: 'Manage new driver applications',
    
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    searchPlaceholder: 'Search by name, email or phone...',
    
    totalApplications: 'Total Applications',
    pendingReview: 'Pending',
    approvedCount: 'Approved',
    rejectedCount: 'Rejected',
    
    applicant: 'Applicant',
    contact: 'Contact',
    vehicle: 'Vehicle',
    location: 'Location',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
    
    vehicles: {
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      scooter: 'Scooter',
    },
    
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    
    viewDetails: 'View Details',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    approving: 'Approving...',
    
    applicationDetails: 'Application Details',
    personalInfo: 'Personal Information',
    vehicleInfo: 'Vehicle Information',
    additionalInfo: 'Additional Information',
    experience: 'Experience',
    whyJoin: 'Why do they want to join?',
    hasLicense: 'Has driver\'s license',
    hasSmartphone: 'Has smartphone with data',
    yes: 'Yes',
    no: 'No',
    submittedOn: 'Submitted on',
    submittedIn: 'Application language',
    close: 'Close',
    
    rejectApplication: 'Reject Application',
    rejectionReason: 'Rejection Reason (optional)',
    rejectionPlaceholder: 'Explain the reason for rejection...',
    confirmReject: 'Confirm Rejection',
    cancel: 'Cancel',
    
    deleteConfirmTitle: 'Delete application?',
    deleteConfirmMessage: 'This action cannot be undone.',
    confirmDelete: 'Yes, Delete',
    
    approveSuccess: 'Application approved. Driver created successfully.',
    approveError: 'Error approving application',
    rejectSuccess: 'Application rejected',
    rejectError: 'Error rejecting application',
    deleteSuccess: 'Application deleted',
    deleteError: 'Error deleting application',
    
    noApplications: 'No applications',
    noApplicationsDesc: 'New applications will appear here',
    noResults: 'No results',
    noResultsDesc: 'No applications found with that filter',
    
    loading: 'Loading applications...',
  },
};

type Language = 'es' | 'en';
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function DriverApplicationsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<DriverApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const t = translations[language];

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-admin-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-admin-lang', newLang);
  };

  useEffect(() => {
    const q = query(
      collection(db, 'driver_applications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps: DriverApplication[] = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() } as DriverApplication);
      });
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch =
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp?.toDate) return '-';
    return timestamp.toDate().toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ✅ SIMPLIFIED APPROVAL - Just create driver doc
  const handleApprove = async (app: DriverApplication) => {
    setProcessingId(app.id);
    setMessage(null);

    try {
      console.log('=== APPROVING DRIVER ===');
      console.log('Application ID:', app.id);
      console.log('Email:', app.email);

      // Create driver document (Firestore rules allow access if doc exists)
      await setDoc(doc(db, 'drivers', app.id), {
        userId: app.id,
        applicationId: app.id,
        name: app.fullName,
        email: app.email,
        phone: app.phone,
        city: app.city,
        vehicleType: app.vehicleType,
        vehiclePlate: app.vehiclePlate,
        vehicleColor: app.vehicleColor,
        status: 'offline',
        isOnline: false,
        isVerified: true,
        verified: true,
        rating: 5.0,
        ratingCount: 0,
        totalDeliveries: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update application status
      await updateDoc(doc(db, 'driver_applications', app.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Store in approved_drivers for future logins
      const emailKey = app.email.replace(/[.]/g, '_');
      await setDoc(doc(db, 'approved_drivers', emailKey), {
        applicationId: app.id,
        name: app.fullName,
        email: app.email,
        phone: app.phone,
        city: app.city,
        vehicleType: app.vehicleType,
        vehiclePlate: app.vehiclePlate,
        vehicleColor: app.vehicleColor,
        status: 'offline',
        isOnline: false,
        verified: true,
        isVerified: true,
        rating: 5.0,
        ratingCount: 0,
        totalDeliveries: 0,
      });

      console.log('✅ Driver approved successfully');

      setMessage({ type: 'success', text: t.approveSuccess });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error approving:', err);
      setMessage({ type: 'error', text: t.approveError });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingApp) return;

    setProcessingId(rejectingApp.id);
    setMessage(null);

    try {
      await updateDoc(doc(db, 'driver_applications', rejectingApp.id), {
        status: 'rejected',
        rejectionReason: rejectionReason || null,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: t.rejectSuccess });
      setShowRejectModal(false);
      setRejectingApp(null);
      setRejectionReason('');
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error rejecting:', err);
      setMessage({ type: 'error', text: t.rejectError });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (appId: string) => {
    setProcessingId(appId);
    setMessage(null);

    try {
      await deleteDoc(doc(db, 'driver_applications', appId));
      setMessage({ type: 'success', text: t.deleteSuccess });
      setShowDeleteConfirm(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error deleting:', err);
      setMessage({ type: 'error', text: t.deleteError });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car className="w-4 h-4" />;
      default:
        return <Bike className="w-4 h-4" />;
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            {t.statusPending}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            {t.statusApproved}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded-full">
            <XCircle className="w-3 h-3" />
            {t.statusRejected}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-sb-primary mx-auto" />
          <p className="text-gray-500 mt-2">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'es' ? 'English' : 'Español'}</span>
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">{t.totalApplications}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">{t.pendingReview}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
              <p className="text-xs text-gray-500">{t.approvedCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-gray-500">{t.rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? 'bg-sb-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t[status as keyof typeof t] as string} (
              {status === 'all' ? stats.total : stats[status as 'pending' | 'approved' | 'rejected']})
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? t.noResults : t.noApplications}
          </h3>
          <p className="text-gray-500">
            {searchQuery ? t.noResultsDesc : t.noApplicationsDesc}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t.applicant}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    {t.contact}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t.vehicle}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    {t.location}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {app.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{app.fullName}</p>
                          <p className="text-sm text-gray-500 sm:hidden">{app.email}</p>
                          <p className="text-xs text-gray-400">{formatDate(app.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {app.email}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {app.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getVehicleIcon(app.vehicleType)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {t.vehicles[app.vehicleType as keyof typeof t.vehicles]}
                          </p>
                          {app.vehiclePlate && (
                            <p className="text-xs text-gray-500">{app.vehiclePlate}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <p className="text-sm text-gray-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {app.city}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="p-2 text-gray-500 hover:text-sb-primary hover:bg-sb-primary/10 rounded-lg transition-colors"
                          title={t.viewDetails}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={processingId === app.id}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t.approve}
                            >
                              {processingId === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setRejectingApp(app);
                                setShowRejectModal(true);
                              }}
                              disabled={processingId === app.id}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t.reject}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setShowDeleteConfirm(app.id)}
                          disabled={processingId === app.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title={t.delete}
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
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t.applicationDetails}</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {t.personalInfo}
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Nombre:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedApp.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedApp.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Teléfono:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedApp.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Ciudad:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedApp.city}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {getVehicleIcon(selectedApp.vehicleType)}
                  {t.vehicleInfo}
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tipo:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {t.vehicles[selectedApp.vehicleType as keyof typeof t.vehicles]}
                    </span>
                  </div>
                  {selectedApp.vehiclePlate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Placa:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedApp.vehiclePlate}</span>
                    </div>
                  )}
                  {selectedApp.vehicleColor && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Color:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedApp.vehicleColor}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t.additionalInfo}
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t.experience}:</p>
                    <p className="text-sm font-medium text-gray-900">{selectedApp.experience}</p>
                  </div>
                  {selectedApp.whyJoin && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t.whyJoin}:</p>
                      <p className="text-sm text-gray-900">{selectedApp.whyJoin}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">{t.hasLicense}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedApp.hasLicense ? t.yes : t.no}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t.hasSmartphone}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedApp.hasPhone ? t.yes : t.no}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">{t.submittedOn}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(selectedApp.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t.submittedIn}:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedApp.language === 'es' ? 'Español' : 'English'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setSelectedApp(null)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t.rejectApplication}</h2>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">{rejectingApp.fullName}</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t.rejectionPlaceholder}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent resize-none"
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingApp(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleReject}
                disabled={processingId !== null}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingId === rejectingApp.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.approving}
                  </>
                ) : (
                  t.confirmReject
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t.deleteConfirmTitle}</h2>
            </div>

            <div className="p-6">
              <p className="text-gray-600">{t.deleteConfirmMessage}</p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={processingId !== null}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processingId === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.approving}
                  </>
                ) : (
                  t.confirmDelete
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}