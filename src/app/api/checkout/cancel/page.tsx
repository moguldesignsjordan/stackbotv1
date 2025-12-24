// src/app/checkout/cancel/page.tsx
'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft, ShoppingCart, HelpCircle } from 'lucide-react';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Cancel Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Cancel Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. Don&apos;t worry, your cart items are still saved.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/cart"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#55529d] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#444287] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              Return to Cart
            </Link>
            
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Continue Shopping
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#55529d] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900">Need Help?</h3>
              <p className="text-sm text-gray-600 mt-1">
                If you experienced any issues during checkout, please contact our support team.
              </p>
              <a 
                href="mailto:support@stackbot.com" 
                className="text-sm text-[#55529d] hover:underline mt-2 inline-block"
              >
                support@stackbot.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}