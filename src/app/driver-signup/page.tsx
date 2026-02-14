// src/app/driver/apply/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
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
  FileText,
  PenTool,
  ScrollText,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// AGREEMENT TEXT (ES / EN)
// ============================================================================
const agreementText = {
  es: {
    title: 'Acuerdo de Servicios de Transporte (Entrega)',
    subtitle: 'Lee y firma el acuerdo antes de enviar tu solicitud',
    scrollHint: 'Desplázate para leer el acuerdo completo',
    content: `ACUERDO DE SERVICIOS DE TRANSPORTE (ENTREGA) ENTRE LA SOCIEDAD COMERCIAL STACKBOT GLOBAL SRL., REPRESENTADA POR EL SR. LAMAR WILKERSON.

ENTRE: La Sociedad Comercial STACKBOT GLOBAL, SRL, persona jurídica, constituida, organizada y existente conforme a las leyes de la República Dominicana, registrada en el Registro Mercantil que lleva la Cámara de Comercio de Puerto Plata, Inc. bajo el No. 28765PP, inscrita en el Registro Nacional de Contribuyentes (RNC) que lleva la Dirección General de Impuestos Internos (DGII) bajo el No. 133-55242-6, representada por su Gerente, el Sr. LAMAR WILKERSON, de nacionalidad estadounidense, mayor de edad, comerciante, portador del Pasaporte No. 664733037, con domicilio en el Distrito Municipal de Cabarete, Municipio de Sosúa, Provincia de Puerto Plata, República Dominicana, quien en lo adelante se denominará LA PRIMERA PARTE, o por su propio nombre.

Y el Conductor (en adelante LA SEGUNDA PARTE), quien acepta los siguientes términos al firmar este acuerdo digitalmente:

SE HA CONVENIDO Y PACTADO LO SIGUIENTE:

PRIMERO: OBJETO DEL CONTRATO; LA SEGUNDA PARTE se compromete a brindar a LA PRIMERA PARTE servicios de Transporte (entrega) a los clientes de STACKBOT GLOBAL, SRL, representada por el Sr. LAMAR WILKERSON.

SEGUNDO: Las partes acuerdan que el precio por el servicio de transporte o entrega será según las tarifas establecidas por STACKBOT GLOBAL, SRL.

TERCERO: Las partes acuerdan que el Transporte (entrega) será ofrecido a STACKBOT GLOBAL, SRL por cita en los días que dicha empresa lo requiera, sin un horario específico, ya que LA SEGUNDA PARTE no es empleado de STACKBOT GLOBAL, SRL.

CUARTO: SE ENTIENDE ENTRE LAS PARTES; Que LA SEGUNDA PARTE no tiene obligación laboral con STACKBOT GLOBAL, SRL, representada por el Sr. LAMAR WILKERSON, y puede ofrecer sus servicios a cualquier persona o empresa que los requiera.

QUINTO: SE ENTIENDE ENTRE LAS PARTES; Que, siendo un contrato de servicios entre las partes, no existe responsabilidad por prestaciones laborales, derechos laborales ni derechos adquiridos, y LA SEGUNDA PARTE reconoce que solo está prestando un servicio a dicha empresa en los días que se requiera.

DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL: Se entiende como "Información Confidencial" toda información, dato o documento que LA PRIMERA PARTE proporcione a LA SEGUNDA PARTE, incluyendo pero no limitado a: Información comercial, Información financiera, Información técnica, Información sobre clientes y proveedores.

OBLIGACIONES DE LA SEGUNDA PARTE: LA SEGUNDA PARTE se compromete a:
a) Mantener la Información Confidencial en secreto.
b) No divulgar la Información Confidencial a terceros.
c) No utilizar la Información Confidencial para fines distintos a los acordados.
d) Tomar medidas razonables para proteger la Información Confidencial.

EXCEPCIONES: La obligación de confidencialidad no aplicará a la información que: Sea pública, que sea conocida por LA SEGUNDA PARTE antes de la firma de este contrato, que sea obtenida por el Receptor de una fuente independiente.

DURACIÓN Y TERMINACIÓN: Este contrato tendrá una duración de un (1) año, a partir de la firma del presente contrato y terminará automáticamente al vencimiento de dicho plazo. Sin embargo, las obligaciones de confidencialidad permanecerán vigentes durante cinco (5) años después de la terminación del contrato.

JURISDICCIÓN COMPETENTE Y LEY APLICABLE: Las partes acuerdan que la jurisdicción competente para resolver cualquier disputa relacionada con el presente Contrato será la de los domicilios de elección de las partes y que las únicas leyes aplicables serán las de la República Dominicana.

ELECCIÓN DE DOMICILIOS: Para todos los fines y consecuencias del presente acto, las partes eligen domicilio atribuyendo competencia en sus respectivos domicilios.`,
    signatureLabel: 'Firma Digital — Escribe tu nombre completo',
    signaturePlaceholder: 'Tu nombre completo como firma',
    signatureHelp: 'Al escribir tu nombre, confirmas que has leído y aceptas este acuerdo.',
    agreeCheckbox: 'He leído y acepto el Acuerdo de Servicios de Transporte',
    readFullAgreement: 'Debes leer el acuerdo completo antes de firmar',
    signatureRequired: 'Debes firmar con tu nombre completo',
    signatureMismatch: 'La firma debe coincidir con tu nombre completo',
    back: 'Volver al Formulario',
    submit: 'Firmar y Enviar Solicitud',
    submitting: 'Enviando...',
    step1Label: 'Información',
    step2Label: 'Acuerdo',
  },
  en: {
    title: 'Transportation Services (Delivery) Agreement',
    subtitle: 'Read and sign the agreement before submitting your application',
    scrollHint: 'Scroll to read the full agreement',
    content: `TRANSPORTATION SERVICES (DELIVERY) AGREEMENT BETWEEN THE COMMERCIAL COMPANY STACKBOT GLOBAL SRL., REPRESENTED BY MR. LAMAR WILKERSON.

BETWEEN: The Commercial Company STACKBOT GLOBAL, SRL, a legal entity, incorporated, organized, and existing in accordance with the laws of the Dominican Republic, registered in the Mercantile Registry kept by the Chamber of Commerce of Puerto Plata, Inc. under No. 28765PP, registered in the National Taxpayer Registry (RNC) kept by the General Directorate of Internal Taxes (DGII) under No. 133-55242-6, represented by its Manager, Mr. LAMAR WILKERSON, of American nationality, of legal age, merchant, holder of Passport No. 664733037, domiciled in the Municipal District of Cabarete, Municipality of Sosúa, Province of Puerto Plata, Dominican Republic, who hereinafter shall be referred to as THE FIRST PARTY, or by his own name.

And the Driver (hereinafter THE SECOND PARTY), who accepts the following terms by digitally signing this agreement:

IT HAS BEEN AGREED AND COVENANTED AS FOLLOWS:

FIRST: PURPOSE OF THE CONTRACT; THE SECOND PARTY agrees to provide THE FIRST PARTY with Transportation (delivery) services to the clients of STACKBOT GLOBAL, SRL, represented by Mr. LAMAR WILKERSON.

SECOND: The parties agree that the price for the transportation or delivery service shall be according to the rates established by STACKBOT GLOBAL, SRL.

THIRD: The parties agree that the Transportation (delivery) shall be offered to STACKBOT GLOBAL, SRL by appointment on the days that said company requires it, without a specific schedule, since THE SECOND PARTY is not an employee of STACKBOT GLOBAL, SRL.

FOURTH: IT IS UNDERSTOOD BETWEEN THE PARTIES; That THE SECOND PARTY has no employment obligation with STACKBOT GLOBAL, SRL, represented by Mr. LAMAR WILKERSON, and may offer their services to any person or company that requires them.

FIFTH: IT IS UNDERSTOOD BETWEEN THE PARTIES; That, being a service contract between the parties, there is no responsibility for employment benefits, labor rights, as well as acquired rights, and THE SECOND PARTY acknowledges that they are only providing a service to said company on the days it is required.

DEFINITION OF CONFIDENTIAL INFORMATION: It is understood as "Confidential Information" any information, data, or document that THE FIRST PARTY provides to THE SECOND PARTY, including but not limited to: Commercial information, Financial information, Technical information, Information about clients and suppliers.

OBLIGATIONS OF THE SECOND PARTY: THE SECOND PARTY agrees to:
a) Keep the Confidential Information secret.
b) Not disclose the Confidential Information to third parties.
c) Not use the Confidential Information for purposes other than those agreed.
d) Take reasonable measures to protect the Confidential Information.

EXCEPTIONS: The obligation of confidentiality shall not apply to the information that: Is public, that is known by THE SECOND PARTY before the signing of this contract, that is obtained by the Recipient from an independent source.

DURATION AND TERMINATION: This contract shall have a duration of one (1) year, from the signing of the present contract and shall terminate automatically at the end of said term. However, the confidentiality obligations shall remain in force during five (5) years after the termination of the contract.

COMPETENT JURISDICTION AND APPLICABLE LAW: The parties agree that the competent jurisdiction to settle any dispute related to the present Contract shall be that of the domiciles of election of the parties and that the only applicable laws shall be those of the Dominican Republic.

ELECTION OF DOMICILES: For all the purposes and consequences of the present act, the parties choose domicile attributing competence in their respective domiciles.`,
    signatureLabel: 'Digital Signature — Type your full name',
    signaturePlaceholder: 'Your full name as signature',
    signatureHelp: 'By typing your name, you confirm that you have read and accept this agreement.',
    agreeCheckbox: 'I have read and accept the Transportation Services Agreement',
    readFullAgreement: 'You must read the full agreement before signing',
    signatureRequired: 'You must sign with your full name',
    signatureMismatch: 'Signature must match your full name',
    back: 'Back to Form',
    submit: 'Sign & Submit Application',
    submitting: 'Submitting...',
    step1Label: 'Information',
    step2Label: 'Agreement',
  },
};

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
      next: 'Continuar al Acuerdo',
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
      notLoggedIn: 'Debes iniciar sesión antes de aplicar.',
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
      next: 'Continue to Agreement',
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
      notLoggedIn: 'You must be logged in to apply.',
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
  const [currentUser, setCurrentUser] = useState<{ uid: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Agreement step state ──────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const agreementRef = useRef<HTMLDivElement>(null);

  const t = translations[language];
  const ag = agreementText[language];

  // ── language pref ────────────────────────────────────────────
  useEffect(() => {
    const savedLang = localStorage.getItem('stackbot-driver-lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  // ── auth guard ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({ uid: user.uid, email: user.email! });
      } else {
        router.replace('/driver/login');
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [router]);

  // ── Track agreement scroll ───────────────────────────────────
  useEffect(() => {
    const el = agreementRef.current;
    if (!el || step !== 2) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Consider "scrolled to bottom" when within 40px of the end
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        setHasScrolledToBottom(true);
      }
    };

    el.addEventListener('scroll', handleScroll);
    // Also check on mount in case content is shorter than container
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [step]);

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
    return true;
  };

  const validateAgreement = (): boolean => {
    if (!hasScrolledToBottom) {
      setError(ag.readFullAgreement);
      return false;
    }
    if (!signature.trim()) {
      setError(ag.signatureRequired);
      return false;
    }
    // Check signature roughly matches the full name (case-insensitive)
    if (signature.trim().toLowerCase() !== formData.fullName.trim().toLowerCase()) {
      setError(ag.signatureMismatch);
      return false;
    }
    if (!agreementAccepted) {
      setError(t.errors.acceptTerms);
      return false;
    }
    return true;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setError('');
    setStep(2);
    // Scroll to top when entering step 2
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAgreement()) return;

    if (!currentUser) {
      setError(t.errors.notLoggedIn);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'driver_applications'), {
        ...formData,
        uid: currentUser.uid,
        email: currentUser.email,
        status: 'pending',
        language,
        // Agreement metadata
        agreementSigned: true,
        agreementSignature: signature.trim(),
        agreementSignedAt: new Date().toISOString(),
        agreementVersion: '2026-02-10', // matches contract date
        agreementLanguage: language,
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

  // ── while Firebase is still resolving the current user ─────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sb-primary/80 via-sb-primary to-sb-primary/90 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

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
                {[t.success.step1, t.success.step2, t.success.step3, t.success.step4].map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-sb-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-sb-primary">{idx + 1}</span>
                    </div>
                    <span className="text-sm text-gray-600">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Link href="/" className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-sb-primary font-semibold rounded-xl transition-all hover:bg-white/90">
                {t.success.backToHome}
              </Link>
              <button onClick={() => { setSubmitted(false); setFormData(initialFormData); setStep(1); setSignature(''); setAgreementAccepted(false); setHasScrolledToBottom(false); }} className="w-full py-3 text-white/70 hover:text-white transition-colors">
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
        {step === 2 ? (
          <button
            onClick={() => { setStep(1); setError(''); }}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <Link href="/driver/login" className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}
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

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 1 ? 'bg-white text-sb-primary' : 'bg-white/20 text-white/60'}`}>
              1
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${step >= 1 ? 'text-white' : 'text-white/60'}`}>
              {ag.step1Label}
            </span>
          </div>
          <div className="w-12 h-px bg-white/30" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= 2 ? 'bg-white text-sb-primary' : 'bg-white/20 text-white/60'}`}>
              2
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${step >= 2 ? 'text-white' : 'text-white/60'}`}>
              {ag.step2Label}
            </span>
          </div>
        </div>

        {/* ================================================================ */}
        {/* STEP 1: Personal Information Form                                */}
        {/* ================================================================ */}
        {step === 1 && (
          <>
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

              <form onSubmit={handleNextStep} className="space-y-6">
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
                </div>

                <button type="submit" className="w-full flex items-center justify-center gap-2 py-4 bg-sb-primary hover:bg-sb-primary/90 text-white font-semibold rounded-xl transition-all text-lg">
                  <FileText className="w-5 h-5" />
                  <span>{t.form.next}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* STEP 2: Agreement & Signature                                    */}
        {/* ================================================================ */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Agreement Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-sb-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ScrollText className="w-5 h-5 text-sb-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900">{ag.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{ag.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Agreement Body */}
            <div className="relative">
              <div
                ref={agreementRef}
                className="h-[50vh] md:h-[45vh] overflow-y-auto p-5 md:p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-line scroll-smooth"
              >
                {ag.content}
              </div>

              {/* Scroll fade + hint (only when not scrolled to bottom) */}
              {!hasScrolledToBottom && (
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                  <div className="h-20 bg-gradient-to-t from-white to-transparent" />
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-gray-400 pointer-events-auto animate-bounce">
                    <ChevronDown className="w-4 h-4" />
                    <span>{ag.scrollHint}</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>

            {/* Signature & Accept Section */}
            <div className="border-t border-gray-200 p-5 md:p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Signature Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    {ag.signatureLabel}
                  </span>
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => { setSignature(e.target.value); setError(''); }}
                  placeholder={ag.signaturePlaceholder}
                  disabled={!hasScrolledToBottom}
                  className={`w-full px-4 py-3 border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent ${
                    hasScrolledToBottom
                      ? 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  } ${signature.trim() ? 'font-serif text-lg italic' : ''}`}
                />
                <p className="text-xs text-gray-400 mt-1.5">{ag.signatureHelp}</p>
              </div>

              {/* Accept Checkbox */}
              <label className={`flex items-start gap-3 cursor-pointer group ${!hasScrolledToBottom ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => { setAgreementAccepted(e.target.checked); setError(''); }}
                  disabled={!hasScrolledToBottom}
                  className="mt-0.5 w-5 h-5 bg-gray-50 border-gray-200 rounded text-sb-primary focus:ring-sb-primary focus:ring-offset-0"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{ag.agreeCheckbox}</span>
              </label>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{ag.back}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !agreementAccepted || !signature.trim() || !hasScrolledToBottom}
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 bg-sb-primary hover:bg-sb-primary/90 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{ag.submitting}</span>
                    </>
                  ) : (
                    <>
                      <PenTool className="w-5 h-5" />
                      <span>{ag.submit}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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