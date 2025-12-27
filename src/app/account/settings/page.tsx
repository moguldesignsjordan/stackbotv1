// src/app/account/settings/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import {
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
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

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

      await uploadBytes(storageRef, file);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    // Validation
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    setError(null);

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccess('Password changed successfully');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setError('New password is too weak');
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setChangingPassword(false);
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

  // Check if user signed in with email/password (can change password)
  const canChangePassword = user?.providerData?.some(
    (provider) => provider.providerId === 'password'
  );

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

      {/* Profile Photo Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h3>

        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[#55529d]/10 flex items-center justify-center">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[#55529d]">
                  {getInitials(profile.displayName || user?.email || 'U')}
                </span>
              )}
            </div>

            {/* Upload overlay */}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Profile Information Form */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>

        <div className="space-y-4">
          {/* Name */}
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
              placeholder="Enter your name"
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
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
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

      {/* Password Section */}
      {canChangePassword && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Password</h3>
            {!showPasswordSection && (
              <button
                type="button"
                onClick={() => setShowPasswordSection(true)}
                className="text-[#55529d] hover:text-[#444287] font-medium text-sm"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordSection ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#55529d] text-white rounded-lg hover:bg-[#444287] disabled:opacity-50 transition-colors"
                >
                  {changingPassword ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600 text-sm">
              Password last changed: <span className="text-gray-500">Unknown</span>
            </p>
          )}
        </div>
      )}

      {/* Google Sign-in Notice */}
      {!canChangePassword && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Password</h3>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Signed in with Google</p>
              <p className="text-blue-600 text-sm mt-1">
                Your account uses Google for authentication. Manage your password through your Google account settings.
              </p>
            </div>
          </div>
        </div>
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