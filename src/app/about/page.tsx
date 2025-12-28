// src/app/about/page.tsx
import Link from "next/link";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Package,
  Truck,
  ShoppingBag,
  Cpu,
  Clock,
  FileText,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "About Us | StackBot Global",
  description:
    "Learn about StackBot Global SRL - AI-powered logistics, e-commerce marketplace, and technology solutions in the Dominican Republic.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white overflow-hidden">


        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              About{" "}
              <span className="bg-gradient-to-r from-[#f97316] to-[#fb923c] bg-clip-text text-transparent">
                StackBot Global
              </span>
            </h1>
            <p className="text-xl text-white/80 leading-relaxed">
              Empowering Caribbean commerce through AI-powered logistics,
              e-commerce marketplace solutions, and cutting-edge technology.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Company Information Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#55529d]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Company Information
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Legal Name</p>
                    <p className="font-semibold text-gray-900">
                      StackBot Global, S.R.L.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Commercial Name</p>
                    <p className="font-semibold text-gray-900">StackBot Global</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">RNC</p>
                    <p className="font-semibold text-gray-900 font-mono">
                      133-55242-6
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Country</p>
                    <p className="font-semibold text-gray-900">
                      República Dominicana 🇩🇴
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Scope Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Business Scope
                </h2>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                StackBot Global provides comprehensive technology-enabled business
                solutions across the Caribbean region, specializing in:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Cpu,
                    title: "AI-Powered Logistics",
                    color: "purple",
                  },
                  {
                    icon: Package,
                    title: "Warehousing Solutions",
                    color: "blue",
                  },
                  {
                    icon: Truck,
                    title: "Delivery Coordination",
                    color: "green",
                  },
                  {
                    icon: ShoppingBag,
                    title: "E-Commerce Marketplace",
                    color: "orange",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.color === "purple"
                          ? "bg-purple-100 text-purple-600"
                          : item.color === "blue"
                          ? "bg-blue-100 text-blue-600"
                          : item.color === "green"
                          ? "bg-green-100 text-green-600"
                          : "bg-orange-100 text-orange-600"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">{item.title}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl">
                <p className="text-sm text-gray-700">
                  Additional services include mobile application platforms,
                  import/export services, and technology-enabled business
                  solutions tailored for the Caribbean market.
                </p>
              </div>
            </div>

            {/* Warehouse & Pickup Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Customer Pickup
                </h2>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900 mb-1">
                      Public Warehouse Pickup Available
                    </p>
                    <p className="text-sm text-green-700">
                      Customers can pick up their orders during business hours at
                      our warehouse location.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Pickup Requirements:
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Valid government-issued ID
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Order number or confirmation email
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Visit during business hours
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Contact & Address */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Contact Information
              </h3>

              <div className="space-y-4">
                <a
                  href="mailto:support@stackbotglobal.com"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition group"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition">
                    <Mail className="w-5 h-5 text-[#55529d]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">
                      support@stackbotglobal.com
                    </p>
                  </div>
                </a>

                <a
                  href="tel:+18493917763"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-green-50 transition group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">
                      +1 (849) 391-7763
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Registered & Warehouse Address
              </h3>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    StackBot Global Warehouse
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
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

              <a
                href="https://maps.google.com/?q=Villa+Montellano+Puerto+Plata+Dominican+Republic"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#55529d]/90 transition"
              >
                <MapPin className="w-4 h-4" />
                View on Google Maps
              </a>
            </div>

            {/* Quick Links */}
            <div className="bg-gradient-to-br from-[#55529d] to-[#6366f1] rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href="/vendors"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Vendors</span>
                </Link>
                <Link
                  href="/vendor-signup"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Become a Vendor</span>
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition"
                >
                  <Globe className="w-4 h-4" />
                  <span>Sign In / Sign Up</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <section className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            Join thousands of vendors and customers using StackBot Global for
            seamless commerce in the Caribbean.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/vendor-signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f97316] text-white rounded-xl font-semibold hover:bg-[#ea580c] transition"
            >
              <Building2 className="w-5 h-5" />
              Become a Vendor
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}