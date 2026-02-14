declare module '@codetrix-studio/capacitor-google-auth' {
  export const GoogleAuth: {
    initialize(options: {
      clientId: string;
      scopes: string[];
      grantOfflineAccess: boolean;
    }): Promise<void>;
    signIn(): Promise<{
      authentication: { idToken: string };
      name?: string;
      givenName?: string;
      familyName?: string;
      email?: string;
    }>;
    signOut(): Promise<void>;
  };
}
