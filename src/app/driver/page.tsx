// src/app/admin/drivers/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Trash2,
  Eye,
  X,
  Globe,
  Shield,
  UserPlus,
  Package,
  Star,
  Power,
  PowerOff,
  ClipboardList,
  Truck,
  FileText,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================
interface DriverProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  vehicleType: 'motorcycle' | 'car' | 'bicycle' | 'scooter';
  vehiclePlate?: string;
  vehicleColor?: string;
  status: 'offline' | 'available' | 'busy' | 'break';
  isOnline: boolean;
  isVerified: boolean;
  totalDeliveries: number;
  rating: number;
  ratingCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  rejectionReason?: string;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    title: 'Gestión de Conductores',
    subtitle: 'Administra conductores y solicitudes',
    
    // Tabs
    tabDrivers: 'Conductores',
    tabApplications: 'Solicitudes',
    
    // Search
    searchDrivers: 'Buscar conductores...',
    searchApplications: 'Buscar solicitudes...',
    
    // Stats
    totalDrivers: 'Total Conductores',
    activeNow: 'Activos Ahora',
    verified: 'Verificados',
    totalDeliveries: 'Entregas Totales',
    pendingApps: 'Solicitudes Pendientes',
    
    // Filters
    all: 'Todos',
    online: 'En Línea',
    offline: 'Desconectados',
    pending: 'Pendientes',
    approved: 'Aprobadas',
    rejected: 'Rechazadas',
    
    // Table Headers
    driver: 'Conductor',
    contact: 'Contacto',
    vehicle: 'Vehículo',
    stats: 'Estadísticas',
    status: 'Estado',
    actions: 'Acciones',
    applicant: 'Solicitante',
    location: 'Ubicación',
    date: 'Fecha',
    
    // Vehicle Types
    vehicles: {
      motorcycle: 'Motocicleta',
      car: 'Carro',
      bicycle: 'Bicicleta',
      scooter: 'Scooter',
    },
    
    // Status
    statusOnline: 'En Línea',
    statusOffline: 'Desconectado',
    statusBusy: 'Ocupado',
    statusBreak: 'En Descanso',
    statusPending: 'Pendiente',
    statusApproved: 'Aprobado',
    statusRejected: 'Rechazado',
    statusVerified: 'Verificado',
    statusUnverified: 'No Verificado',
    
    // Experience
    experienceOptions: {
      none: 'Sin experiencia',
      lessThan1: 'Menos de 1 año',
      oneToThree: '1-3 años',
      moreThan3: 'Más de 3 años',
    },
    
    // Actions
    viewDetails: 'Ver Detalles',
    approve: 'Aprobar',
    reject: 'Rechazar',
    delete: 'Eliminar',
    verify: 'Verificar',
    unverify: 'Quitar Verificación',
    approving: 'Aprobando...',
    
    // Driver Modal
    driverDetails: 'Detalles del Conductor',
    personalInfo: 'Información Personal',
    vehicleInfo: 'Información del Vehículo',
    performance: 'Rendimiento',
    deliveries: 'Entregas',
    rating: 'Calificación',
    memberSince: 'Miembro desde',
    
    // Application Modal
    applicationDetails: 'Detalles de Solicitud',
    additionalInfo: 'Información Adicional',
    experience: 'Experiencia',
    whyJoin: '¿Por qué quiere unirse?',
    hasLicense: 'Tiene licencia de conducir',
    hasSmartphone: 'Tiene smartphone con datos',
    yes: 'Sí',
    no: 'No',
    submittedOn: 'Enviado el',
    close: 'Cerrar',
    
    // Rejection Modal
    rejectApplication: 'Rechazar Solicitud',
    rejectionReason: 'Motivo del Rechazo (opcional)',
    rejectionPlaceholder: 'Explica el motivo del rechazo...',
    confirmReject: 'Confirmar Rechazo',
    cancel: 'Cancelar',
    
    // Delete Confirmation
    deleteConfirmTitle: '¿Eliminar?',
    deleteConfirmMessage: 'Esta acción no se puede deshacer.',
    confirmDelete: 'Sí, Eliminar',
    
    // Messages
    approveSuccess: 'Solicitud aprobada. Conductor creado.',
    approveError: 'Error al aprobar',
    rejectSuccess: 'Solicitud rechazada',
    rejectError: 'Error al rechazar',
    deleteSuccess: 'Eliminado exitosamente',
    deleteError: 'Error al eliminar',
    verifySuccess: 'Estado de verificación actualizado',
    verifyError: 'Error al actualizar verificación',
    
    // Empty State
    noDrivers: 'No hay conductores',
    noDriversDesc: 'Los conductores aparecerán aquí cuando se registren',
    noApplications: 'No hay solicitudes',
    noApplicationsDesc: 'Las nuevas solicitudes aparecerán aquí',
    noResults: 'Sin resultados',
    noResultsDesc: 'No se encontraron resultados con ese filtro',
    
    // Loading
    loading: 'Cargando...',
  },
  en: {
    title: 'Driver Management',
    subtitle: 'Manage drivers and applications',
    
    // Tabs
    tabDrivers: 'Drivers',
    tabApplications: 'Applications',
    
    // Search
    searchDrivers: 'Search drivers...',
    searchApplications: 'Search applications...',
    
    // Stats
    totalDrivers: 'Total Drivers',
    activeNow: 'Active Now',
    verified: 'Verified',
    totalDeliveries: 'Total Deliveries',
    pendingApps: 'Pending Applications',
    
    // Filters
    all: 'All',
    online: 'Online',
    offline: 'Offline',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    
    // Table Headers
    driver: 'Driver',
    contact: 'Contact',
    vehicle: 'Vehicle',
    stats: 'Stats',
    status: 'Status',
    actions: 'Actions',
    applicant: 'Applicant',
    location: 'Location',
    date: 'Date',
    
    // Vehicle Types
    vehicles: {
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      scooter: 'Scooter',
    },
    
    // Status
    statusOnline: 'Online',
    statusOffline: 'Offline',
    statusBusy: 'Busy',
    statusBreak: 'On Break',
    statusPending: 'Pending',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusVerified: 'Verified',
    statusUnverified: 'Unverified',
    
    // Experience
    experienceOptions: {
      none: 'No experience',
      lessThan1: 'Less than 1 year',
      oneToThree: '1-3 years',
      moreThan3: 'More than 3 years',
    },
    
    // Actions
    viewDetails: 'View Details',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    verify: 'Verify',
    unverify: 'Unverify',
    approving: 'Approving...',
    
    // Driver Modal
    driverDetails: 'Driver Details',
    personalInfo: 'Personal Information',
    vehicleInfo: 'Vehicle Information',
    performance: 'Performance',
    deliveries: 'Deliveries',
    rating: 'Rating',
    memberSince: 'Member since',
    
    // Application Modal
    applicationDetails: 'Application Details',
    additionalInfo: 'Additional Information',
    experience: 'Experience',
    whyJoin: 'Why do they want to join?',
    hasLicense: 'Has driver\'s license',
    hasSmartphone: 'Has smartphone with data',
    yes: 'Yes',
    no: 'No',
    submittedOn: 'Submitted on',
    close: 'Close',
    
    // Rejection Modal
    rejectApplication: 'Reject Application',
    rejectionReason: 'Rejection Reason (optional)',
    rejectionPlaceholder: 'Explain the reason for rejection...',
    confirmReject: 'Confirm Rejection',
    cancel: 'Cancel',
    
    // Delete Confirmation
    deleteConfirmTitle: 'Delete?',
    deleteConfirmMessage: 'This action cannot be undone.',
    confirmDelete: 'Yes, Delete',
    
    // Messages
    approveSuccess: 'Application approved. Driver created.',
    approveError: 'Error approving',
    rejectSuccess: 'Application rejected',
    rejectError: 'Error rejecting',
    deleteSuccess: 'Deleted successfully',
    deleteError: 'Error deleting',
    verifySuccess: 'Verification status updated',
    verifyError: 'Error updating verification',
    
    // Empty State
    noDrivers: 'No drivers',
    noDriversDesc: 'Drivers will appear here when they register',
    noApplications: 'No applications',
    noApplicationsDesc: 'New applications will appear here',
    noResults: 'No results',
    noResultsDesc: 'No results found with that filter',
    
    // Loading
    loading: 'Loading...',
  },
};

type Language = 'es' | 'en';
type Tab = 'drivers' | 'applications';
type DriverFilter = 'all' | 'online' | 'offline';
type AppFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminDriversPage() {
  const [language, setLanguage] = useState<Language>('es');
  const [activeTab, setActiveTab] = useState<Tab>('drivers');
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState<DriverFilter>('all');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  
  // Modals
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [selectedApp, setSelectedApp] = useState<DriverApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingApp, setRejectingApp] = useState<DriverApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'driver' | 'app'; id: string } | null>(null);
  
  // Processing state
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

  // Fetch drivers
  useEffect(() => {
    const driversQuery = query(
      collection(db, 'drivers'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(driversQuery, (snapshot) => {
      const driverList: DriverProfile[] = [];
      snapshot.forEach((doc) => {
        driverList.push({ id: doc.id, ...doc.data() } as DriverProfile);
      });
      setDrivers(driverList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch applications
  useEffect(() => {
    const applicationsQuery = query(
      collection(db, 'driver_applications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const appList: DriverApplication[] = [];
      snapshot.forEach((doc) => {
        appList.push({ id: doc.id, ...doc.data() } as DriverApplication);
      });
      setApplications(appList);
    });

    return () => unsubscribe();
  }, []);

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    if (driverFilter === 'online' && !driver.isOnline) return false;
    if (driverFilter === 'offline' && driver.isOnline) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        driver.name?.toLowerCase().includes(query) ||
        driver.email?.toLowerCase().includes(query) ||
        driver.phone?.includes(query)
      );
    }
    return true;
  });

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    if (appFilter !== 'all' && app.status !== appFilter) return false;

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
    totalDrivers: drivers.length,
    activeNow: drivers.filter((d) => d.isOnline).length,
    verified: drivers.filter((d) => d.isVerified).length,
    totalDeliveries: drivers.reduce((sum, d) => sum + (d.totalDeliveries || 0), 0),
    pendingApps: applications.filter((a) => a.status === 'pending').length,
  };

  // Format date
  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return '-';
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
      // Create driver document
      const driverRef = doc(db, 'drivers', app.id);
      await setDoc(driverRef, {
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

  // Toggle driver verification
  const handleToggleVerification = async (driver: DriverProfile) => {
    setProcessingId(driver.id);
    setMessage(null);

    try {
      const driverRef = doc(db, 'drivers', driver.id);
      await updateDoc(driverRef, {
        isVerified: !driver.isVerified,
        updatedAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: t.verifySuccess });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error updating verification:', err);
      setMessage({ type: 'error', text: t.verifyError });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!showDeleteConfirm) return;

    setProcessingId(showDeleteConfirm.id);
    setMessage(null);

    try {
      const collectionName = showDeleteConfirm.type === 'driver' ? 'drivers' : 'driver_applications';
      await deleteDoc(doc(db, collectionName, showDeleteConfirm.id));
      
      setMessage({ type: 'success', text: t.deleteSuccess });
      setShowDeleteConfirm(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting:', err);
      setMessage({ type: 'error', text: t.deleteError });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  // Get vehicle icon
  const getVehicleIcon = (type: string) => {
    return type === 'car' ? <Car className="w-4 h-4" /> : <Bike className="w-4 h-4" />;
  };

  // Driver status badge
  const DriverStatusBadge = ({ driver }: { driver: DriverProfile }) => {
    if (driver.isOnline) {
      if (driver.status === 'busy') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            {t.statusBusy}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {t.statusOnline}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        {t.statusOffline}
      </span>
    );
  };

  // App status badge
  const AppStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-600 text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            {t.statusPending}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full">
            <CheckCircle className="w-3 h-3" />
            {t.statusApproved}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded-full">
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
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDrivers}</p>
              <p className="text-xs text-gray-500">{t.totalDrivers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Power className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.activeNow}</p>
              <p className="text-xs text-gray-500">{t.activeNow}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
              <p className="text-xs text-gray-500">{t.verified}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.totalDeliveries}</p>
              <p className="text-xs text-gray-500">{t.totalDeliveries}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingApps}</p>
              <p className="text-xs text-gray-500">{t.pendingApps}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => {
              setActiveTab('drivers');
              setSearchQuery('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'drivers'
                ? 'text-sb-primary border-b-2 border-sb-primary bg-sb-primary/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-5 h-5" />
            {t.tabDrivers}
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {drivers.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveTab('applications');
              setSearchQuery('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'applications'
                ? 'text-sb-primary border-b-2 border-sb-primary bg-sb-primary/5'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            {t.tabApplications}
            {stats.pendingApps > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white">
                {stats.pendingApps}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'drivers' ? t.searchDrivers : t.searchApplications}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sb-primary/20 focus:border-sb-primary transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {activeTab === 'drivers' ? (
                <>
                  {(['all', 'online', 'offline'] as DriverFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDriverFilter(filter)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        driverFilter === filter
                          ? 'bg-sb-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t[filter as keyof typeof t] as string}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {(['all', 'pending', 'approved', 'rejected'] as AppFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAppFilter(filter)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        appFilter === filter
                          ? 'bg-sb-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t[filter as keyof typeof t] as string}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'drivers' ? (
          /* DRIVERS TABLE */
          filteredDrivers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery || driverFilter !== 'all' ? t.noResults : t.noDrivers}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchQuery || driverFilter !== 'all' ? t.noResultsDesc : t.noDriversDesc}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.driver}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{t.contact}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">{t.vehicle}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t.stats}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.status}</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sb-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-sb-primary">
                              {driver.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{driver.name}</p>
                              {driver.isVerified && (
                                <Shield className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate md:hidden">{driver.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {driver.email}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {driver.phone || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getVehicleIcon(driver.vehicleType)}
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{t.vehicles[driver.vehicleType]}</p>
                            {driver.vehiclePlate && (
                              <p className="text-xs text-gray-500">{driver.vehiclePlate}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="font-semibold text-gray-900">{driver.totalDeliveries || 0}</p>
                            <p className="text-xs text-gray-500">{t.deliveries}</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-amber-500">⭐ {driver.rating?.toFixed(1) || '5.0'}</p>
                            <p className="text-xs text-gray-500">{t.rating}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <DriverStatusBadge driver={driver} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDriver(driver)}
                            className="p-2 text-gray-500 hover:text-sb-primary hover:bg-sb-primary/10 rounded-lg transition-colors"
                            title={t.viewDetails}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleVerification(driver)}
                            disabled={processingId === driver.id}
                            className={`p-2 rounded-lg transition-colors ${
                              driver.isVerified
                                ? 'text-blue-500 hover:bg-blue-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={driver.isVerified ? t.unverify : t.verify}
                          >
                            {processingId === driver.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'driver', id: driver.id })}
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
          )
        ) : (
          /* APPLICATIONS TABLE */
          filteredApplications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {searchQuery || appFilter !== 'all' ? t.noResults : t.noApplications}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchQuery || appFilter !== 'all' ? t.noResultsDesc : t.noApplicationsDesc}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.applicant}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">{t.contact}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">{t.vehicle}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">{t.location}</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.status}</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-amber-600">
                              {app.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{app.fullName}</p>
                            <p className="text-xs text-gray-500">{formatDate(app.createdAt)}</p>
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
                            <p className="text-sm text-gray-900">{t.vehicles[app.vehicleType]}</p>
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
                        <AppStatusBadge status={app.status} />
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
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title={t.reject}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'app', id: app.id })}
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
          )
        )}
      </div>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{t.driverDetails}</h2>
              <button
                onClick={() => setSelectedDriver(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-sb-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-sb-primary">
                    {selectedDriver.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedDriver.name}</h3>
                    {selectedDriver.isVerified && <Shield className="w-5 h-5 text-blue-500" />}
                  </div>
                  <DriverStatusBadge driver={selectedDriver} />
                </div>
              </div>

              {/* Contact */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.personalInfo}</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {selectedDriver.email}
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedDriver.phone || '-'}
                  </p>
                  {selectedDriver.city && (
                    <p className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {selectedDriver.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Vehicle */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.vehicleInfo}</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">{t.vehicle}</p>
                      <p className="text-sm font-medium">{t.vehicles[selectedDriver.vehicleType]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Placa</p>
                      <p className="text-sm font-medium">{selectedDriver.vehiclePlate || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Color</p>
                      <p className="text-sm font-medium">{selectedDriver.vehicleColor || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.performance}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{selectedDriver.totalDeliveries || 0}</p>
                    <p className="text-xs text-gray-500">{t.deliveries}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-500">⭐ {selectedDriver.rating?.toFixed(1) || '5.0'}</p>
                    <p className="text-xs text-gray-500">{t.rating}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedDriver.createdAt)}</p>
                    <p className="text-xs text-gray-500">{t.memberSince}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{t.applicationDetails}</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Status & Date */}
              <div className="flex items-center justify-between">
                <AppStatusBadge status={selectedApp.status} />
                <p className="text-sm text-gray-500">
                  {t.submittedOn}: {formatDate(selectedApp.createdAt)}
                </p>
              </div>

              {/* Personal Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.personalInfo}</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-amber-600">
                        {selectedApp.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedApp.fullName}</p>
                      <p className="text-sm text-gray-500">{selectedApp.city}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a href={`mailto:${selectedApp.email}`} className="text-sm text-gray-600 flex items-center gap-2 hover:text-sb-primary">
                      <Mail className="w-4 h-4" />
                      {selectedApp.email}
                    </a>
                    <a href={`tel:${selectedApp.phone}`} className="text-sm text-gray-600 flex items-center gap-2 hover:text-sb-primary">
                      <Phone className="w-4 h-4" />
                      {selectedApp.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.vehicleInfo}</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">{t.vehicle}</p>
                      <div className="flex items-center gap-2">
                        {getVehicleIcon(selectedApp.vehicleType)}
                        <span className="text-sm font-medium">{t.vehicles[selectedApp.vehicleType]}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Placa</p>
                      <p className="text-sm font-medium">{selectedApp.vehiclePlate || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Color</p>
                      <p className="text-sm font-medium">{selectedApp.vehicleColor || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t.additionalInfo}</h4>
                <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t.experience}</p>
                    <p className="text-sm text-gray-900">
                      {selectedApp.experience
                        ? t.experienceOptions[selectedApp.experience as keyof typeof t.experienceOptions] || selectedApp.experience
                        : '-'}
                    </p>
                  </div>
                  {selectedApp.whyJoin && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.whyJoin}</p>
                      <p className="text-sm text-gray-900">{selectedApp.whyJoin}</p>
                    </div>
                  )}
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

              {/* Rejection Reason */}
              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-xs text-red-500 font-medium mb-1">{t.rejectionReason}</p>
                  <p className="text-sm text-red-700">{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>
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
                onClick={handleDelete}
                disabled={processingId === showDeleteConfirm.id}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                {processingId === showDeleteConfirm.id ? (
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