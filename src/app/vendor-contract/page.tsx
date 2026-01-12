"use client";

import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase/config";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  FileText,
  PenTool,
  Eraser,
  AlertCircle,
  CheckCircle2,
  Building2,
  Mail,
  User,
  Phone,
  MapPin,
  Hash,
  Globe
} from "lucide-react";

// ----------------------------------------------------------------------
// TRANSLATION DICTIONARY
// ----------------------------------------------------------------------
const TRANSLATIONS = {
  en: {
    title: "Vendor Agreement",
    subtitle: "",
    intro: "Sign-in not required. Please fill out your details below.",
    lbl_business: "Business Name",
    lbl_rnc: "RNC (if applicable)",
    lbl_email: "Email",
    lbl_phone: "Phone / WhatsApp",
    lbl_address: "Address / Area",
    lbl_signer: "Authorized Signer (Printed Name)",
    lbl_draw: "Draw Your Signature",
    lbl_clear: "Clear",
    lbl_agree: "I have read and agree to the StackBot Vendor Agreement. I certify that I am authorized to sign on behalf of the business identified above.",
    btn_submit: "Submit Agreement",
    btn_submitting: "Recording Agreement...",
    btn_another: "Sign Another Agreement",
    success_title: "Agreement Signed!",
    success_msg: "Thank you,",
    error_missing: "is required.",
    error_email: "Valid Business Email is required.",
    error_sig: "Please sign the agreement using the signature box.",
    error_terms: "You must agree to the terms.",
    // Contract Sections
    c_header: "STACKBOT GLOBAL S.R.L.",
    c_subheader: "VENDOR AGREEMENT",
    c_date: "Effective Date: Today | Company RNC: 133-55242-6",
    c_1_title: "1) Parties",
    c_1_text: "This Vendor Agreement (\"Agreement\") is between StackBot Global, S.R.L. (\"StackBot\") and the business/vendor identified in Section 14 (\"Vendor\").",
    c_2_title: "2) Purpose",
    c_2_text: "StackBot provides an online marketplace that lets customers discover and place orders with local vendors for pickup and/or delivery (where available), and lets service vendors accept appointment bookings through StackBot.",
    c_3_title: "3) Vendor Listings and Content",
    c_3_text: "Vendor authorizes StackBot to display Vendor's business name, address/area, hours, phone/WhatsApp, email, menu/items/services, prices, photos, logos, and promotional content (provided by Vendor or created with Vendor's approval). Vendor confirms it has the rights to all content it provides and that the content is accurate and not misleading.",
    c_4_title: "4) Orders, Pickup, and Fulfillment",
    c_4_list_1: "Retail/Restaurant Orders (pickup-first): Vendor agrees to prepare orders promptly and follow pickup instructions shown on the order. Vendor is responsible for item availability and substitutions (if allowed). StackBot may pause listings that repeatedly create customer complaints (wrong items, missing items, not open, etc.).",
    c_4_list_2: "Delivery (when available): Delivery may be offered by StackBot or its delivery partners in certain zones. Vendor agrees to package orders in a safe, reasonable way for transport.",
    c_5_title: "5) Appointment Bookings (Service Businesses)",
    c_5_text: "For appointment-based vendors: Vendor agrees to honor confirmed bookings or follow cancellation/reschedule rules in Section 9. Vendor sets service prices and availability.",
    c_6_title: "6) Fees (How StackBot Gets Paid)",
    c_6_list_1: "A) Restaurants + Retail (Commission / Platform Fee): StackBot charges the customer a 15% platform fee on the order subtotal (or as shown at checkout). Vendor keeps 100% of Vendor's listed item subtotal (excluding any StackBot fees charged to the customer).",
    c_6_list_2: "B) Appointment Businesses (Booking Fee): StackBot charges the customer a 5% booking fee (or as shown at checkout). Vendor keeps 100% of Vendor's listed service amount (excluding StackBot booking fee charged to the customer).",
    c_6_list_3: "C) Customer Subscriptions: Customer subscriptions are paid by customers to StackBot and do not reduce Vendor's listed payout unless explicitly agreed in writing.",
    c_6_list_4: "D) Cash Orders (Platform Fee Still Applies): If cash payment is enabled for Vendor, Vendor acknowledges the applicable StackBot platform fee/commission still applies to cash orders. Vendor agrees to pay StackBot the platform fee for cash orders on a weekly basis. If Vendor does not pay fees on time, StackBot may disable cash payments, deduct unpaid fees from future payouts, or pause the Vendor account.",
    c_7_title: "7) Payments and Weekly Payouts",
    c_7_text: "StackBot may process customer payments through third-party payment processors, including AZUL and Stripe. StackBot collects customer payment (for card/online transactions) and remits Vendor payouts on a weekly payout schedule during Phase 1. Vendor must provide valid payout details. StackBot may delay payouts for verification, disputes, fraud risk, processor holds, or reserve requirements.",
    c_8_title: "8) Refunds, Disputes, Fraud, and Chargebacks",
    c_8_intro: "Vendor understands that online payments can result in refunds and disputes/chargebacks.",
    c_8_list_1: "General rule (Phase 1): If an issue is caused by Vendor (wrong/missing items, not open, refused pickup, quality issues, etc.), Vendor may be responsible for the refunded amount related to that order.",
    c_8_list_2: "If the issue is not caused by Vendor (verified fraud, platform error), StackBot will handle it under its internal policy.",
    c_8_list_3: "Vendor agrees to provide reasonable supporting documentation upon request within 48-72 hours.",
    c_8_list_4: "If a dispute/chargeback is decided against the transaction due to Vendor performance or policy violations, Vendor is responsible for the refunded amount and any processor chargeback fees.",
    c_9_title: "9) Cancellations, No-Shows, and Service Standards",
    c_9_text: "Vendor agrees to reasonable customer service standards and will communicate promptly if an item/service is unavailable. For appointment bookings, Vendor should follow the cancellation/reschedule rules shown to the customer at booking. Repeated failures may result in pausing or removal from the platform.",
    c_10_title: "10) Prohibited Items, Taxes, and Compliance",
    c_10_text: "Vendor agrees not to list illegal or restricted items. If Vendor lists age-restricted items (example: alcohol/beer), Vendor agrees to follow applicable rules and any age-verification requirements. Vendor is solely responsible for its tax obligations, invoicing/receipts (if applicable), and compliance with DGII and other applicable Dominican Republic laws and regulations for its business.",
    c_11_title: "11) Platform Rules and Updates",
    c_11_text: "Vendor agrees that StackBot's platform Terms & Policies (including refund/cancellation/service standards, prohibited items list, and content rules) may apply and may be incorporated by reference once provided/linked. StackBot may update operational rules during Phase 1 with notice.",
    c_12_title: "12) Term, Termination, and Pausing Listings",
    c_12_text: "Either party may end this Agreement with written notice. StackBot may pause or remove Vendor listings for repeated service failures, suspected fraud, policy violations, unpaid balances, or customer harm.",
    c_13_title: "13) Governing Law",
    c_13_text: "Dominican Republic.",
  },
  es: {
    title: "Acuerdo de Vendedor",
    subtitle: "",
    intro: "No se requiere iniciar sesión. Complete sus detalles a continuación.",
    lbl_business: "Nombre del Negocio",
    lbl_rnc: "RNC (si aplica)",
    lbl_email: "Correo Electrónico",
    lbl_phone: "Teléfono / WhatsApp",
    lbl_address: "Dirección / Sector",
    lbl_signer: "Firmante Autorizado (Nombre Impreso)",
    lbl_draw: "Dibuje su Firma",
    lbl_clear: "Borrar",
    lbl_agree: "He leído y acepto el Acuerdo de Vendedor de StackBot. Certifico que estoy autorizado para firmar en nombre del negocio identificado arriba.",
    btn_submit: "Enviar Acuerdo",
    btn_submitting: "Registrando Acuerdo...",
    btn_another: "Firmar Otro Acuerdo",
    success_title: "¡Acuerdo Firmado!",
    success_msg: "Gracias,",
    error_missing: "es requerido.",
    error_email: "Se requiere un correo electrónico válido.",
    error_sig: "Por favor firme el acuerdo usando el cuadro de firma.",
    error_terms: "Debe aceptar los términos.",
    // Contract Sections - Translated based on 
    c_header: "STACKBOT GLOBAL S.R.L.",
    c_subheader: "ACUERDO DE VENDEDOR (FASE 1 - FORMULARIO CORTO)",
    c_date: "Fecha Efectiva: Hoy | RNC de la Empresa: 133-55242-6",
    c_1_title: "1) Partes",
    c_1_text: "Este Acuerdo de Vendedor (\"Acuerdo\") se celebra entre StackBot Global, S.R.L. (\"StackBot\") y el negocio/vendedor identificado en la Sección 14 (\"Vendedor\").",
    c_2_title: "2) Propósito",
    c_2_text: "StackBot proporciona un mercado en línea que permite a los clientes descubrir y realizar pedidos a vendedores locales para su recogida y/o entrega (donde esté disponible), y permite a los vendedores de servicios aceptar reservas de citas a través de StackBot.",
    c_3_title: "3) Listados de Vendedores y Contenido",
    c_3_text: "El Vendedor autoriza a StackBot a mostrar el nombre comercial del Vendedor, dirección/zona, horario, teléfono/WhatsApp, correo electrónico, menú/artículos/servicios, precios, fotos, logotipos y contenido promocional (proporcionado por el Vendedor o creado con la aprobación del Vendedor). El Vendedor confirma que tiene los derechos sobre todo el contenido que proporciona y que el contenido es preciso y no engañoso.",
    c_4_title: "4) Pedidos, Recogida y Cumplimiento",
    c_4_list_1: "Pedidos de Retail/Restaurante (prioridad recogida): El Vendedor acuerda preparar los pedidos con prontitud y seguir las instrucciones de recogida mostradas en el pedido. El Vendedor es responsable de la disponibilidad de los artículos y las sustituciones (si se permiten). StackBot puede pausar los listados que generen repetidamente quejas de los clientes (artículos incorrectos, faltantes, cerrado, etc.).",
    c_4_list_2: "Entrega (cuando esté disponible): La entrega puede ser ofrecida por StackBot o sus socios de entrega en ciertas zonas. El Vendedor acuerda empaquetar los pedidos de manera segura y razonable para el transporte.",
    c_5_title: "5) Reservas de Citas (Negocios de Servicios)",
    c_5_text: "Para vendedores basados en citas: El Vendedor acuerda honrar las reservas confirmadas o seguir las reglas de cancelación/reprogramación en la Sección 9. El Vendedor establece los precios y la disponibilidad de los servicios.",
    c_6_title: "6) Tarifas (Cómo cobra StackBot)",
    c_6_list_1: "A) Restaurantes + Retail (Comisión / Tarifa de Plataforma): StackBot cobra al cliente una tarifa de plataforma del 15% sobre el subtotal del pedido (o como se muestre al finalizar la compra). El Vendedor conserva el 100% del subtotal de los artículos listados por el Vendedor (excluyendo cualquier tarifa de StackBot cobrada al cliente).",
    c_6_list_2: "B) Negocios de Citas (Tarifa de Reserva): StackBot cobra al cliente una tarifa de reserva del 5% (o como se muestre al finalizar la compra). El Vendedor conserva el 100% del monto del servicio listado por el Vendedor (excluyendo la tarifa de reserva de StackBot cobrada al cliente).",
    c_6_list_3: "C) Suscripciones de Clientes: Las suscripciones de clientes son pagadas por los clientes a StackBot y no reducen el pago listado del Vendedor a menos que se acuerde explícitamente por escrito.",
    c_6_list_4: "D) Pedidos en Efectivo (Aplica Tarifa de Plataforma): Si el pago en efectivo está habilitado para el Vendedor, el Vendedor reconoce que la tarifa/comisión de plataforma aplicable de StackBot aún se aplica a los pedidos en efectivo. El Vendedor acuerda pagar a StackBot la tarifa de plataforma por pedidos en efectivo semanalmente. Si el Vendedor no paga las tarifas a tiempo, StackBot puede deshabilitar los pagos en efectivo, deducir tarifas no pagadas de pagos futuros o pausar la cuenta del Vendedor.",
    c_7_title: "7) Pagos y Liquidaciones Semanales",
    c_7_text: "StackBot puede procesar pagos de clientes a través de procesadores de terceros, incluidos AZUL y Stripe. StackBot cobra el pago del cliente (para transacciones con tarjeta/en línea) y remite los pagos al Vendedor en un cronograma de pago semanal durante la Fase 1. El Vendedor debe proporcionar detalles de pago válidos. StackBot puede retrasar los pagos por verificación, disputas, riesgo de fraude, retenciones del procesador o requisitos de reserva.",
    c_8_title: "8) Reembolsos, Disputas, Fraude y Contracargos",
    c_8_intro: "El Vendedor entiende que los pagos en línea pueden resultar en reembolsos y disputas/contracargos.",
    c_8_list_1: "Regla general (Fase 1): Si un problema es causado por el Vendedor (artículos incorrectos/faltantes, no abierto, recogida rechazada, problemas de calidad, etc.), el Vendedor puede ser responsable del monto reembolsado relacionado con ese pedido.",
    c_8_list_2: "Si el problema no es causado por el Vendedor (fraude verificado, error de plataforma), StackBot lo manejará bajo su política interna.",
    c_8_list_3: "El Vendedor acuerda proporcionar documentación de respaldo razonable a solicitud dentro de las 48-72 horas.",
    c_8_list_4: "Si una disputa/contracargo se decide en contra de la transacción debido al desempeño del Vendedor o violaciones de la política, el Vendedor es responsable del monto reembolsado y cualquier tarifa de contracargo del procesador.",
    c_9_title: "9) Cancelaciones, No-Shows y Estándares de Servicio",
    c_9_text: "El Vendedor acuerda mantener estándares razonables de servicio al cliente y se comunicará prontamente si un artículo/servicio no está disponible. Para reservas de citas, el Vendedor debe seguir las reglas de cancelación/reprogramación mostradas al cliente al reservar. Fallas repetidas pueden resultar en la pausa o eliminación de la plataforma.",
    c_10_title: "10) Artículos Prohibidos, Impuestos y Cumplimiento",
    c_10_text: "El Vendedor acuerda no listar artículos ilegales o restringidos. Si el Vendedor lista artículos con restricción de edad (ejemplo: alcohol/cerveza), el Vendedor acuerda seguir las reglas aplicables y cualquier requisito de verificación de edad. El Vendedor es el único responsable de sus obligaciones fiscales, facturación/recibos (si aplica) y el cumplimiento de la DGII y otras leyes y regulaciones aplicables de la República Dominicana para su negocio.",
    c_11_title: "11) Reglas de la Plataforma y Actualizaciones",
    c_11_text: "El Vendedor acepta que los Términos y Políticas de la plataforma de StackBot (incluidos los estándares de reembolso/cancelación/servicio, lista de artículos prohibidos y reglas de contenido) pueden aplicarse y pueden incorporarse por referencia una vez proporcionados/vinculados. StackBot puede actualizar las reglas operativas durante la Fase 1 con aviso.",
    c_12_title: "12) Vigencia, Terminación y Pausa de Listados",
    c_12_text: "Cualquiera de las partes puede rescindir este Acuerdo con aviso por escrito. StackBot puede pausar o eliminar los listados del Vendedor por fallas repetidas en el servicio, sospecha de fraude, violaciones de políticas, saldos impagos o daño al cliente.",
    c_13_title: "13) Ley Aplicable",
    c_13_text: "República Dominicana.",
  }
};

type Language = "en" | "es";

export default function PublicAgreementPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lang, setLang] = useState<Language>("es"); // Default to Spanish as user location is DR
  const t = TRANSLATIONS[lang]; // Shortcut for translation object

  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [identity, setIdentity] = useState({
    businessName: "",
    rnc: "",
    address: "",
    email: "",
    phone: "",
    printedName: "",
    agreed: false,
  });

  // --- Canvas Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.toBlob((blob) => setSignatureData(blob));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  const handleChange = (field: keyof typeof identity, value: any) => {
    setIdentity((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!identity.businessName.trim()) throw new Error(`${t.lbl_business} ${t.error_missing}`);
      if (!identity.email.trim() || !identity.email.includes("@")) throw new Error(t.error_email);
      if (!identity.phone.trim()) throw new Error(`${t.lbl_phone} ${t.error_missing}`);
      if (!identity.address.trim()) throw new Error(`${t.lbl_address} ${t.error_missing}`);
      if (!identity.printedName.trim()) throw new Error(`${t.lbl_signer} ${t.error_missing}`);
      if (!signatureData) throw new Error(t.error_sig);
      if (!identity.agreed) throw new Error(t.error_terms);

      let signatureUrl = "";
      if (signatureData) {
        const safeEmail = identity.email.replace(/[^a-z0-9]/gi, '_');
        const filename = `${Date.now()}_${safeEmail}_signature.png`;
        const sigRef = ref(getStorage(), `agreements/${filename}`);
        await uploadBytes(sigRef, signatureData);
        signatureUrl = await getDownloadURL(sigRef);
      }

      await addDoc(collection(db, "vendor_contracts"), {
        business_name: identity.businessName.trim(),
        rnc: identity.rnc.trim(),
        address: identity.address.trim(),
        business_email: identity.email.trim(),
        phone: identity.phone.trim(),
        contact_name: identity.printedName.trim(),
        signature_url: signatureUrl,
        agreement_version: "phase1_short_form",
        signed_at: serverTimestamp(),
        ip_meta: "public_submission",
        language: lang,
        status: "pending_review"
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Agreement sign error:", err);
      // Fallback message if error object doesn't have a clean message
      setError(err.message || "Error submitting form. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-sb-bg flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.success_title}</h1>
          <p className="text-gray-600">{t.success_msg} <strong>{identity.printedName}</strong>.</p>
          <div className="pt-6">
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">{t.btn_another}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sb-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* LANGUAGE TOGGLE */}
        <div className="flex justify-end mb-4">
          <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center shadow-sm">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${lang === "en" ? "bg-gray-100 text-sb-primary" : "text-gray-500 hover:text-gray-700"}`}
            >
              English
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button
              onClick={() => setLang("es")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${lang === "es" ? "bg-gray-100 text-sb-primary" : "text-gray-500 hover:text-gray-700"}`}
            >
              Español
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6">
          <div className="text-center border-b border-gray-100 pb-6">
            <div className="w-16 h-16 bg-sb-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <FileText className="h-8 w-8 text-sb-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-2">{t.subtitle}</p>
            <p className="text-xs text-gray-400 mt-1">{t.intro}</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" />{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* INPUT FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700">{t.lbl_business} *</label>
                 <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="" value={identity.businessName} onChange={(e) => handleChange("businessName", e.target.value)} required />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700">{t.lbl_rnc}</label>
                 <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" placeholder="101-XXXXX-X" value={identity.rnc} onChange={(e) => handleChange("rnc", e.target.value)} />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700">{t.lbl_email} *</label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="email" className="pl-9" placeholder="owner@example.com" value={identity.email} onChange={(e) => handleChange("email", e.target.value)} required />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-sm font-medium text-gray-700">{t.lbl_phone} *</label>
                 <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input type="tel" className="pl-9" placeholder="(809) 555-0123" value={identity.phone} onChange={(e) => handleChange("phone", e.target.value)} required />
                 </div>
              </div>
        
      
            </div>

            {/* FULL CONTRACT TEXT BLOCK */}
            <div className="border border-gray-300 rounded-xl bg-gray-50 h-96 overflow-y-auto p-6 text-sm text-gray-700 space-y-4 shadow-inner">
                <div className="text-center font-bold text-gray-900 mb-4 border-b border-gray-300 pb-4">
                  <h2 className="text-xl">{t.c_header}</h2>
                  <h3 className="text-lg">{t.c_subheader}</h3>
                  <p className="text-xs text-gray-500 font-normal mt-1">{t.c_date}</p>
                </div>

                <div><h4 className="font-bold text-gray-900">{t.c_1_title}</h4><p>{t.c_1_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_2_title}</h4><p>{t.c_2_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_3_title}</h4><p>{t.c_3_text}</p></div>
                <div>
                  <h4 className="font-bold text-gray-900">{t.c_4_title}</h4>
                  <ul className="list-disc pl-5 space-y-1"><li>{t.c_4_list_1}</li><li>{t.c_4_list_2}</li></ul>
                </div>
                <div><h4 className="font-bold text-gray-900">{t.c_5_title}</h4><p>{t.c_5_text}</p></div>
                <div>
                  <h4 className="font-bold text-gray-900">{t.c_6_title}</h4>
                  <ul className="list-disc pl-5 space-y-1"><li>{t.c_6_list_1}</li><li>{t.c_6_list_2}</li><li>{t.c_6_list_3}</li><li>{t.c_6_list_4}</li></ul>
                </div>
                <div><h4 className="font-bold text-gray-900">{t.c_7_title}</h4><p>{t.c_7_text}</p></div>
                <div>
                  <h4 className="font-bold text-gray-900">{t.c_8_title}</h4>
                  <p>{t.c_8_intro}</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1"><li>{t.c_8_list_1}</li><li>{t.c_8_list_2}</li><li>{t.c_8_list_3}</li><li>{t.c_8_list_4}</li></ul>
                </div>
                <div><h4 className="font-bold text-gray-900">{t.c_9_title}</h4><p>{t.c_9_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_10_title}</h4><p>{t.c_10_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_11_title}</h4><p>{t.c_11_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_12_title}</h4><p>{t.c_12_text}</p></div>
                <div><h4 className="font-bold text-gray-900">{t.c_13_title}</h4><p>{t.c_13_text}</p></div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><PenTool className="h-5 w-5 text-sb-primary" />{lang === "en" ? "Signature" : "Firma"}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.lbl_signer} *</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input className="pl-9" value={identity.printedName} onChange={(e) => handleChange("printedName", e.target.value)} placeholder="" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.lbl_draw} *</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white touch-none overflow-hidden relative">
                  <canvas ref={canvasRef} width={500} height={200} className="w-full h-48 cursor-crosshair touch-none block" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                  <button type="button" onClick={clearSignature} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition text-xs" title={t.lbl_clear}>
                    <Eraser className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-white border rounded-xl cursor-pointer hover:border-sb-primary transition">
                <input type="checkbox" checked={identity.agreed} onChange={(e) => handleChange("agreed", e.target.checked)} className="w-5 h-5 mt-0.5 border-gray-300 rounded text-sb-primary focus:ring-sb-primary" />
                <span className="text-sm text-gray-700 leading-tight">{t.lbl_agree}</span>
              </label>
            </div>

            <Button type="submit" disabled={loading || !identity.agreed || !signatureData} className="w-full py-4 text-lg">
                {loading ? t.btn_submitting : t.btn_submit}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}