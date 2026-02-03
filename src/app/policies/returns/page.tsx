import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Returns & Refunds Policy | StackBot",
  description: "StackBot Global returns and refunds policy for orders in the Dominican Republic.",
};

export default function ReturnsPage() {
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
            <div className="w-12 h-12 rounded-xl bg-[#55529d]/20 flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-[#7c78c9]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Returns & Refunds</h1>
          </div>
          <p className="text-gray-400">Last updated: January 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {/* Return Window */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">Return Window</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              You may request a return within <strong>7 days</strong> of receiving your order.
              Items must be in their original condition, unused, and in original packaging
              with all tags attached.
            </p>
          </section>

          {/* Eligible Items */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Defective or damaged items
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Wrong item received
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Items significantly different from description
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                Unopened items in original packaging
              </li>
            </ul>
          </section>

          {/* Non-Eligible Items */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Not Eligible for Return</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Perishable goods (food, beverages, fresh items)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Personal care items that have been opened
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Customized or personalized items
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Items damaged due to misuse
              </li>
            </ul>
          </section>

          {/* Refund Process */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund Process</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#55529d] text-white text-sm flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <p className="text-gray-600">
                  Contact support@stackbotglobal.com with your order number and reason for return.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#55529d] text-white text-sm flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <p className="text-gray-600">
                  Receive return authorization and instructions within 24-48 hours.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#55529d] text-white text-sm flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <p className="text-gray-600">
                  Return item to our warehouse (shipping costs may apply for non-defective items).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#55529d] text-white text-sm flex items-center justify-center flex-shrink-0">
                  4
                </span>
                <p className="text-gray-600">
                  Refund processed within 5-7 business days after inspection.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions?</h2>
            <p className="text-gray-600 mb-4">
              Contact our support team for assistance with returns or refunds.
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