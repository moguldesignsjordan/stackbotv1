import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, XCircle, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Cancellation Policy | StackBot",
  description: "StackBot Global order cancellation policy for the Dominican Republic marketplace.",
};

export default function CancellationsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[var(--sb-dark)] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Cancellation Policy</h1>
          </div>
          <p className="text-gray-400">Last updated: January 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {/* Cancellation Window */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[var(--sb-primary)]" />
              <h2 className="text-xl font-semibold text-gray-900">Cancellation Window</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-4">
              Orders can be cancelled for a full refund within the following timeframes:
            </p>
            <div className="grid gap-3">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-700">Before Processing</span>
                </div>
                <p className="text-green-600 text-sm">
                  Full refund if cancelled before the vendor begins preparing your order.
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-amber-700">During Processing</span>
                </div>
                <p className="text-amber-600 text-sm">
                  Partial refund may apply. Contact support immediately for assistance.
                </p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-700">Out for Delivery</span>
                </div>
                <p className="text-red-600 text-sm">
                  Cannot be cancelled. Please refuse delivery or initiate a return.
                </p>
              </div>
            </div>
          </section>

          {/* How to Cancel */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Cancel</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--sb-primary)] text-white text-sm flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-gray-900">Through Your Account</p>
                  <p className="text-gray-600 text-sm">
                    Go to Order History → Select Order → Click "Cancel Order"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--sb-primary)] text-white text-sm flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-gray-900">Contact Support</p>
                  <p className="text-gray-600 text-sm">
                    Email support@stackbot.com or call +1 (849) 391-7763
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Restaurant/Food Orders */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Food & Restaurant Orders</h2>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-amber-800 text-sm leading-relaxed">
                <strong>Important:</strong> Food orders have a shorter cancellation window due to 
                preparation time. Once a restaurant begins preparing your order (usually within 
                5-10 minutes), cancellation may not be possible or may result in a partial refund.
              </p>
            </div>
          </section>

          {/* Refund Timeline */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund Timeline</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                <span><strong>Credit/Debit Cards:</strong> 5-7 business days</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                <span><strong>StackBot Credit:</strong> Instant (can be used for future orders)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                <span><strong>Bank Transfer:</strong> 3-5 business days</span>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need to Cancel?</h2>
            <p className="text-gray-600 mb-4">
              Act quickly! The sooner you contact us, the more likely we can process a full refund.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@stackbot.com"
                className="inline-flex items-center justify-center gap-2 bg-[var(--sb-primary)] text-white px-6 py-3 rounded-xl font-medium hover:bg-[var(--sb-primary)]/90 transition-colors"
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