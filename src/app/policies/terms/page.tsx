import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Users, ShoppingBag, Truck, CreditCard, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | StackBot",
  description: "StackBot Global terms of service for marketplace and delivery services in the Dominican Republic.",
};

export default function TermsPage() {
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
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-gray-400">Last updated: January 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {/* Agreement */}
          <section>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using StackBot's services, you agree to be bound by these Terms of 
              Service. StackBot Global, S.R.L. ("StackBot", "we", "us") operates an online marketplace 
              connecting customers with local vendors and delivery services in the Dominican Republic.
            </p>
          </section>

          {/* Company Info */}
          <section className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              <strong>Legal Entity:</strong> StackBot Global, S.R.L.<br />
              <strong>RNC:</strong> 133-55242-6<br />
              <strong>Jurisdiction:</strong> República Dominicana
            </p>
          </section>

          {/* Platform Services */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-[var(--sb-primary)]" />
              <h2 className="text-xl font-semibold text-gray-900">Platform Services</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-3">
              StackBot provides a technology platform that enables:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Customers to browse and purchase products from third-party vendors
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Vendors to list and sell their products through our marketplace
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Coordination of delivery and logistics services
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Warehouse storage and pickup services
              </li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[var(--sb-primary)]" />
              <h2 className="text-xl font-semibold text-gray-900">User Accounts</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                You must be at least 18 years old to create an account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                You are responsible for maintaining the security of your account credentials
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                All information provided must be accurate and current
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                One account per person; duplicate accounts may be terminated
              </li>
            </ul>
          </section>

          {/* Orders & Pricing */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-[var(--sb-primary)]" />
              <h2 className="text-xl font-semibold text-gray-900">Orders & Pricing</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                All prices are displayed in <strong>Dominican Pesos (RD$)</strong> unless otherwise stated
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Prices include applicable taxes (ITBIS) as required by Dominican law
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Delivery fees are calculated based on distance and displayed at checkout
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                We reserve the right to cancel orders due to pricing errors or unavailability
              </li>
            </ul>
          </section>

          {/* Delivery */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-[var(--sb-primary)]" />
              <h2 className="text-xl font-semibold text-gray-900">Delivery & Pickup</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Delivery times are estimates and not guaranteed
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                A valid 6-digit PIN is required to receive deliveries
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                For warehouse pickup, valid ID and order number are required
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--sb-primary)] mt-1">•</span>
                Unclaimed orders may be returned to vendor after 48 hours
              </li>
            </ul>
          </section>

          {/* Vendor Relationship */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor Relationship</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
              <p className="text-blue-800 text-sm">
                StackBot acts as a marketplace platform. Vendors are independent businesses responsible 
                for their products, quality, and compliance with applicable regulations.
              </p>
            </div>
            <p className="text-gray-600 text-sm">
              Product warranties and guarantees are provided by individual vendors. StackBot facilitates 
              dispute resolution but is not directly liable for vendor products or services.
            </p>
          </section>

          {/* Prohibited Activities */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Prohibited Activities</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Fraudulent orders or payment manipulation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Harassment of vendors, drivers, or other users
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Using the platform for illegal purposes
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Attempting to circumvent platform security or fees
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">✗</span>
                Creating fake reviews or ratings
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              To the maximum extent permitted by Dominican law, StackBot's liability for any claim 
              arising from these terms or your use of the platform is limited to the amount you paid 
              for the specific order giving rise to the claim. StackBot is not liable for indirect, 
              incidental, or consequential damages.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modifications</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We may update these terms from time to time. Continued use of the platform after 
              changes constitutes acceptance. Material changes will be communicated via email or 
              platform notification.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Governing Law</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              These terms are governed by the laws of the Dominican Republic. Any disputes shall 
              be resolved in the courts of Santo Domingo, Dominican Republic.
            </p>
          </section>

          {/* Contact */}
          <section className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions?</h2>
            <p className="text-gray-600 mb-4">
              For questions about these terms, contact us:
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