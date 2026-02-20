// src/components/driver/LocationDisclosure.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// PROMINENT DISCLOSURE for background location — required by Google Play policy
//
// This modal MUST be shown BEFORE the Android runtime permission prompt.
// Google requires a "prominent disclosure" that explains:
//   1. What data is collected (location)
//   2. Why it's collected (live delivery tracking)
//   3. That it happens in the background
//
// The video you submit to Google Play should show:
//   1. This modal appearing when driver first opens the app
//   2. Driver tapping "Enable Location"
//   3. Android system permission dialog appearing
//   4. Customer seeing live driver tracking on map
//
// USAGE:
//   <LocationDisclosure
//     language="es"
//     onAccept={() => { requestLocationPermission(); setShowDisclosure(false); }}
//     onDecline={() => setShowDisclosure(false)}
//   />
// ═══════════════════════════════════════════════════════════════════════════════
'use client';

import { MapPin, Navigation, Shield, Eye, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Language = 'es' | 'en';

interface LocationDisclosureProps {
  language: Language;
  onAccept: () => void;
  onDecline: () => void;
}

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  es: {
    title: 'Ubicación Requerida',
    subtitle: 'Para funcionar como conductor, StackBot necesita acceso a tu ubicación.',
    whyTitle: '¿Por qué necesitamos tu ubicación?',
    reason1Title: 'Pedidos cercanos',
    reason1Desc: 'Te mostramos solo los pedidos de entrega cerca de tu ubicación actual.',
    reason2Title: 'Seguimiento en vivo',
    reason2Desc:
      'Los clientes ven tu ubicación en tiempo real en el mapa mientras entregas su pedido.',
    reason3Title: 'Navegación',
    reason3Desc:
      'Te guiamos al punto de recogida del vendedor y a la dirección de entrega del cliente.',
    backgroundTitle: 'Uso en segundo plano',
    backgroundDesc:
      'Durante una entrega activa, tu ubicación se comparte con el cliente incluso cuando cambias a la app de navegación (Google Maps, Waze) o bloqueas la pantalla. Esto permite que el cliente vea tu progreso en tiempo real.',
    dataNotice:
      'Tu ubicación solo se comparte durante entregas activas y nunca se vende a terceros.',
    accept: 'Permitir Ubicación',
    decline: 'Ahora no',
    declineWarning:
      'Sin ubicación no podrás ver pedidos cercanos ni realizar entregas.',
  },
  en: {
    title: 'Location Required',
    subtitle: 'To work as a driver, StackBot needs access to your location.',
    whyTitle: 'Why do we need your location?',
    reason1Title: 'Nearby orders',
    reason1Desc: 'We show you only delivery requests near your current location.',
    reason2Title: 'Live tracking',
    reason2Desc:
      'Customers see your real-time location on the map while you deliver their order.',
    reason3Title: 'Navigation',
    reason3Desc:
      'We guide you to the vendor pickup point and the customer delivery address.',
    backgroundTitle: 'Background usage',
    backgroundDesc:
      'During an active delivery, your location is shared with the customer even when you switch to a navigation app (Google Maps, Waze) or lock your screen. This lets the customer track your progress in real time.',
    dataNotice:
      'Your location is only shared during active deliveries and is never sold to third parties.',
    accept: 'Enable Location',
    decline: 'Not now',
    declineWarning:
      'Without location access you won\'t be able to see nearby orders or make deliveries.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LocationDisclosure({
  language,
  onAccept,
  onDecline,
}: LocationDisclosureProps) {
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#55529d] to-[#3d3b7a] px-6 pt-8 pb-6 rounded-t-3xl sm:rounded-t-2xl">
          <button
            onClick={onDecline}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
          <p className="text-sm text-white/80 mt-1">{t.subtitle}</p>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">
          {/* Why we need location */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.whyTitle}</h3>
            <div className="space-y-3">
              <ReasonItem
                icon={<Navigation className="w-4 h-4 text-[#55529d]" />}
                title={t.reason1Title}
                description={t.reason1Desc}
              />
              <ReasonItem
                icon={<Eye className="w-4 h-4 text-[#55529d]" />}
                title={t.reason2Title}
                description={t.reason2Desc}
              />
              <ReasonItem
                icon={<MapPin className="w-4 h-4 text-[#55529d]" />}
                title={t.reason3Title}
                description={t.reason3Desc}
              />
            </div>
          </div>

          {/* Background location explanation — KEY for Google Play */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">{t.backgroundTitle}</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {t.backgroundDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Privacy notice */}
          <p className="text-xs text-gray-500 text-center leading-relaxed">{t.dataNotice}</p>
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onAccept}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#55529d] hover:bg-[#444280] text-white font-semibold rounded-xl transition-colors active:scale-[0.98]"
          >
            <MapPin className="w-5 h-5" />
            {t.accept}
          </button>
          <button
            onClick={onDecline}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            {t.decline}
          </button>
          <p className="text-[11px] text-gray-400 text-center">{t.declineWarning}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────
function ReasonItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-[#55529d]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{description}</p>
      </div>
    </div>
  );
}