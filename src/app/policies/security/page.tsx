import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Server, UserCheck, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Security & Privacy Policy | StackBot",
  description: "StackBot Global security and privacy policy. How we protect your data in the Dominican Republic.",
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Security & Privacy</h1>
          </div>
          <p className="text-gray-400">Last updated: January 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {/* Overview */}
          <section>
            <p className="text-gray-600 leading-relaxed">
              At StackBot Global, S.R.L., we take your privacy and security seriously. This policy 
              explains how we collect, use, and protect your personal information when you use our 
              platform in the Dominican Republic.
            </p>
          </section>

          {/* Data We Collect */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
            </div>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Account Information:</strong> Name, email, phone number, delivery addresses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Order Information:</strong> Purchase history, preferences, delivery instructions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Payment Information:</strong> Processed securely through our payment partners (we do not store card details)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Device Information:</strong> IP address, browser type, device identifiers for security</span>
              </li>
            </ul>
          </section>

          {/* How We Use Data */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                Process and deliver your orders
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                Send order updates and notifications
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                Improve our services and user experience
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                Prevent fraud and ensure platform security
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                Comply with legal obligations
              </li>
            </ul>
          </section>

          {/* Security Measures */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">Security Measures</h2>
            </div>
            <div className="grid gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">Encrypted Data Transfer</span>
                </div>
                <p className="text-gray-600 text-sm">
                  All data transmitted between your device and our servers uses TLS/SSL encryption.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">Secure Authentication</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Multi-factor authentication and secure session management protect your account.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900">PIN-Based Delivery</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Unique 6-digit PINs verify deliveries and protect against unauthorized pickups.
                </p>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Information Sharing</h2>
            <p className="text-gray-600 mb-4">We share your information only with:</p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Vendors:</strong> To fulfill your orders (name, delivery address, order details)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Delivery Partners:</strong> To complete deliveries (name, address, phone)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                <span><strong>Payment Processors:</strong> To process transactions securely</span>
              </li>
            </ul>
            <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-green-800 text-sm">
                <strong>We never sell your personal information to third parties.</strong>
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                Access your personal data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                Request correction of inaccurate information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                Request deletion of your account and data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#55529d] mt-1">•</span>
                Opt out of marketing communications
              </li>
            </ul>
          </section>

          {/* Data Breach */}
          <section>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 mb-1">Data Breach Notification</p>
                  <p className="text-amber-700 text-sm">
                    In the unlikely event of a data breach affecting your personal information, 
                    we will notify you within 72 hours via email and provide guidance on protective steps.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions?</h2>
            <p className="text-gray-600 mb-4">
              For privacy-related inquiries or to exercise your rights, contact us:
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@stackbotglobal.com"
                className="inline-flex items-center justify-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#55529d]/90 transition-colors"
              >
                Email Support
              </a>
              <a
                href="tel:+18493917763"
                className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                +1 (849) 391-7763
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}