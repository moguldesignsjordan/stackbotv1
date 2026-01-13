import { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  LifeBuoy,
  Mail,
  Phone,
  Clock,
  HelpCircle,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Support | StackBot",
  description:
    "Get help with StackBot. Contact support, find answers to common questions, or reach our team for assistance.",
};

export default function SupportPage() {
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
              <LifeBuoy className="w-6 h-6 text-[#7c78c9]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Support</h1>
          </div>

          <p className="text-gray-400">
            We’re here to help you with any questions or issues.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-10">
          {/* How We Can Help */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">
                How We Can Help
              </h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                Account access and login issues
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                Orders, payments, and billing questions
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                Vendor and marketplace support
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-1" />
                Technical issues or app bugs
              </li>
            </ul>
          </section>

          {/* Support Hours */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#55529d]" />
              <h2 className="text-xl font-semibold text-gray-900">
                Support Hours
              </h2>
            </div>
            <p className="text-gray-600">
              Our support team is available:
            </p>
            <p className="text-gray-700 font-medium mt-2">
              Monday – Friday, 9:00 AM – 6:00 PM (AST)
            </p>
          </section>

          {/* Contact Methods */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Contact Support
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email */}
              <a
                href="mailto:support@stackbotglobal.com"
                className="flex items-center gap-3 border rounded-xl p-4 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-[#55529d]/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#55529d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <p className="text-sm text-gray-600">
                    support@stackbotglobal.com
                  </p>
                </div>
              </a>

              {/* Phone */}
              <a
                href="tel:+18493917763"
                className="flex items-center gap-3 border rounded-xl p-4 hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-lg bg-[#55529d]/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-[#55529d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Phone Support</p>
                  <p className="text-sm text-gray-600">
                    +1 (849) 391-7763
                  </p>
                </div>
              </a>
            </div>
          </section>

          {/* App Review / Legal Note */}
          <section className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              If you are contacting us regarding an App Store review or
              account access issue, please include your email address and
              a brief description of the problem so we can assist you
              promptly.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
