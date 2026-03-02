// src/app/account/settings/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { smartUploadBytes } from '@/lib/firebase/smartUpload';
import { db, storage } from '@/lib/firebase/config';
import SavedCards from '@/components/profile/SavedCards';
import PasswordChangeSection from '@/components/settings/PasswordChangeSection';
import {
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  Save,
} from 'lucide-react';

interface ProfileData {
  displayName: string;
  phone: string;
  photoURL: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    phone: '',
    photoURL: null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Password change timestamp
  const [passwordChangedAt, setPasswordChangedAt] = useState<Date | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Get Firestore customer data
        const customerDoc = await getDoc(doc(db, 'customers', user.uid));
        const customerData = customerDoc.data();

        setProfile({
          displayName: user.displayName || customerData?.displayName || '',
          phone: customerData?.phone || '',
          photoURL: user.photoURL || customerData?.photoURL || null,
        });
        setPhotoPreview(user.photoURL || customerData?.photoURL || null);

        // Load passwordChangedAt timestamp
        if (customerData?.passwordChangedAt) {
          const ts = customerData.passwordChangedAt;
          if (ts instanceof Timestamp) {
            setPasswordChangedAt(ts.toDate());
          } else if (ts?.toDate) {
            setPasswordChangedAt(ts.toDate());
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Clear messages after delay
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to Firebase Storage
    setUploadingPhoto(true);
    setError(null);

    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const storagePath = `customers/avatars/${user.uid}/${Date.now()}-${safeName}`;
      const storageRef = ref(storage, storagePath);

      await smartUploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update Firestore
      await updateDoc(doc(db, 'customers', user.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });

      setProfile((prev) => ({ ...prev, photoURL: downloadURL }));
      setSuccess('Profile photo updated');
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError('Failed to upload photo. Please try again.');
      setPhotoPreview(profile.photoURL);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!profile.displayName.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Update Firebase Auth display name
      if (profile.displayName !== user.displayName) {
        await updateProfile(user, { displayName: profile.displayName.trim() });
      }

      // Update Firestore
      await updateDoc(doc(db, 'customers', user.uid), {
        displayName: profile.displayName.trim(),
        phone: profile.phone.trim(),
        updatedAt: serverTimestamp(),
      });

      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#55529d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
        <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          <Check className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Profile Photo & Info */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Profile"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#55529d] flex items-center justify-center border-2 border-gray-200">
                <span className="text-white text-xl font-semibold">
                  {getInitials(profile.displayName || user?.email || 'U')}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 p-2 bg-[#55529d] text-white rounded-full hover:bg-[#444287] disabled:opacity-50 transition-colors"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-medium text-gray-900">{profile.displayName || 'Your Name'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </div>
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="+1 (809) 000-0000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-[#55529d] text-white rounded-lg hover:bg-[#444287] disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {/* Saved Payment Methods */}
      <SavedCards />

      {/* Password Section — shared component */}
      {user && (
        <PasswordChangeSection
          user={user}
          firestoreCollection="customers"
          passwordChangedAt={passwordChangedAt}
          onSuccess={(changedAt) => {
            setPasswordChangedAt(changedAt);
            setSuccess('Password changed successfully');
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-gray-600 text-sm mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="space-y-4 p-4 bg-red-50 rounded-lg">
            <p className="text-red-800 font-medium">
              Type &quot;DELETE&quot; to confirm account deletion:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  // TODO: Implement account deletion
                  alert('Account deletion coming soon. Contact support@stackbot.com');
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}