"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  ArrowRight, 
  Users, 
  CheckCircle,
  DollarSign,
  Share2,
  TrendingUp,
  Gift,
  Loader2,
  Instagram,
  Youtube,
  Globe
} from "lucide-react";

// Brand colors
const COLORS = {
  primary: "#55529d",
  primaryLight: "#7c78c9",
  accent: "#f97316",
  dark: "#1a1a2e",
};

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  socialPlatform: string;
  followers: string;
  socialHandle: string;
  websiteUrl: string;
  audienceType: string;
  promotionMethod: string;
  whyPartner: string;
}

const initialFormData: FormData = {
  fullName: "",
  email: "",
  phone: "",
  socialPlatform: "",
  followers: "",
  socialHandle: "",
  websiteUrl: "",
  audienceType: "",
  promotionMethod: "",
  whyPartner: "",
};

export default function AffiliateSignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalSteps = 3;

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
        return formData.fullName && formData.email && formData.phone;
      case 2:
        return formData.socialPlatform && formData.followers;
      case 3:
        return formData.audienceType && formData.promotionMethod;
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Received!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for applying to the StackBot Affiliate Program! Our partnerships 
            team will review your application and reach out within 3-5 business days.
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
            <div className="w-12 h-12 rounded-xl bg-[#f97316]/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#f97316]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Become an Affiliate</h1>
          </div>
          <p className="text-gray-400">Earn commissions by promoting StackBot to your audience</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "10% Commission" },
            { icon: Share2, label: "Unique Links" },
            { icon: TrendingUp, label: "Real-time Stats" },
            { icon: Gift, label: "Bonus Rewards" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="w-10 h-10 bg-[#f97316]/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-5 h-5 text-[#f97316]" />
              </div>
              <p className="text-xs font-medium text-gray-700">{item.label}</p>
            </div>
          ))}
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
            className="h-full bg-[#f97316] transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all"
                  placeholder="+1 (849) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL (Optional)</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => updateField("websiteUrl", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Social Presence */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Platform</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Primary Platform *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: "instagram", label: "Instagram", icon: Instagram },
                    { value: "youtube", label: "YouTube", icon: Youtube },
                    { value: "tiktok", label: "TikTok", icon: Share2 },
                    { value: "website", label: "Blog/Website", icon: Globe },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("socialPlatform", option.value)}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        formData.socialPlatform === option.value
                          ? "border-[#f97316] bg-[#f97316]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <option.icon className={`w-6 h-6 mx-auto mb-2 ${
                        formData.socialPlatform === option.value ? "text-[#f97316]" : "text-gray-400"
                      }`} />
                      <span className={`text-sm font-medium ${
                        formData.socialPlatform === option.value ? "text-[#f97316]" : "text-gray-700"
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social Handle / URL</label>
                <input
                  type="text"
                  value={formData.socialHandle}
                  onChange={(e) => updateField("socialHandle", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all"
                  placeholder="@yourhandle or profile URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Follower Count *</label>
                <div className="space-y-2">
                  {[
                    { value: "under-1k", label: "Under 1,000" },
                    { value: "1k-10k", label: "1,000 - 10,000" },
                    { value: "10k-50k", label: "10,000 - 50,000" },
                    { value: "50k-100k", label: "50,000 - 100,000" },
                    { value: "100k+", label: "100,000+" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("followers", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.followers === option.value
                          ? "border-[#f97316] bg-[#f97316]/5 text-[#f97316]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Promotion Details */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Promotion Strategy</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Your Audience Type *</label>
                <div className="space-y-2">
                  {[
                    { value: "local-dr", label: "Local Dominican Republic audience" },
                    { value: "caribbean", label: "Caribbean / Latin America" },
                    { value: "diaspora", label: "Dominican diaspora (US, Europe)" },
                    { value: "general", label: "General / Mixed audience" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("audienceType", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.audienceType === option.value
                          ? "border-[#f97316] bg-[#f97316]/5 text-[#f97316]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">How will you promote StackBot? *</label>
                <div className="space-y-2">
                  {[
                    { value: "content", label: "Content creation (posts, videos, stories)" },
                    { value: "reviews", label: "Product reviews and tutorials" },
                    { value: "referrals", label: "Direct referrals to friends/family" },
                    { value: "blog", label: "Blog posts and articles" },
                    { value: "other", label: "Other methods" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("promotionMethod", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.promotionMethod === option.value
                          ? "border-[#f97316] bg-[#f97316]/5 text-[#f97316]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to partner with StackBot? (Optional)
                </label>
                <textarea
                  value={formData.whyPartner}
                  onChange={(e) => updateField("whyPartner", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f97316] focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell us why you're excited about StackBot and how you'd promote our platform..."
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
                className="inline-flex items-center gap-2 bg-[#f97316] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#f97316]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="inline-flex items-center gap-2 bg-[#f97316] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#f97316]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
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