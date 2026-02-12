"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  doc, setDoc, getDoc, serverTimestamp, getDocs, query, where, collection,
} from "firebase/firestore";
import {
  Store, ArrowLeft, Upload, MapPin, Locate, Building2, CreditCard,
  User, Hash, Wallet, AlertCircle, FileText, PenTool, ChevronRight,
  Eraser, HelpCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT FROM SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════════════════
import { VENDOR_CATEGORIES } from "@/lib/config/categories";

// ═══════════════════════════════════════════════════════════════════════════
// BILINGUAL TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════
const T = {
  en: {
    loading: "Loading...",
    pendingTitle: "Application Pending",
    pendingDesc: (name: string) => `You've submitted an application for <strong>${name}</strong>. We're reviewing it and will notify you once approved.`,
    returnHome: "Return Home",
    backToHome: "Back to Home",
    backToEdit: "Back to Edit Details",
    becomeVendor: "Become a Vendor",
    vendorAgreement: "Vendor Agreement",
    step1Desc: "Tell us about your business. Step 1 of 2.",
    step2Desc: "Please review and sign the agreement below. Step 2 of 2.",
    uploadLogo: "Upload Business Logo",
    businessInfo: "Business Information",
    businessName: "Business Name *",
    businessNamePh: "Your Business Name",
    businessEmail: "Business Email *",
    businessEmailPh: "business@example.com",
    phone: "Phone Number *",
    phonePh: "+1 (809) 555-0123",
    address: "Business Address",
    addressPh: "123 Main St, City",
    website: "Website (optional)",
    websitePh: "https://yourwebsite.com",
    description: "Business Description",
    descriptionPh: "Tell customers what you offer...",
    categories: "Categories *",
    storeLocation: "Store Location (Map Pin)",
    useMyLocation: "Use My Current Location",
    gettingLocation: "Getting Location...",
    latitude: "Latitude",
    longitude: "Longitude",
    locationAddress: "Location Address (for display)",
    locationAddressPh: "Plaza Central, Puerto Plata",
    howHeard: "How did you hear about us?",
    howHeardPh: "e.g. Instagram, Friend, Sales Rep...",
    directDeposit: "Direct Deposit Setup",
    directDepositDesc: "Enter your bank account details to receive payouts.",
    bankName: "Bank Name",
    bankNamePh: "Banco Popular Dominicano",
    accountHolder: "Account Holder Name",
    accountHolderPh: "Full name on account",
    accountNumber: "Account Number",
    routingNumber: "Routing Number",
    routingNumberPh: "Transit / ABA number",
    accountType: "Account Type",
    checking: "Checking",
    savings: "Savings",
    nextReview: "Next: Review Agreement",
    signature: "Signature",
    printedName: "Printed Name *",
    printedNamePh: "Type your full name",
    drawSignature: "Draw Your Signature *",
    clearSignature: "Clear Signature",
    signHint: "Use your mouse or finger to sign above.",
    agreeText: 'I have read and agree to the <strong>StackBot Vendor Agreement</strong>. I certify that I am authorized to sign on behalf of the business identified above.',
    submitting: "Submitting Application...",
    submitBtn: "Sign & Submit Application",
    alreadyHave: "Already have a vendor account?",
    signIn: "Sign in",
    errName: "Business name is required.",
    errEmail: "Business email is required.",
    errEmailInvalid: "Please enter a valid business email address.",
    errPhone: "Phone number is required.",
    errCategories: "Select at least one category.",
    errLogin: "Please log in first.",
    errPrintedName: "Please type your Printed Name.",
    errSignature: "Please sign the agreement using the signature box.",
    errAgree: "You must agree to the terms.",
    errGeneric: "Something went wrong.",
    errGeoNotSupported: "Geolocation is not supported by your browser.",
    errGeoFailed: "Could not get your location. Please enter manually.",
    agreementCompany: "STACKBOT GLOBAL S.R.L.",
    agreementTitle: "VENDOR AGREEMENT",
    agreementDate: (d: string) => `Effective Date: ${d} | Company RNC: 133-55242-6`,
    feeRetailLabel: "Retail:",
    feeServicesLabel: "Services:",
    sec1t: "1) Parties", sec1: 'This Vendor Agreement ("Agreement") is between StackBot Global, S.R.L. ("StackBot") and the business/vendor identified in the signature section ("Vendor").',
    sec2t: "2) Purpose", sec2: "StackBot provides an online marketplace that lets customers discover and place orders with local vendors for pickup and/or delivery, and lets service vendors accept appointment bookings.",
    sec3t: "3) Vendor Listings and Content", sec3: "Vendor authorizes StackBot to display Vendor's business details and content. Vendor confirms it has the rights to all content provided and that it is accurate.",
    sec4t: "4) Orders and Fulfillment", sec4: "Vendor agrees to prepare orders promptly. StackBot may pause listings for repeated complaints. Vendor agrees to package orders safely.",
    sec5t: "5) Appointments", sec5: "Vendor agrees to honor confirmed bookings. Vendor sets service prices and availability.",
    sec6t: "6) Fees", sec6a: "15% platform fee charged to customer. Vendor keeps 100% of listed price.", sec6b: "5% booking fee charged to customer. Vendor keeps 100% of listed price.",
    sec7t: "7) Payouts", sec7: "StackBot remits payouts on a weekly schedule. Vendor must provide valid payout details.",
    sec8t: "8) Refunds & Disputes", sec8: "If an issue is caused by Vendor, Vendor is responsible. If caused by platform error/fraud, StackBot handles it.",
    sec10t: "10) Compliance", sec10: "Vendor agrees not to list illegal items and to comply with DR laws.",
    sec12t: "12) Governing Law", sec12: "Dominican Republic.",
  },
  es: {
    loading: "Cargando...",
    pendingTitle: "Solicitud Pendiente",
    pendingDesc: (name: string) => `Has enviado una solicitud para <strong>${name}</strong>. Estamos revisándola y te notificaremos cuando sea aprobada.`,
    returnHome: "Volver al Inicio",
    backToHome: "Volver al Inicio",
    backToEdit: "Volver a Editar Datos",
    becomeVendor: "Conviértete en Vendedor",
    vendorAgreement: "Acuerdo de Vendedor",
    step1Desc: "Cuéntanos sobre tu negocio. Paso 1 de 2.",
    step2Desc: "Revisa y firma el acuerdo a continuación. Paso 2 de 2.",
    uploadLogo: "Subir Logo del Negocio",
    businessInfo: "Información del Negocio",
    businessName: "Nombre del Negocio *",
    businessNamePh: "Nombre de tu Negocio",
    businessEmail: "Correo del Negocio *",
    businessEmailPh: "negocio@ejemplo.com",
    phone: "Número de Teléfono *",
    phonePh: "+1 (809) 555-0123",
    address: "Dirección del Negocio",
    addressPh: "Calle Principal 123, Ciudad",
    website: "Sitio Web (opcional)",
    websitePh: "https://tusitio.com",
    description: "Descripción del Negocio",
    descriptionPh: "Describe lo que ofreces a tus clientes...",
    categories: "Categorías *",
    storeLocation: "Ubicación de la Tienda (Pin en Mapa)",
    useMyLocation: "Usar Mi Ubicación Actual",
    gettingLocation: "Obteniendo Ubicación...",
    latitude: "Latitud",
    longitude: "Longitud",
    locationAddress: "Dirección de Ubicación (para mostrar)",
    locationAddressPh: "Plaza Central, Puerto Plata",
    howHeard: "¿Cómo te enteraste de nosotros?",
    howHeardPh: "ej. Instagram, Amigo, Representante...",
    directDeposit: "Configuración de Depósito Directo",
    directDepositDesc: "Ingresa los datos de tu cuenta bancaria para recibir pagos.",
    bankName: "Nombre del Banco",
    bankNamePh: "Banco Popular Dominicano",
    accountHolder: "Nombre del Titular de la Cuenta",
    accountHolderPh: "Nombre completo en la cuenta",
    accountNumber: "Número de Cuenta",
    routingNumber: "Número de Ruta",
    routingNumberPh: "Número de tránsito / ABA",
    accountType: "Tipo de Cuenta",
    checking: "Corriente",
    savings: "Ahorros",
    nextReview: "Siguiente: Revisar Acuerdo",
    signature: "Firma",
    printedName: "Nombre Impreso *",
    printedNamePh: "Escribe tu nombre completo",
    drawSignature: "Dibuja Tu Firma *",
    clearSignature: "Borrar Firma",
    signHint: "Usa tu mouse o dedo para firmar arriba.",
    agreeText: 'He leído y acepto el <strong>Acuerdo de Vendedor de StackBot</strong>. Certifico que estoy autorizado/a para firmar en nombre del negocio identificado arriba.',
    submitting: "Enviando Solicitud...",
    submitBtn: "Firmar y Enviar Solicitud",
    alreadyHave: "¿Ya tienes una cuenta de vendedor?",
    signIn: "Iniciar sesión",
    errName: "El nombre del negocio es obligatorio.",
    errEmail: "El correo del negocio es obligatorio.",
    errEmailInvalid: "Por favor ingresa un correo electrónico válido.",
    errPhone: "El número de teléfono es obligatorio.",
    errCategories: "Selecciona al menos una categoría.",
    errLogin: "Por favor inicia sesión primero.",
    errPrintedName: "Por favor escribe tu Nombre Impreso.",
    errSignature: "Por favor firma el acuerdo usando el recuadro de firma.",
    errAgree: "Debes aceptar los términos.",
    errGeneric: "Algo salió mal.",
    errGeoNotSupported: "La geolocalización no es compatible con tu navegador.",
    errGeoFailed: "No se pudo obtener tu ubicación. Ingrésala manualmente.",
    agreementCompany: "STACKBOT GLOBAL S.R.L.",
    agreementTitle: "ACUERDO DE VENDEDOR",
    agreementDate: (d: string) => `Fecha Efectiva: ${d} | RNC de la Empresa: 133-55242-6`,
    feeRetailLabel: "Comercio:",
    feeServicesLabel: "Servicios:",
    sec1t: "1) Partes", sec1: 'Este Acuerdo de Vendedor ("Acuerdo") es entre StackBot Global, S.R.L. ("StackBot") y el negocio/vendedor identificado en la sección de firma ("Vendedor").',
    sec2t: "2) Propósito", sec2: "StackBot proporciona un mercado en línea que permite a los clientes descubrir y realizar pedidos con vendedores locales para recogida y/o entrega, y permite a los vendedores de servicios aceptar reservas de citas.",
    sec3t: "3) Listados y Contenido del Vendedor", sec3: "El Vendedor autoriza a StackBot a mostrar los detalles comerciales y el contenido del Vendedor. El Vendedor confirma que tiene los derechos de todo el contenido proporcionado y que es preciso.",
    sec4t: "4) Pedidos y Cumplimiento", sec4: "El Vendedor acepta preparar los pedidos con prontitud. StackBot puede pausar los listados por quejas repetidas. El Vendedor acepta empaquetar los pedidos de forma segura.",
    sec5t: "5) Citas", sec5: "El Vendedor acepta cumplir con las reservas confirmadas. El Vendedor establece los precios y la disponibilidad de los servicios.",
    sec6t: "6) Tarifas", sec6a: "15% de tarifa de plataforma cobrada al cliente. El Vendedor conserva el 100% del precio publicado.", sec6b: "5% de tarifa de reserva cobrada al cliente. El Vendedor conserva el 100% del precio publicado.",
    sec7t: "7) Pagos", sec7: "StackBot envía los pagos de forma semanal. El Vendedor debe proporcionar datos de pago válidos.",
    sec8t: "8) Reembolsos y Disputas", sec8: "Si un problema es causado por el Vendedor, el Vendedor es responsable. Si es causado por error de la plataforma/fraude, StackBot lo gestiona.",
    sec10t: "10) Cumplimiento", sec10: "El Vendedor acepta no listar artículos ilegales y cumplir con las leyes de la RD.",
    sec12t: "12) Ley Aplicable", sec12: "República Dominicana.",
  },
};

const generateSlug = (name: string) => {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/--+/g, "-");
};

const isValidEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

interface BankInfo { bank_name: string; account_holder: string; account_number: string; routing_number: string; account_type: "checking" | "savings"; }
interface LocationInfo { lat: string; lng: string; location_address: string; }

export default function VendorSignupPage() {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const s = T[language] || T.es;

  const [step, setStep] = useState<1 | 2>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<Blob | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", website: "", description: "", referralSource: "", categories: [] as string[] });
  const [agreementForm, setAgreementForm] = useState({ printedName: "", agreed: false });
  const [bankInfo, setBankInfo] = useState<BankInfo>({ bank_name: "", account_holder: "", account_number: "", routing_number: "", account_type: "checking" });
  const [location, setLocation] = useState<LocationInfo>({ lat: "", lng: "", location_address: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login?intent=vendor"); return; }
      setCurrentUser(user);
      if (!form.email) setForm((prev) => ({ ...prev, email: user.email || "" }));
      try {
        const vendorRef = doc(db, "vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const data = vendorSnap.data();
          setExistingVendor(data);
          if (data.verified) { router.replace("/vendor"); return; }
        }
      } catch (err) { console.error("Error checking existing vendor:", err); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, form.email]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };
  const stopDrawing = () => { setIsDrawing(false); const canvas = canvasRef.current; if (canvas) canvas.toBlob((blob) => setSignatureData(blob)); };
  const clearSignature = () => { const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext("2d"); ctx?.clearRect(0, 0, canvas.width, canvas.height); setSignatureData(null); } };

  const handleChange = (field: keyof typeof form, value: any) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleAgreementChange = (field: keyof typeof agreementForm, value: any) => setAgreementForm((prev) => ({ ...prev, [field]: value }));
  const handleBankChange = (field: keyof BankInfo, value: string) => setBankInfo((prev) => ({ ...prev, [field]: value }));
  const handleLocationChange = (field: keyof LocationInfo, value: string) => setLocation((prev) => ({ ...prev, [field]: value }));
  const toggleCategory = (cat: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(cat);
      return { ...prev, categories: exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat] };
    });
  };
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); const reader = new FileReader(); reader.onload = () => setLogoPreview(reader.result as string); reader.readAsDataURL(file); }
  };
  const getCurrentLocation = () => {
    if (!navigator.geolocation) { setError(s.errGeoNotSupported); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => { const { latitude, longitude } = position.coords; setLocation((prev) => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) })); setGettingLocation(false); },
      (err) => { console.error("Geolocation error:", err); setError(s.errGeoFailed); setGettingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!form.name.trim()) return setError(s.errName);
    if (!form.email.trim()) return setError(s.errEmail);
    if (!isValidEmail(form.email)) return setError(s.errEmailInvalid);
    if (!form.phone.trim()) return setError(s.errPhone);
    if (form.categories.length === 0) return setError(s.errCategories);
    topRef.current?.scrollIntoView({ behavior: "smooth" }); setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (!currentUser) throw new Error(s.errLogin);
      if (!agreementForm.printedName.trim()) throw new Error(s.errPrintedName);
      if (!signatureData) throw new Error(s.errSignature);
      if (!agreementForm.agreed) throw new Error(s.errAgree);

      let logoUrl = "";
      if (logoFile) { const safeName = logoFile.name.replace(/\s+/g, "-"); const logoRef = ref(getStorage(), `vendors/logos/${currentUser.uid}/${Date.now()}-${safeName}`); await uploadBytes(logoRef, logoFile); logoUrl = await getDownloadURL(logoRef); }

      let signatureUrl = "";
      if (signatureData) { const sigRef = ref(getStorage(), `vendors/signatures/${currentUser.uid}/signature_${Date.now()}.png`); await uploadBytes(sigRef, signatureData); signatureUrl = await getDownloadURL(sigRef); }

      const baseSlug = generateSlug(form.name);
      let finalSlug = baseSlug;
      if (baseSlug) { const slugQuery = query(collection(db, "vendors"), where("slug", "==", baseSlug)); const slugSnap = await getDocs(slugQuery); if (!slugSnap.empty) finalSlug = `${baseSlug}-${slugSnap.size + 1}`; }

      const maskedBankInfo = bankInfo.bank_name ? { bank_name: bankInfo.bank_name.trim(), account_holder: bankInfo.account_holder.trim(), account_last4: bankInfo.account_number.slice(-4), routing_number: bankInfo.routing_number.trim(), account_type: bankInfo.account_type } : null;
      const locationData = location.lat && location.lng ? { lat: parseFloat(location.lat), lng: parseFloat(location.lng), location_address: location.location_address.trim() || form.address.trim() } : null;

      await setDoc(doc(db, "vendors", currentUser.uid), {
        uid: currentUser.uid, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        address: form.address.trim(), website: form.website.trim(), description: form.description.trim(),
        categories: form.categories, logoUrl, slug: finalSlug, verified: false, total_orders: 0, total_revenue: 0,
        rating: 0, source: "public_signup", referral_source: form.referralSource.trim(),
        ...(maskedBankInfo && { bank_info: maskedBankInfo }), ...(locationData && { location: locationData }),
        agreement: { version: "phase1_v1", signed_at: serverTimestamp(), printed_name: agreementForm.printedName, signature_url: signatureUrl, accepted_terms: true },
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
      });
      setExistingVendor({ uid: currentUser.uid, name: form.name, verified: false });
    } catch (err: any) { console.error("Vendor signup error:", err); setError(err.message || s.errGeneric); } finally { setLoading(false); }
  };

  if (authLoading) return <div className="min-h-screen bg-sb-bg flex items-center justify-center"><LoadingSpinner text={s.loading} /></div>;

  if (existingVendor && !existingVendor.verified) {
    return (
      <div className="min-h-screen bg-sb-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto"><Store className="h-8 w-8 text-yellow-600" /></div>
          <h1 className="text-2xl font-bold text-gray-900">{s.pendingTitle}</h1>
          <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: s.pendingDesc(existingVendor.name) }} />
          <div className="pt-4 space-y-3"><Link href="/" className="block w-full bg-sb-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 transition text-center">{s.returnHome}</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sb-bg py-8 px-4" ref={topRef}>
      <div className="max-w-3xl mx-auto">
        {step === 1 ? (
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"><ArrowLeft className="h-4 w-4 mr-1" />{s.backToHome}</Link>
        ) : (
          <button onClick={() => setStep(1)} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"><ArrowLeft className="h-4 w-4 mr-1" />{s.backToEdit}</button>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 1 ? <Store className="h-8 w-8 text-sb-primary" /> : <FileText className="h-8 w-8 text-sb-primary" />}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{step === 1 ? s.becomeVendor : s.vendorAgreement}</h1>
            <p className="text-gray-600 mt-2">{step === 1 ? s.step1Desc : s.step2Desc}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}

          {/* STEP 1: BUSINESS INFO */}
          <div className={step === 1 ? "block" : "hidden"}>
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo preview" width={100} height={100} className="rounded-xl object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"><Upload className="h-8 w-8 text-gray-400" /></div>
                  )}
                </div>
                <label className="cursor-pointer text-sb-primary font-medium text-sm hover:underline">
                  {s.uploadLogo} <input type="file" accept="image/*" hidden onChange={handleLogoSelect} />
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Store className="h-5 w-5 text-sb-primary" />{s.businessInfo}</h3>
                <Input label={s.businessName} value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder={s.businessNamePh} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label={s.businessEmail} type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder={s.businessEmailPh} required />
                  <Input label={s.phone} type="tel" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder={s.phonePh} required />
                </div>
                <Input label={s.address} value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder={s.addressPh} />
                <Input label={s.website} type="url" value={form.website} onChange={(e) => handleChange("website", e.target.value)} placeholder={s.websitePh} />
                <Textarea label={s.description} value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder={s.descriptionPh} rows={3} />
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">{s.categories}</h3>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_CATEGORIES.map((cat) => (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${form.categories.includes(cat) ? "bg-sb-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin className="h-5 w-5 text-sb-primary" />{s.storeLocation}</h3>
                <button type="button" onClick={getCurrentLocation} disabled={gettingLocation} className="flex items-center gap-2 px-4 py-2.5 bg-sb-primary text-white rounded-xl font-medium text-sm hover:bg-sb-primary/90 transition disabled:opacity-50"><Locate className={`h-4 w-4 ${gettingLocation ? "animate-spin" : ""}`} />{gettingLocation ? s.gettingLocation : s.useMyLocation}</button>
                <div className="grid grid-cols-2 gap-4">
                  <Input label={s.latitude} type="text" value={location.lat} onChange={(e) => handleLocationChange("lat", e.target.value)} placeholder="19.7808" />
                  <Input label={s.longitude} type="text" value={location.lng} onChange={(e) => handleLocationChange("lng", e.target.value)} placeholder="-70.6873" />
                </div>
                <Input label={s.locationAddress} value={location.location_address} onChange={(e) => handleLocationChange("location_address", e.target.value)} placeholder={s.locationAddressPh} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-sb-primary" />{s.howHeard}
                </label>
                <Input value={form.referralSource} onChange={(e) => handleChange("referralSource", e.target.value)} placeholder={s.howHeardPh} />
              </div>

              <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Wallet className="h-5 w-5 text-blue-600" />{s.directDeposit}</h3>
                <p className="text-sm text-gray-600">{s.directDepositDesc}</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{s.bankName}</label>
                  <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={bankInfo.bank_name} onChange={(e) => handleBankChange("bank_name", e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent" placeholder={s.bankNamePh} /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{s.accountHolder}</label>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={bankInfo.account_holder} onChange={(e) => handleBankChange("account_holder", e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent" placeholder={s.accountHolderPh} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{s.accountNumber}</label>
                    <div className="relative"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="password" value={bankInfo.account_number} onChange={(e) => handleBankChange("account_number", e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent" placeholder="••••••••••" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{s.routingNumber}</label>
                    <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" value={bankInfo.routing_number} onChange={(e) => handleBankChange("routing_number", e.target.value)} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-sb-primary focus:border-transparent" placeholder={s.routingNumberPh} /></div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{s.accountType}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="account_type" value="checking" checked={bankInfo.account_type === "checking"} onChange={() => handleBankChange("account_type", "checking")} className="w-4 h-4 text-sb-primary" /><span className="text-sm text-gray-700">{s.checking}</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="account_type" value="savings" checked={bankInfo.account_type === "savings"} onChange={() => handleBankChange("account_type", "savings")} className="w-4 h-4 text-sb-primary" /><span className="text-sm text-gray-700">{s.savings}</span></label>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full py-4 text-lg flex items-center justify-center gap-2">{s.nextReview} <ChevronRight className="h-5 w-5" /></Button>
            </form>
          </div>

          {/* STEP 2: VENDOR AGREEMENT */}
          <div className={step === 2 ? "block" : "hidden"}>
            <form onSubmit={handleFinalSubmit} className="space-y-6">
              <div className="border border-gray-300 rounded-xl bg-gray-50 h-80 overflow-y-auto p-5 text-sm text-gray-700 space-y-4 shadow-inner">
                <div className="text-center font-bold text-gray-900 mb-4 border-b pb-2">
                  <h2 className="text-lg">{s.agreementCompany}</h2>
                  <h3>{s.agreementTitle}</h3>
                  <p className="text-xs text-gray-500 font-normal">{s.agreementDate(new Date().toLocaleDateString())}</p>
                </div>
                <div><h4 className="font-bold text-gray-900">{s.sec1t}</h4><p>{s.sec1}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec2t}</h4><p>{s.sec2}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec3t}</h4><p>{s.sec3}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec4t}</h4><p>{s.sec4}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec5t}</h4><p>{s.sec5}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec6t}</h4><ul className="list-disc pl-5 space-y-1"><li><strong>{s.feeRetailLabel}</strong> {s.sec6a}</li><li><strong>{s.feeServicesLabel}</strong> {s.sec6b}</li></ul></div>
                <div><h4 className="font-bold text-gray-900">{s.sec7t}</h4><p>{s.sec7}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec8t}</h4><p>{s.sec8}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec10t}</h4><p>{s.sec10}</p></div>
                <div><h4 className="font-bold text-gray-900">{s.sec12t}</h4><p>{s.sec12}</p></div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><PenTool className="h-5 w-5 text-sb-primary" />{s.signature}</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{s.printedName}</label>
                  <Input value={agreementForm.printedName} onChange={(e) => handleAgreementChange("printedName", e.target.value)} placeholder={s.printedNamePh} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{s.drawSignature}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white touch-none overflow-hidden relative">
                    <canvas ref={canvasRef} width={500} height={200} className="w-full h-48 cursor-crosshair touch-none block"
                      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                    <button type="button" onClick={clearSignature} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition" title={s.clearSignature}>
                      <Eraser className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{s.signHint}</p>
                </div>
                <label className="flex items-start gap-3 p-4 bg-white border rounded-xl cursor-pointer hover:border-sb-primary transition">
                  <input type="checkbox" checked={agreementForm.agreed} onChange={(e) => handleAgreementChange("agreed", e.target.checked)} className="w-5 h-5 mt-0.5 border-gray-300 rounded text-sb-primary focus:ring-sb-primary" />
                  <span className="text-sm text-gray-700 leading-tight" dangerouslySetInnerHTML={{ __html: s.agreeText }} />
                </label>
              </div>

              <Button type="submit" disabled={loading || !agreementForm.agreed || !signatureData} className="w-full py-4 text-lg">{loading ? s.submitting : s.submitBtn}</Button>
            </form>
          </div>
          <p className="text-center text-sm text-gray-500">{s.alreadyHave} <Link href="/login" className="text-sb-primary font-medium hover:underline">{s.signIn}</Link></p>
        </div>
      </div>
    </div>
  );
}