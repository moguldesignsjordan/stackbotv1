// src/components/settings/PasswordChangeSection.tsx
// ============================================================================
// SHARED PASSWORD CHANGE COMPONENT
//
// Used by: /account/settings (customer) and /vendor/settings (vendor)
//
// Security: Uses Firebase Auth updatePassword() exclusively.
// Only a `passwordChangedAt` TIMESTAMP is written to Firestore — NEVER the
// password itself. Firebase Auth handles secure hashing (scrypt) internally.
//
// Firestore field written on success:
//   • customers/{uid}.passwordChangedAt   (for customer role)
//   • vendors/{uid}.passwordChangedAt     (for vendor role)
//
// ROLLBACK: Delete this file; revert account/vendor settings to inline password forms.
// ============================================================================
'use client';

import { useState } from 'react';
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Loader2,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface PasswordChangeSectionProps {
  /** The authenticated Firebase user */
  user: FirebaseUser;
  /** Firestore collection to write passwordChangedAt to: 'customers' or 'vendors' */
  firestoreCollection: 'customers' | 'vendors';
  /** Last password change date loaded from Firestore (null = never changed) */
  passwordChangedAt: Date | null;
  /** Callback after successful password change */
  onSuccess?: (changedAt: Date) => void;
  /** Callback for errors (displayed externally if needed) */
  onError?: (message: string) => void;
  /** Optional language — 'es' for Spanish, defaults to 'en' */
  language?: 'en' | 'es';
}

const TRANSLATIONS = {
  en: {
    title: 'Password',
    changeBtn: 'Change Password',
    currentLabel: 'Current Password',
    currentPlaceholder: 'Enter current password',
    newLabel: 'New Password',
    newPlaceholder: 'Enter new password (min. 8 characters)',
    confirmLabel: 'Confirm New Password',
    confirmPlaceholder: 'Confirm new password',
    cancel: 'Cancel',
    update: 'Update Password',
    updating: 'Updating...',
    lastChanged: 'Password last changed:',
    neverChanged: 'Never changed',
    successMsg: 'Password changed successfully',
    errCurrentRequired: 'Current password is required',
    errMinLength: 'New password must be at least 8 characters',
    errNoMatch: 'New passwords do not match',
    errSamePassword: 'New password must be different from current password',
    errWrongPassword: 'Current password is incorrect',
    errWeakPassword: 'New password is too weak. Use at least 8 characters with a mix of letters and numbers.',
    errSessionExpired: 'Session expired. Please log out and log back in, then try again.',
    errGeneric: 'Failed to change password. Please try again.',
    hintMinLength: 'Password needs at least 8 characters',
    hintMismatch: 'Passwords do not match',
    googleTitle: 'Password',
    googleSignedIn: 'Signed in with Google',
    googleDesc: 'Your account uses Google for authentication. Manage your password through your Google account settings.',
  },
  es: {
    title: 'Contraseña',
    changeBtn: 'Cambiar Contraseña',
    currentLabel: 'Contraseña Actual',
    currentPlaceholder: 'Ingresa tu contraseña actual',
    newLabel: 'Nueva Contraseña',
    newPlaceholder: 'Nueva contraseña (mín. 8 caracteres)',
    confirmLabel: 'Confirmar Nueva Contraseña',
    confirmPlaceholder: 'Confirma la nueva contraseña',
    cancel: 'Cancelar',
    update: 'Actualizar Contraseña',
    updating: 'Actualizando...',
    lastChanged: 'Contraseña cambiada por última vez:',
    neverChanged: 'Nunca cambiada',
    successMsg: 'Contraseña actualizada correctamente',
    errCurrentRequired: 'La contraseña actual es requerida',
    errMinLength: 'La nueva contraseña debe tener al menos 8 caracteres',
    errNoMatch: 'Las contraseñas no coinciden',
    errSamePassword: 'La nueva contraseña debe ser diferente a la actual',
    errWrongPassword: 'La contraseña actual es incorrecta',
    errWeakPassword: 'La contraseña es muy débil. Usa al menos 8 caracteres con letras y números.',
    errSessionExpired: 'Sesión expirada. Cierra sesión y vuelve a iniciar, luego intenta de nuevo.',
    errGeneric: 'Error al cambiar la contraseña. Intenta de nuevo.',
    hintMinLength: 'La contraseña necesita al menos 8 caracteres',
    hintMismatch: 'Las contraseñas no coinciden',
    googleTitle: 'Contraseña',
    googleSignedIn: 'Sesión iniciada con Google',
    googleDesc: 'Tu cuenta usa Google para autenticación. Administra tu contraseña desde la configuración de tu cuenta de Google.',
  },
};

export default function PasswordChangeSection({
  user,
  firestoreCollection,
  passwordChangedAt,
  onSuccess,
  onError,
  language = 'en',
}: PasswordChangeSectionProps) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  // Check if user signed in with email/password
  const canChangePassword = user.providerData?.some(
    (provider) => provider.providerId === 'password'
  );

  const resetForm = () => {
    setShowForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setLocalError(null);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return t.neverChanged;
    return date.toLocaleDateString(language === 'es' ? 'es-DO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;

    // Validation
    setLocalError(null);
    setLocalSuccess(null);

    if (!currentPassword) {
      setLocalError(t.errCurrentRequired);
      return;
    }
    if (newPassword.length < 8) {
      setLocalError(t.errMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError(t.errNoMatch);
      return;
    }
    if (currentPassword === newPassword) {
      setLocalError(t.errSamePassword);
      return;
    }

    setLoading(true);

    try {
      // 1. Re-authenticate with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update password via Firebase Auth (secure hashed storage)
      await updatePassword(user, newPassword);

      // 3. Write ONLY the timestamp to Firestore — NEVER the password
      await updateDoc(doc(db, firestoreCollection, user.uid), {
        passwordChangedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const now = new Date();
      setLocalSuccess(t.successMsg);
      onSuccess?.(now);
      resetForm();
      setLocalSuccess(t.successMsg);

      // Auto-clear success message
      setTimeout(() => setLocalSuccess(null), 4000);
    } catch (err: any) {
      console.error('Error changing password:', err);

      let message = t.errGeneric;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = t.errWrongPassword;
      } else if (err.code === 'auth/weak-password') {
        message = t.errWeakPassword;
      } else if (err.code === 'auth/requires-recent-login') {
        message = t.errSessionExpired;
      }

      setLocalError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google-only account: show info notice ──
  if (!canChangePassword) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.googleTitle}</h3>
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">{t.googleSignedIn}</p>
            <p className="text-blue-600 text-sm mt-1">{t.googleDesc}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Email/password account: show change form ──
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Local success message */}
      {localSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          {localSuccess}
        </div>
      )}

      {/* Local error message */}
      {localError && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {localError}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-[#55529d] hover:text-[#444287] font-medium text-sm"
          >
            {t.changeBtn}
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.currentLabel}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t.currentPlaceholder}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.newLabel}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.newPlaceholder}
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-amber-600 mt-1">{t.hintMinLength}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.confirmLabel}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPlaceholder}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#55529d] focus:border-transparent"
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{t.hintMismatch}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#55529d] text-white rounded-lg hover:bg-[#444287] disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.updating}
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  {t.update}
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-gray-600 text-sm">
          {t.lastChanged}{' '}
          <span className="text-gray-500">{formatDate(passwordChangedAt)}</span>
        </p>
      )}
    </div>
  );
}