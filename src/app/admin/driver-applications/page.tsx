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
import { httpsCallable, getFunctions } from 'firebase/functions';
import { formatLocation } from "@/lib/utils/formatLocation";

import {
  Users,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Car,
  Bike,
  FileText,
  Calendar,
  Trash2,
  UserPlus,
  Eye,
  X,
  Globe,
  Shield,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface DriverApplication {
  id: string;
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
    
    // Filters
    all: 'Todas',
    pending: 'Pendientes',
    approved: 'Aprobadas',
    rejected: 'Rechazadas',
    searchPlaceholder: 'Buscar por nombre, email o teléfono...',
    
    // Stats
    totalApplications: 'Total Solicitudes',
    pendingReview: 'Pendientes',
    approvedCount: 'Aprobadas',
    rejectedCount: 'Rechazadas',
    
    // Table Headers
    applicant: 'Solicitante',
    contact: 'Contacto',
    vehicle: 'Vehículo',
    location: 'Ubicación',
    status: 'Estado',
    date: 'Fecha',
    actions: 'Acciones',
    
    // Vehicle Types
    vehicles: {
      motorcycle: 'Motocicleta',
      car: 'Carro',
      bicycle: 'Bicicleta',
      scooter: 'Scooter',
    },
    
    // Experience
    experienceOptions: {
      none: 'Sin experiencia',
      lessThan1: 'Menos de 1 año',
      oneToThree: '1-3 años',
      moreThan3: 'Más de 3 años',
    },
    
    // Status
    statusPending: 'Pendiente',
    statusApproved: 'Aprobado',
    statusRejected: 'Rechazado',
    
    // Actions
    viewDetails: 'Ver Detalles',
    approve: 'Aprobar',
    reject: 'Rechazar',
    delete: 'Eliminar',
    approving: 'Aprobando...',
    
    // Modal
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
    
    // Rejection Modal
    rejectApplication: 'Rechazar Solicitud',
    rejectionReason: 'Motivo del Rechazo (opcional)',
    rejectionPlaceholder: 'Explica el motivo del rechazo...',
    confirmReject: 'Confirmar Rechazo',
    cancel: 'Cancelar',
    
    // Delete Confirmation
    deleteConfirmTitle: '¿Eliminar solicitud?',
    deleteConfirmMessage: 'Esta acción no se puede deshacer.',
    confirmDelete: 'Sí, Eliminar',
    
    // Messages
    approveSuccess: 'Solicitud aprobada. Conductor creado exitosamente.',
    approveError: 'Error al aprobar la solicitud',
    rejectSuccess: 'Solicitud rechazada',
    rejectError: 'Error al rechazar la solicitud',
    deleteSuccess: 'Solicitud eliminada',
    deleteError: 'Error al eliminar la solicitud',
    
    // Empty State
    noApplications: 'No hay solicitudes',
    noApplicationsDesc: 'Las nuevas solicitudes aparecerán aquí',
    noResults: 'Sin resultados',
    noResultsDesc: 'No se encontraron solicitudes con ese filtro',
    
    // Loading
    loading: 'Cargando solicitudes...',
  },
  en: {
    title: 'Driver Applications',
    subtitle: 'Manage new driver applications',
    
    // Filters
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    searchPlaceholder: 'Search by name, email or phone...',
    
    // Stats
    totalApplications: 'Total Applications',
    pendingReview: 'Pending',
    approvedCount: 'Approved',
    rejectedCount: 'Rejected',
    
    // Table Headers
    applicant: 'Applicant',
    contact: 'Contact',
    vehicle: 'Vehicle',
    location: 'Location',
    status: 'Status',
    date: 'Date',
    actions: 'Actions',
    
    // Vehicle Types
    vehicles: {
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      scooter: 'Scooter',
    },
    
    // Experience
    experienceOptions: {
      none: 'No experience',
      lessThan1: 'Less than 1 year',
      oneToThree: '1-3 years',
      moreThan3: 'More than 3 years',
    },
    
    // Status
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    
    // Actions
    viewDetails: 'View Details',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    approving: 'Approving...',
    
    // Modal
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
    
    // Rejection Modal
    rejectApplication: 'Reject Application',
    rejectionReason: 'Rejection Reason (optional)',
    rejectionPlaceholder: 'Explain the reason for rejection...',
    confirmReject: 'Confirm Rejection',
    cancel: 'Cancel',
    
    // Delete Confirmation
    deleteConfirmTitle: 'Delete application?',
    deleteConfirmMessage: 'This action cannot be undone.',
    confirmDelete: 'Yes, Delete',
    
    // Messages
    approveSuccess: 'Application approved. Driver created successfully.',
    approveError: 'Error approving application',
    rejectSuccess: 'Application rejected',
    rejectError: 'Error rejecting application',
    deleteSuccess: 'Application deleted',
    deleteError: 'Error deleting application',
    
    // Empty State
    noApplications: 'No applications',
    noApplicationsDesc: 'New applications will appear here',
    noResults: 'No results',
    noResultsDesc: 'No applications found with that filter',
    
    // Loading
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

  // Load saved language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-admin-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // Toggle language
  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-admin-lang', newLang);
  };

  // Fetch applications
  useEffect(() => {
    const applicationsQuery = query(
      collection(db, 'driver_applications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const apps: DriverApplication[] = [];
      snapshot.forEach((doc) => {
        apps.push({ id: doc.id, ...doc.data() } as DriverApplication);
      });
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    // Status filter
    if (filterStatus !== 'all' && app.status !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        app.fullName.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.phone.includes(query)
      );
    }

    return true;
  });

  // Stats
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  // Format date
  const formatDate = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Approve application
  const handleApprove = async (app: DriverApplication) => {
    setProcessingId(app.id);
    setMessage(null);

    try {
      // First, create the driver document
      const driverRef = doc(db, 'drivers', app.id);
      await setDoc(driverRef, {
        userId: app.id, // Temporary - will be replaced when user creates account
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
        totalDeliveries: 0,
        rating: 5.0,
        ratingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update application status
      const appRef = doc(db, 'driver_applications', app.id);
      await updateDoc(appRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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

  // Reject application
  const handleReject = async () => {
    if (!rejectingApp) return;

    setProcessingId(rejectingApp.id);
    setMessage(null);

    try {
      const appRef = doc(db, 'driver_applications', rejectingApp.id);
      await updateDoc(appRef, {
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

  // Delete application
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

  // Vehicle icon
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car':
        return <Car className="w-4 h-4" />;
      default:
        return <Bike className="w-4 h-4" />;
    }
  };

  // Status badge
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-sb-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t[status as keyof typeof t] as string}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {searchQuery || filterStatus !== 'all' ? t.noResults : t.noApplications}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchQuery || filterStatus !== 'all' ? t.noResultsDesc : t.noApplicationsDesc}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t.applicant}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    {t.contact}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    {t.vehicle}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    {formatLocation(t.location)}
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t.status}
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sb-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-sb-primary">
                            {app.fullName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{app.fullName}</p>
                          <p className="text-sm text-gray-500 truncate md:hidden">{app.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {app.email}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {app.phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getVehicleIcon(app.vehicleType)}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">
                            {t.vehicles[app.vehicleType]}
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
                        {/* View Details */}
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="p-2 text-gray-500 hover:text-sb-primary hover:bg-sb-primary/10 rounded-lg transition-colors"
                          title={t.viewDetails}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Approve (only for pending) */}
                        {app.status === 'pending' && (
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
                        )}

                        {/* Reject (only for pending) */}
                        {app.status === 'pending' && (
                          <button
                            onClick={() => {
                              setRejectingApp(app);
                              setShowRejectModal(true);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t.reject}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => setShowDeleteConfirm(app.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        )}
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{t.applicationDetails}</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Status */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedApp.status} />
                <p className="text-sm text-gray-500">
                  {t.submittedOn}: {formatDate(selectedApp.createdAt)}
                </p>
              </div>

              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.personalInfo}</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-sb-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-sb-primary">
                        {selectedApp.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedApp.fullName}</p>
                      <p className="text-sm text-gray-500">{selectedApp.city}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <a
                      href={`mailto:${selectedApp.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-sb-primary transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      {selectedApp.email}
                    </a>
                    <a
                      href={`tel:${selectedApp.phone}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-sb-primary transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {selectedApp.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.vehicleInfo}</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.vehicle}</p>
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(selectedApp.vehicleType)}
                        <span className="text-sm font-medium text-gray-900">
                          {t.vehicles[selectedApp.vehicleType]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Placa</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedApp.vehiclePlate || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Color</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedApp.vehicleColor || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.additionalInfo}</h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  {/* Experience */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t.experience}</p>
                    <p className="text-sm text-gray-900">
                      {selectedApp.experience
                        ? t.experienceOptions[selectedApp.experience as keyof typeof t.experienceOptions] || selectedApp.experience
                        : '-'}
                    </p>
                  </div>

                  {/* Why Join */}
                  {selectedApp.whyJoin && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.whyJoin}</p>
                      <p className="text-sm text-gray-900">{selectedApp.whyJoin}</p>
                    </div>
                  )}

                  {/* Checkboxes */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      {selectedApp.hasLicense ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">{t.hasLicense}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedApp.hasPhone ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">{t.hasSmartphone}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection Reason (if rejected) */}
              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-xs text-red-500 font-medium mb-1">{t.rejectionReason}</p>
                  <p className="text-sm text-red-700">{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              {selectedApp.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setRejectingApp(selectedApp);
                      setShowRejectModal(true);
                      setSelectedApp(null);
                    }}
                    className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    {t.reject}
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedApp);
                      setSelectedApp(null);
                    }}
                    disabled={processingId === selectedApp.id}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processingId === selectedApp.id ? t.approving : t.approve}
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t.rejectApplication}</h2>
                  <p className="text-sm text-gray-500">{rejectingApp.fullName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.rejectionReason}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t.rejectionPlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingApp(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectingApp.id}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {processingId === rejectingApp.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.confirmReject
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t.deleteConfirmTitle}</h2>
              <p className="text-gray-500 text-sm mb-6">{t.deleteConfirmMessage}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={processingId === showDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {processingId === showDeleteConfirm ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
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