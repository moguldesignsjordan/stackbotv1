export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';
  
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'permission-denied': 'You do not have permission to perform this action',
    'not-found': 'The requested resource was not found',
  };
  
  return errorMessages[code] || error?.message || 'An error occurred. Please try again';
}

export function handleError(error: any, context?: string): void {
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  
  // In production, send to error tracking service
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { tags: { context } });
  // }
}