// src/app/driver/apply/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Truck,
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  Bike,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Globe,
  Shield,
  DollarSign,
  Clock,
  Smartphone,
} from 'lucide-react';

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
  es: {
    title: 'Conviértete en Conductor',
    subtitle: 'Únete a nuestro equipo de entregas y gana dinero con tu propio horario',
    benefits: {
      title: '¿Por qué unirte a StackBot?',
      flexible: 'Horario Flexible',
      flexibleDesc: 'Trabaja cuando quieras, sin horarios fijos',
      earnings: 'Ganancias Competitivas',
      earningsDesc: 'Gana por cada entrega + propinas',
      support: 'Soporte 24/7',
      supportDesc: 'Estamos aquí para ayudarte siempre',
      app: 'App Fácil de Usar',
      appDesc: 'Interfaz simple y moderna',
    },
    form: {
      title: 'Información Personal',
      subtitle: 'Completa tus datos para aplicar',
      fullName: 'Nombre Completo',
      fullNamePlaceholder: 'Juan Pérez',
      email: 'Correo Electrónico',
      emailPlaceholder: 'juan@ejemplo.com',
      phone: 'Teléfono / WhatsApp',
      phonePlaceholder: '+1 809 123 4567',
      city: 'Ciudad / Zona',
      cityPlaceholder: 'Sosúa, Puerto Plata',
      vehicleType: 'Tipo de Vehículo',
      vehiclePlate: 'Placa del Vehículo',
      vehiclePlatePlaceholder: 'A123456',
      vehicleColor: 'Color del Vehículo',
      vehicleColorPlaceholder: 'Rojo',
      experience: 'Experiencia en Entregas',
      whyJoin: '¿Por qué quieres unirte?',
      whyJoinPlaceholder: 'Cuéntanos tus motivaciones...',
      hasLicense: 'Tengo licencia de conducir válida',
      hasPhone: 'Tengo smartphone con datos móviles',
      agreeTerms: 'Acepto los términos y condiciones',
      submit: 'Enviar Solicitud',
      submitting: 'Enviando...',
    },
    vehicles: {
      motorcycle: 'Motocicleta',
      car: 'Carro',
      bicycle: 'Bicicleta',
      scooter: 'Scooter',
    },
    experienceOptions: {
      none: 'Sin experiencia previa',
      lessThan1: 'Menos de 1 año',
      oneToThree: '1-3 años',
      moreThan3: 'Más de 3 años',
    },
    success: {
      title: '¡Solicitud Enviada!',
      message: 'Gracias por tu interés en unirte a StackBot. Revisaremos tu solicitud y te contactaremos pronto.',
      whatNext: '¿Qué sigue?',
      step1: 'Revisaremos tu solicitud (1-2 días)',
      step2: 'Te contactaremos por WhatsApp',
      step3: 'Verificación de documentos',
      step4: '¡Comienza a entregar!',
      backToHome: 'Volver al Inicio',
      applyAgain: 'Enviar Otra Solicitud',
    },
    errors: {
      required: 'Este campo es requerido',
      invalidEmail: 'Correo electrónico inválido',
      invalidPhone: 'Número de teléfono inválido',
      submitFailed: 'Error al enviar. Intenta de nuevo.',
      acceptTerms: 'Debes aceptar los términos',
    },
    haveAccount: '¿Ya tienes cuenta?',
    signIn: 'Iniciar Sesión',
    backToStackBot: '← Volver a StackBot',
  },
  en: {
    title: 'Become a Driver',
    subtitle: 'Join our delivery team and earn money on your own schedule',
    benefits: {
      title: 'Why join StackBot?',
      flexible: 'Flexible Schedule',
      flexibleDesc: 'Work when you want, no fixed hours',
      earnings: 'Competitive Earnings',
      earningsDesc: 'Earn per delivery + tips',
      support: '24/7 Support',
      supportDesc: "We're here to help you always",
      app: 'Easy-to-Use App',
      appDesc: 'Simple and modern interface',
    },
    form: {
      title: 'Personal Information',
      subtitle: 'Complete your details to apply',
      fullName: 'Full Name',
      fullNamePlaceholder: 'John Doe',
      email: 'Email Address',
      emailPlaceholder: 'john@example.com',
      phone: 'Phone / WhatsApp',
      phonePlaceholder: '+1 809 123 4567',
      city: 'City / Area',
      cityPlaceholder: 'Sosúa, Puerto Plata',
      vehicleType: 'Vehicle Type',
      vehiclePlate: 'Vehicle Plate',
      vehiclePlatePlaceholder: 'A123456',
      vehicleColor: 'Vehicle Color',
      vehicleColorPlaceholder: 'Red',
      experience: 'Delivery Experience',
      whyJoin: 'Why do you want to join?',
      whyJoinPlaceholder: 'Tell us your motivations...',
      hasLicense: 'I have a valid driver\'s license',
      hasPhone: 'I have a smartphone with mobile data',
      agreeTerms: 'I agree to the terms and conditions',
      submit: 'Submit Application',
      submitting: 'Submitting...',
    },
    vehicles: {
      motorcycle: 'Motorcycle',
      car: 'Car',
      bicycle: 'Bicycle',
      scooter: 'Scooter',
    },
    experienceOptions: {
      none: 'No previous experience',
      lessThan1: 'Less than 1 year',
      oneToThree: '1-3 years',
      moreThan3: 'More than 3 years',
    },
    success: {
      title: 'Application Submitted!',
      message: 'Thank you for your interest in joining StackBot. We will review your application and contact you soon.',
      whatNext: "What's next?",
      step1: "We'll review your application (1-2 days)",
      step2: "We'll contact you via WhatsApp",
      step3: 'Document verification',
      step4: 'Start delivering!',
      backToHome: 'Back to Home',
      applyAgain: 'Submit Another Application',
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email address',
      invalidPhone: 'Invalid phone number',
      submitFailed: 'Failed to submit. Please try again.',
      acceptTerms: 'You must accept the terms',
    },
    haveAccount: 'Already have an account?',
    signIn: 'Sign In',
    backToStackBot: '← Back to StackBot',
  },
};

type Language = 'es' | 'en';
type VehicleType = 'motorcycle' | 'car' | 'bicycle' | 'scooter';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  vehicleType: VehicleType;
  vehiclePlate: string;
  vehicleColor: string;
  experience: string;
  whyJoin: string;
  hasLicense: boolean;
  hasPhone: boolean;
  agreeTerms: boolean;
}

const initialFormData: FormData = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  vehicleType: 'motorcycle',
  vehiclePlate: '',
  vehicleColor: '',
  experience: '',
  whyJoin: '',
  hasLicense: false,
  hasPhone: false,
  agreeTerms: false,
};

export default function DriverApplyPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('es');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const t = translations[language];

  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    localStorage.setItem('stackbot-driver-lang', newLang);
  };

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError(t.errors.required);
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t.errors.invalidEmail);
      return false;
    }
    if (!formData.phone.trim()) {
      setError(t.errors.invalidPhone);
      return false;
    }
    if (!formData.city.trim()) {
      setError(t.errors.required);
      return false;
    }
    if (!formData.agreeTerms) {
      setError(t.errors.acceptTerms);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'driver_applications'), {
        ...formData,
        status: 'pending',
        language,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Submit error:', err);
      setError(t.errors.submitFailed);
    } finally {
      setLoading(false);
    }
  };

  const vehicleIcons: Record<VehicleType, React.ReactNode> = {
    motorcycle: <Bike className="w-5 h-5" />,
    car: <Car className="w-5 h-5" />,
    bicycle: <Bike className="w-5 h-5" />,
    scooter: <Bike className="w-5 h-5" />,
  };

  // Success State
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sb-primary/80 via-sb-primary to-sb-primary/90 flex flex-col">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
          <div className="w-full max-w-md text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/30">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t.success.title}</h1>
            <p className="text-white/70 mb-8">{t.success.message}</p>
            <div className="bg-white rounded-2xl p-6 mb-8 text-left shadow-xl">
              <h3 className="text-sm font-semibold text-sb-primary mb-4">{t.success.whatNext}</h3>
              <div className="space-y-4">
                {[t.success.step1, t.success.step2, t.success.step3, t.success.step4].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-sb-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-sb-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm text-gray-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/" className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-sb-primary font-semibold rounded-xl transition-all hover:bg-white/90">
                {t.success.backToHome}
              </Link>
              <button onClick={() => { setSubmitted(false); setFormData(initialFormData); }} className="w-full py-3 text-white/70 hover:text-white transition-colors">
                {t.success.applyAgain}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sb-primary/80 via-sb-primary to-sb-primary/90">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <div className="absolute top-4 right-4 z-10">
        <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors">
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium">{language === 'es' ? 'EN' : 'ES'}</span>
        </button>
      </div>

      <div className="absolute top-4 left-4 z-10">
        <Link href="/driver/login" className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-16 safe-top safe-bottom">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-sm">
            <Truck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-white/70 max-w-md mx-auto">{t.subtitle}</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: <Clock className="w-6 h-6" />, title: t.benefits.flexible, desc: t.benefits.flexibleDesc },
            { icon: <DollarSign className="w-6 h-6" />, title: t.benefits.earnings, desc: t.benefits.earningsDesc },
            { icon: <Shield className="w-6 h-6" />, title: t.benefits.support, desc: t.benefits.supportDesc },
            { icon: <Smartphone className="w-6 h-6" />, title: t.benefits.app, desc: t.benefits.appDesc },
          ].map((benefit, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 text-white">
                {benefit.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{benefit.title}</h3>
              <p className="text-xs text-white/60">{benefit.desc}</p>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t.form.title}</h2>
            <p className="text-gray-500 text-sm">{t.form.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.fullName} *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.fullName} onChange={(e) => updateForm('fullName', e.target.value)} placeholder={t.form.fullNamePlaceholder} required className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.email} *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" value={formData.email} onChange={(e) => updateForm('email', e.target.value)} placeholder={t.form.emailPlaceholder} required className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.phone} *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="tel" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder={t.form.phonePlaceholder} required className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.city} *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.city} onChange={(e) => updateForm('city', e.target.value)} placeholder={t.form.cityPlaceholder} required className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.form.vehicleType} *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['motorcycle', 'car', 'bicycle', 'scooter'] as VehicleType[]).map((type) => (
                  <button key={type} type="button" onClick={() => updateForm('vehicleType', type)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${formData.vehicleType === type ? 'bg-sb-primary/10 border-sb-primary text-sb-primary' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {vehicleIcons[type]}
                    <span className="text-sm font-medium">{t.vehicles[type]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.vehiclePlate}</label>
                <input type="text" value={formData.vehiclePlate} onChange={(e) => updateForm('vehiclePlate', e.target.value.toUpperCase())} placeholder={t.form.vehiclePlatePlaceholder} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.vehicleColor}</label>
                <input type="text" value={formData.vehicleColor} onChange={(e) => updateForm('vehicleColor', e.target.value)} placeholder={t.form.vehicleColorPlaceholder} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.experience}</label>
              <select value={formData.experience} onChange={(e) => updateForm('experience', e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all">
                <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                <option value="none">{t.experienceOptions.none}</option>
                <option value="lessThan1">{t.experienceOptions.lessThan1}</option>
                <option value="oneToThree">{t.experienceOptions.oneToThree}</option>
                <option value="moreThan3">{t.experienceOptions.moreThan3}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t.form.whyJoin}</label>
              <textarea value={formData.whyJoin} onChange={(e) => updateForm('whyJoin', e.target.value)} placeholder={t.form.whyJoinPlaceholder} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent transition-all resize-none" />
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.hasLicense} onChange={(e) => updateForm('hasLicense', e.target.checked)} className="mt-0.5 w-5 h-5 bg-gray-50 border-gray-200 rounded text-sb-primary focus:ring-sb-primary focus:ring-offset-0" />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{t.form.hasLicense}</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.hasPhone} onChange={(e) => updateForm('hasPhone', e.target.checked)} className="mt-0.5 w-5 h-5 bg-gray-50 border-gray-200 rounded text-sb-primary focus:ring-sb-primary focus:ring-offset-0" />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{t.form.hasPhone}</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={formData.agreeTerms} onChange={(e) => updateForm('agreeTerms', e.target.checked)} required className="mt-0.5 w-5 h-5 bg-gray-50 border-gray-200 rounded text-sb-primary focus:ring-sb-primary focus:ring-offset-0" />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{t.form.agreeTerms} *</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-4 bg-sb-primary hover:bg-sb-primary/90 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all text-lg">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t.form.submitting}</span>
                </>
              ) : (
                <>
                  <span>{t.form.submit}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-white/70 text-sm">
            {t.haveAccount}{' '}
            <Link href="/driver/login" className="text-white font-semibold hover:underline">{t.signIn}</Link>
          </p>
          <Link href="/" className="inline-block text-white/60 hover:text-white text-sm transition-colors">{t.backToStackBot}</Link>
        </div>
      </div>
    </div>
  );
}