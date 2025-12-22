"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, 
  ArrowRight, 
  Bike, 
  Car, 
  Truck, 
  CheckCircle,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  Loader2
} from "lucide-react";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  vehicleType: string;
  hasLicense: string;
  experience: string;
  availability: string;
  whyJoin: string;
}

const initialFormData: FormData = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  vehicleType: "",
  hasLicense: "",
  experience: "",
  availability: "",
  whyJoin: "",
};

export default function DriverSignupPage() {
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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.fullName && formData.email && formData.phone && formData.city;
      case 2:
        return formData.vehicleType && formData.hasLicense && formData.experience;
      case 3:
        return formData.availability;
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
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Submitted!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your interest in becoming a StackBot driver. We'll review your 
            application and contact you within 2-3 business days.
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
            <div className="w-12 h-12 rounded-xl bg-[#55529d]/20 flex items-center justify-center">
              <Bike className="w-6 h-6 text-[#55529d]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold">Become a Driver</h1>
          </div>
          <p className="text-gray-400">Join our delivery fleet and earn on your schedule</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-3xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Competitive Pay" },
            { icon: Clock, label: "Flexible Hours" },
            { icon: MapPin, label: "Local Routes" },
            { icon: Shield, label: "Insurance" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="w-10 h-10 bg-[#55529d]/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <item.icon className="w-5 h-5 text-[#55529d]" />
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
            className="h-full bg-[#55529d] transition-all duration-300"
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
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
                  placeholder="+1 (849) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all"
                >
                  <option value="">Select your city</option>
                  <option value="puerto-plata">Puerto Plata</option>
                  <option value="santiago">Santiago</option>
                  <option value="santo-domingo">Santo Domingo</option>
                  <option value="la-romana">La Romana</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Vehicle Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Vehicle Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Vehicle Type *</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "motorcycle", label: "Motorcycle", icon: Bike },
                    { value: "car", label: "Car", icon: Car },
                    { value: "truck", label: "Truck/Van", icon: Truck },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("vehicleType", option.value)}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        formData.vehicleType === option.value
                          ? "border-[#55529d] bg-[#55529d]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <option.icon className={`w-6 h-6 mx-auto mb-2 ${
                        formData.vehicleType === option.value ? "text-[#55529d]" : "text-gray-400"
                      }`} />
                      <span className={`text-sm font-medium ${
                        formData.vehicleType === option.value ? "text-[#55529d]" : "text-gray-700"
                      }`}>
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Do you have a valid driver's license? *</label>
                <div className="flex gap-3">
                  {["Yes", "No", "In Progress"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField("hasLicense", option.toLowerCase())}
                      className={`flex-1 py-3 border-2 rounded-xl font-medium transition-all ${
                        formData.hasLicense === option.toLowerCase()
                          ? "border-[#55529d] bg-[#55529d]/5 text-[#55529d]"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Experience *</label>
                <div className="space-y-2">
                  {[
                    { value: "none", label: "No prior experience" },
                    { value: "less-1", label: "Less than 1 year" },
                    { value: "1-3", label: "1-3 years" },
                    { value: "3+", label: "3+ years" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("experience", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.experience === option.value
                          ? "border-[#55529d] bg-[#55529d]/5 text-[#55529d]"
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

          {/* Step 3: Availability */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Availability & Motivation</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">When are you available to work? *</label>
                <div className="space-y-2">
                  {[
                    { value: "full-time", label: "Full-time (40+ hours/week)" },
                    { value: "part-time", label: "Part-time (20-40 hours/week)" },
                    { value: "weekends", label: "Weekends only" },
                    { value: "flexible", label: "Flexible/On-demand" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField("availability", option.value)}
                      className={`w-full py-3 px-4 border-2 rounded-xl text-left font-medium transition-all ${
                        formData.availability === option.value
                          ? "border-[#55529d] bg-[#55529d]/5 text-[#55529d]"
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
                  Why do you want to join StackBot? (Optional)
                </label>
                <textarea
                  value={formData.whyJoin}
                  onChange={(e) => updateField("whyJoin", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Tell us a bit about yourself and why you'd like to join our team..."
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
                className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#55529d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="inline-flex items-center gap-2 bg-[#55529d] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#55529d]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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