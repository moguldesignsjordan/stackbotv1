"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Warehouse,
  FileText,
  Shield,
  RotateCcw,
  XCircle,
  Building2,
  Globe,
  CreditCard,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = useMemo(
    () => ({
      "Get to Know Us": [
        { label: "About", href: "/about" },
        { label: "Careers", href: "/careers" },
        { label: "Blog", href: "/blog" },
        { label: "Newsroom", href: "/newsroom" },
      ],
      "Let Us Help You": [
        { label: "Account", href: "/account" },
        { label: "Order History", href: "/orders" },
        { label: "Support", href: "/support" },
        { label: "Track Order", href: "/track" },
      ],
      "Do Business With Us": [
        { label: "Become a Driver", href: "/driver-signup" },
        { label: "Become a Vendor", href: "/vendor-signup" },
        { label: "Become an Affiliate", href: "/affiliate-signup" },
        { label: "Partner With Us", href: "/partners" },
      ],
    }),
    []
  );

  const policyLinks = useMemo(
    () => [
      { label: "Returns & Refunds", href: "/policies/returns", icon: RotateCcw },
      { label: "Cancellations", href: "/policies/cancellations", icon: XCircle },
      { label: "Security & Privacy", href: "/policies/security", icon: Shield },
      { label: "Terms of Service", href: "/policies/terms", icon: FileText },
    ],
    []
  );

  return (
    <footer className="bg-[var(--sb-dark)] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: Company Info & Contact */}
          <div className="lg:col-span-1">
            {/* Logo & Brand */}
            <div className="mb-6">
              <Link href="/" className="inline-block">
                <Image
                  src="/stackbot-logo-white.png"
                  alt="StackBot"
                  width={140}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Company Legal Info */}
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white">StackBot Global, S.R.L.</p>
                  <p>RNC: 133-55242-6</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                <p>República Dominicana</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="mt-6 space-y-3 text-sm">
              <a
                href="mailto:support@stackbotglobal.com"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-gray-500" />
                support@stackbotglobal.com
              </a>
              <a
                href="tel:+18493917763"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-gray-500" />
                +1 (849) 391-7763
              </a>
            </div>

            {/* Download App Buttons */}
            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                Coming Soon
              </p>
              <div className="flex gap-2">
                <button
                  disabled
                  className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-gray-500 cursor-not-allowed"
                >
                  App Store
                </button>
                <button
                  disabled
                  className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs text-gray-500 cursor-not-allowed"
                >
                  Google Play
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-1">
            <div className="grid grid-cols-1 gap-8">
              {Object.entries(quickLinks).map(([title, items]) => (
                <div key={title}>
                  <h4 className="font-semibold mb-3 text-white/90 text-sm uppercase tracking-wide">
                    {title}
                  </h4>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Warehouse & Pickup Info */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold mb-4 text-white/90 text-sm uppercase tracking-wide">
              Warehouse & Pickup
            </h4>

            {/* Address */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--sb-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <Warehouse className="w-4 h-4 text-[var(--sb-primary)]" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-white mb-1">StackBot Global Warehouse</p>
                  <p className="text-gray-400 leading-relaxed">
                    Calle Principal No. 1,
                    <br />
                    Esquina Calle El Administrador
                    <br />
                    Villa Montellano, Puerto Plata
                    <br />
                    República Dominicana
                  </p>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-white mb-1">Business Hours</p>
                  <p className="text-gray-400">Monday – Saturday</p>
                  <p className="text-white font-medium">9:00 AM – 6:00 PM AST</p>
                </div>
              </div>
            </div>

            {/* Pickup Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-300 mb-1">Customer Pickup</p>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Public warehouse pickup available during business hours. Valid ID and
                    order number required.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Policies & Legal */}
          <div className="lg:col-span-1">
            <h4 className="font-semibold mb-4 text-white/90 text-sm uppercase tracking-wide">
              Policies & Legal
            </h4>

            <ul className="space-y-2">
              {policyLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm py-1.5"
                    >
                      <Icon className="w-4 h-4 text-gray-500" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Business Scope Summary */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                Our Services
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                AI-powered logistics, warehousing, delivery coordination, e-commerce
                marketplace, mobile platforms, import/export, and technology-enabled
                business solutions.
              </p>
            </div>

            {/* Payment Methods & Currency */}
            <div className="mt-4 space-y-3">
              {/* Currency Notice */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                  <span className="font-medium">RD$</span>
                  <span>Dominican Peso</span>
                </span>
              </div>

              {/* Payment Methods */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">We accept:</span>
                <div className="flex items-center gap-2">
                  {/* Visa */}
                  <div className="bg-white rounded px-2 py-1">
                    <svg className="h-4 w-auto" viewBox="0 0 48 16" fill="none">
                      <path
                        d="M19.5 1.5L17 14.5H13.5L16 1.5H19.5ZM33.5 9.5L35.5 4L36.5 9.5H33.5ZM37.5 14.5H41L38 1.5H35C34 1.5 33.5 2 33 3L27 14.5H31L31.5 13H36.5L37.5 14.5ZM28 9.5C28 5.5 22.5 5 22.5 3.5C22.5 3 23 2.5 24 2.5C25.5 2.5 27 3 27.5 3.5L28.5 1C28 0.5 26 0 24 0C20.5 0 18 2 18 4.5C18 8 22 8.5 22 10C22 10.5 21.5 11.5 20 11.5C18 11.5 16.5 10.5 16 10L15 13C15.5 13.5 17.5 14.5 20 14.5C24 15 28 13 28 9.5ZM12 1.5L8 10.5L7.5 8L6 2.5C5.5 1.5 5 1.5 4 1.5H0L0 2C2 2.5 4 3.5 5.5 5L8.5 14.5H12.5L17 1.5H12Z"
                        fill="#1A1F71"
                      />
                    </svg>
                  </div>
                  {/* Mastercard */}
                  <div className="bg-white rounded px-2 py-1">
                    <svg className="h-4 w-auto" viewBox="0 0 32 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#EB001B" />
                      <circle cx="22" cy="10" r="10" fill="#F79E1B" />
                      <path
                        d="M16 3.5C17.8 5 19 7.3 19 10C19 12.7 17.8 15 16 16.5C14.2 15 13 12.7 13 10C13 7.3 14.2 5 16 3.5Z"
                        fill="#FF5F00"
                      />
                    </svg>
                  </div>
                  {/* Credit Card Icon for others */}
                  <div className="bg-white/10 rounded px-2 py-1 flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-400">+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-gray-500 text-sm text-center sm:text-left">
              © {currentYear} StackBot Global, S.R.L. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com/stackbot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://instagram.com/stackbot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/stackbot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Twitter/X"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://wa.me/18493917763"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}