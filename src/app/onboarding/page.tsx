// src/app/onboarding/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  User, 
  Phone, 
  MapPin, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Check,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const redirect = searchParams.get('redirect') || '/account';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Dominican Republic',
    instructions: '',
  });

  // Check if user already completed onboarding
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) {
        if (!authLoading) {
          router.push('/login');
        }
        return;
      }

      try {
        const customerDoc = await getDoc(doc(db, 'customers', user.uid));
        
        if (customerDoc.exists() && customerDoc.data()?.onboardingCompleted) {
          // Already onboarded, redirect to account
          router.push(redirect);
          return;
        }

        // Pre-fill with existing data
        setFormData(prev => ({
          ...prev,
          displayName: user.displayName || '',
        }));
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkExistingProfile();
  }, [user, authLoading, router, redirect]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Save customer profile to Firestore
      await setDoc(doc(db, 'customers', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formData.displayName || user.displayName || 'Customer',
        phone: formData.phone,
        defaultAddress: {
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          instructions: formData.instructions,
        },
        role: 'customer',
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Redirect to account or intended destination
      router.push(redirect);
    } catch (error) {
      console.error('Error saving profile:', error);
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.displayName.trim().length > 0;
      case 2:
        return formData.phone.trim().length >= 10;
      case 3:
        return formData.street.trim().length > 0 && formData.city.trim().length > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const skipOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await setDoc(doc(db, 'customers', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Customer',
        role: 'customer',
        onboardingCompleted: true,
        skippedOnboarding: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      router.push(redirect);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      setLoading(false);
    }
  };

  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
          <button
            onClick={skipOnboarding}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-[#55529d] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#55529d]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#55529d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-[#55529d]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome to StackBot!</h1>
                <p className="text-gray-600 mt-2">Let's set up your profile</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#55529d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-[#55529d]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Contact Info</h1>
                <p className="text-gray-600 mt-2">So vendors and drivers can reach you</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (809) 555-0123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent text-lg"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  We'll only use this for delivery updates
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#55529d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-[#55529d]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Address</h1>
                <p className="text-gray-600 mt-2">Where should we deliver your orders?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => updateField('street', e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="Santo Domingo"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      placeholder="10101"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => updateField('instructions', e.target.value)}
                    placeholder="Gate code, landmarks, etc."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#55529d] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}
            
            <button
              onClick={nextStep}
              disabled={!canProceed() || loading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#55529d] text-white py-3 px-6 rounded-xl font-semibold hover:bg-[#444287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === 3 ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Get Started
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step hints */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {step === 1 && "This helps personalize your experience"}
          {step === 2 && "Required for delivery coordination"}
          {step === 3 && "You can add more addresses later"}
        </p>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}