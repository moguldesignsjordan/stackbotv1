"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowRight, 
  Handshake, 
  CheckCircle,
  Building,
  Truck,
  ShoppingBag,
  Code,
  Loader2,
  Globe,
  Users,
  Zap
} from "lucide-react";

// Brand colors
const COLORS = {
  primary: "#55529d",
  primaryLight: "#7c78c9",
  accent: "#f97316",
  dark: "#1a1a2e",
};

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  partnershipType: string;
  companySize: string;
  industry: string;
  proposal: string;
}

const initialFormData: FormData = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  partnershipType: "",
  companySize: "",
  industry: "",
  proposal: "",
};

export default function PartnersPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalSteps = 2;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.companyName && formData.contactName && formData.email && formData.phone;
      case 2:
        return formData.partnershipType && formData.companySize;
      default:
        return false;
    }
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Inquiry Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your interest in partnering with StackBot. Our business 
            development team will review your inquiry and contact you within 5 business days.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#55529d]/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white py-12 px-4">
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
              <Handshake className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Partner With Us</h1>
          </div>
          <p className="text-gray-400">Explore strategic partnership opportunities with StackBot</p>
        </div>
      </div>

      {/* Partnership Types */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Building, label: "Enterprise" },
            { icon: Truck, label: "Logistics" },
            { icon: ShoppingBag, label: "Retail" },
            { icon: Code, label: "Technology" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs font-medium text-gray-700">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Partner Section */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="bg-gradient-to-br from-[#55529d]/5 to-blue-500/5 rounded-2xl p-6 border border-[#55529d]/10">
          <h3 className="font-semibold text-gray-900 mb-4">Why Partner with StackBot?</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Globe, title: "Caribbean Reach", desc: "Access our growing customer base across the region" },
              { icon: Users, title: "Co-Marketing", desc: "Joint marketing initiatives and brand exposure" },
              { icon: Zap, title: "API Integration", desc: "Seamless technical integration capabilities" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <item.icon className="w-4 h-4 text-[#55529d]" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {step} of {totalSteps}</span>
          <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name *</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="+1 (849) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Website (Optional)</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Partnership Details */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Partnership Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Partnership Type *</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { value: "logistics", label: "Logistics & Delivery", desc: "Fleet or warehouse partnerships" },
                    { value: "retail", label: "Retail Integration", desc: "Multi-store or franchise" },
                    { value: "technology", label: "Technology / API", desc: "System integrations" },
                    { value: "marketing", label: "Marketing & Co-brand", desc: "Joint campaigns" },
                    { value: "investment", label: "Investment", desc: "Strategic investment" },
                    { value: "other", label: "Other", desc: "Custom partnership" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("partnershipType", option.value)}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        formData.partnershipType === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className={`font-medium ${
                        formData.partnershipType === option.value ? "text-blue-600" : "text-gray-900"
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Company Size *</label>
                <div className="space-y-2">
                  {[
                    { value: "1-10", label: "1-10 employees" },
                    { value: "11-50", label: "11-50 employees" },
                    { value: "51-200", label: "51-200 employees" },
                    { value: "201-500", label: "201-500 employees" },
                    { value: "500+", label: "500+ employees" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("companySize", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.companySize === option.value
                          ? "border-blue-500 bg-blue-50 text-blue-600"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select industry</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="logistics">Logistics & Transportation</option>
                  <option value="technology">Technology & Software</option>
                  <option value="food">Food & Beverage</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="finance">Finance & Banking</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partnership Proposal (Optional)
                </label>
                <textarea
                  value={formData.proposal}
                  onChange={(e) => updateField("proposal", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell us about your partnership idea and how we can work together..."
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="inline-flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Inquiry
                    <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}