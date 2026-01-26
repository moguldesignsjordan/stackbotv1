// src/lib/firebase/auth-utils.ts
import { auth } from "./config";
import { getIdTokenResult, User } from "firebase/auth";

export type UserRole = "admin" | "vendor" | "customer" | "driver" | null;

export interface UserRoleInfo {
  role: UserRole;
  email: string | null;
  uid: string;
  isAdmin: boolean;
  isVendor: boolean;
}

/**
 * Get the current user's role with a forced token refresh
 * This ensures we always have the latest custom claims
 */
export async function getCurrentUserRole(forceRefresh = false): Promise<UserRoleInfo | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    const tokenResult = await getIdTokenResult(user, forceRefresh);
    const role = (tokenResult.claims.role as UserRole) || null;

    return {
      role,
      email: user.email,
      uid: user.uid,
      isAdmin: role === "admin",
      isVendor: role === "vendor",
    };
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

/**
 * Force refresh the current user's token
 * Call this after role changes to get the latest claims
 */
export async function refreshUserToken(): Promise<string | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    // Force refresh the token
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

/**
 * Get a fresh ID token for API calls
 * Always use this when making authenticated API requests
 */
export async function getAuthToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const roleInfo = await getCurrentUserRole(true);
  return roleInfo?.isAdmin ?? false;
}

/**
 * Check if the current user is a vendor
 */
export async function isCurrentUserVendor(): Promise<boolean> {
  const roleInfo = await getCurrentUserRole(true);
  return roleInfo?.isVendor ?? false;
}

/**
 * Debug helper - logs all user info and claims
 */
export async function debugUserAuth(): Promise<void> {
  const user = auth.currentUser;
  
  if (!user) {
    console.log("=== AUTH DEBUG: No user logged in ===");
    return;
  }

  const tokenResult = await getIdTokenResult(user, true);

  console.log("=== AUTH DEBUG ===");
  console.log("Email:", user.email);
  console.log("UID:", user.uid);
  console.log("Display Name:", user.displayName);
  console.log("Email Verified:", user.emailVerified);
  console.log("Role:", tokenResult.claims.role || "none");
  console.log("All Custom Claims:", tokenResult.claims);
  console.log("Token Expiration:", new Date(tokenResult.expirationTime));
  console.log("==================");
}