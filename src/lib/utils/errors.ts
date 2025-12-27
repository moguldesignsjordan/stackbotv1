/**
 * Error handling utilities for StackBot
 * Provides consistent error handling, logging, and user-friendly messages
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_EXPIRED"
  | "AUTH_INVALID"
  | "PERMISSION_DENIED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "RATE_LIMIT"
  | "PAYMENT_FAILED"
  | "STRIPE_ERROR"
  | "FIREBASE_ERROR"
  | "UNKNOWN";

export interface AppError extends Error {
  code: ErrorCode;
  statusCode?: number;
  context?: Record<string, unknown>;
  userMessage: string;
  isOperational: boolean;
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class StackBotError extends Error implements AppError {
  code: ErrorCode;
  statusCode: number;
  context?: Record<string, unknown>;
  userMessage: string;
  isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      userMessage?: string;
      context?: Record<string, unknown>;
      isOperational?: boolean;
    }
  ) {
    super(message);
    this.name = "StackBotError";
    this.code = code;
    this.statusCode = options?.statusCode ?? getDefaultStatusCode(code);
    this.userMessage = options?.userMessage ?? getDefaultUserMessage(code);
    this.context = options?.context;
    this.isOperational = options?.isOperational ?? true;

    // Maintains proper stack trace
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// ============================================================================
// DEFAULT MESSAGES & STATUS CODES
// ============================================================================

function getDefaultStatusCode(code: ErrorCode): number {
  const statusCodes: Record<ErrorCode, number> = {
    AUTH_REQUIRED: 401,
    AUTH_EXPIRED: 401,
    AUTH_INVALID: 401,
    PERMISSION_DENIED: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    NETWORK_ERROR: 0,
    SERVER_ERROR: 500,
    RATE_LIMIT: 429,
    PAYMENT_FAILED: 402,
    STRIPE_ERROR: 500,
    FIREBASE_ERROR: 500,
    UNKNOWN: 500,
  };
  return statusCodes[code];
}

function getDefaultUserMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    AUTH_REQUIRED: "Please sign in to continue.",
    AUTH_EXPIRED: "Your session has expired. Please sign in again.",
    AUTH_INVALID: "Invalid credentials. Please try again.",
    PERMISSION_DENIED: "You don't have permission to perform this action.",
    NOT_FOUND: "The requested resource was not found.",
    VALIDATION_ERROR: "Please check your input and try again.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    SERVER_ERROR: "Something went wrong. Please try again later.",
    RATE_LIMIT: "Too many requests. Please wait a moment.",
    PAYMENT_FAILED: "Payment failed. Please try again or use a different method.",
    STRIPE_ERROR: "Payment processing error. Please try again.",
    FIREBASE_ERROR: "Service error. Please try again.",
    UNKNOWN: "An unexpected error occurred.",
  };
  return messages[code];
}

// ============================================================================
// ERROR PARSING & CONVERSION
// ============================================================================

/**
 * Converts any error into a StackBotError
 */
export function parseError(error: unknown): StackBotError {
  // Already a StackBotError
  if (error instanceof StackBotError) {
    return error;
  }

  // Firebase errors
  if (isFirebaseError(error)) {
    return parseFirebaseError(error);
  }

  // Stripe errors
  if (isStripeError(error)) {
    return parseStripeError(error);
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new StackBotError("NETWORK_ERROR", error.message);
  }

  // Standard Error
  if (error instanceof Error) {
    return new StackBotError("UNKNOWN", error.message, {
      isOperational: false,
    });
  }

  // String error
  if (typeof error === "string") {
    return new StackBotError("UNKNOWN", error);
  }

  // Unknown
  return new StackBotError("UNKNOWN", "An unexpected error occurred", {
    isOperational: false,
  });
}

// ============================================================================
// FIREBASE ERROR HANDLING
// ============================================================================

interface FirebaseError {
  code: string;
  message: string;
}

function isFirebaseError(error: unknown): error is FirebaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as FirebaseError).code === "string" &&
    (error as FirebaseError).code.includes("/")
  );
}

function parseFirebaseError(error: FirebaseError): StackBotError {
  const code = error.code;

  // Auth errors
  if (code.startsWith("auth/")) {
    const authMessages: Record<string, { code: ErrorCode; message: string }> = {
      "auth/user-not-found": { code: "AUTH_INVALID", message: "No account found with this email." },
      "auth/wrong-password": { code: "AUTH_INVALID", message: "Incorrect password." },
      "auth/invalid-email": { code: "VALIDATION_ERROR", message: "Invalid email address." },
      "auth/email-already-in-use": { code: "VALIDATION_ERROR", message: "This email is already registered." },
      "auth/weak-password": { code: "VALIDATION_ERROR", message: "Password should be at least 6 characters." },
      "auth/too-many-requests": { code: "RATE_LIMIT", message: "Too many attempts. Please wait and try again." },
      "auth/network-request-failed": { code: "NETWORK_ERROR", message: "Network error. Please check your connection." },
      "auth/popup-closed-by-user": { code: "AUTH_INVALID", message: "Sign-in was cancelled." },
      "auth/requires-recent-login": { code: "AUTH_EXPIRED", message: "Please sign in again to continue." },
      "auth/invalid-credential": { code: "AUTH_INVALID", message: "Invalid email or password." },
    };

    const mapped = authMessages[code];
    if (mapped) {
      return new StackBotError(mapped.code, error.message, {
        userMessage: mapped.message,
        context: { firebaseCode: code },
      });
    }
  }

  // Firestore errors
  if (code.startsWith("firestore/") || code.includes("permission-denied")) {
    if (code.includes("permission-denied")) {
      return new StackBotError("PERMISSION_DENIED", error.message, {
        context: { firebaseCode: code },
      });
    }
    if (code.includes("not-found")) {
      return new StackBotError("NOT_FOUND", error.message, {
        context: { firebaseCode: code },
      });
    }
  }

  // Storage errors
  if (code.startsWith("storage/")) {
    if (code.includes("unauthorized")) {
      return new StackBotError("PERMISSION_DENIED", error.message, {
        context: { firebaseCode: code },
      });
    }
    if (code.includes("object-not-found")) {
      return new StackBotError("NOT_FOUND", error.message, {
        userMessage: "File not found.",
        context: { firebaseCode: code },
      });
    }
  }

  // Default Firebase error
  return new StackBotError("FIREBASE_ERROR", error.message, {
    context: { firebaseCode: code },
  });
}

// ============================================================================
// STRIPE ERROR HANDLING
// ============================================================================

interface StripeError {
  type: string;
  code?: string;
  message: string;
  decline_code?: string;
}

function isStripeError(error: unknown): error is StripeError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    typeof (error as StripeError).type === "string" &&
    (error as StripeError).type.includes("Stripe")
  );
}

function parseStripeError(error: StripeError): StackBotError {
  const declineMessages: Record<string, string> = {
    insufficient_funds: "Your card has insufficient funds.",
    card_declined: "Your card was declined.",
    expired_card: "Your card has expired.",
    incorrect_cvc: "The CVC code is incorrect.",
    processing_error: "An error occurred while processing. Please try again.",
    incorrect_number: "The card number is incorrect.",
  };

  const userMessage =
    error.decline_code && declineMessages[error.decline_code]
      ? declineMessages[error.decline_code]
      : "Payment failed. Please try a different payment method.";

  return new StackBotError("STRIPE_ERROR", error.message, {
    statusCode: 402,
    userMessage,
    context: {
      stripeType: error.type,
      stripeCode: error.code,
      declineCode: error.decline_code,
    },
  });
}

// ============================================================================
// ERROR LOGGING
// ============================================================================

/**
 * Logs error with context for debugging
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const parsed = parseError(error);

  const logData = {
    timestamp: new Date().toISOString(),
    code: parsed.code,
    message: parsed.message,
    userMessage: parsed.userMessage,
    statusCode: parsed.statusCode,
    isOperational: parsed.isOperational,
    context: { ...parsed.context, ...context },
    stack: parsed.stack,
  };

  // In development, log full details
  if (process.env.NODE_ENV === "development") {
    console.error("[StackBot Error]", logData);
  } else {
    // In production, log minimal info to console, full to service
    console.error(`[Error] ${parsed.code}: ${parsed.message}`);

    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: logData });
  }
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wraps async functions with error handling
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  onError?: (error: StackBotError) => void
): Promise<[T, null] | [null, StackBotError]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const parsed = parseError(error);
    logError(parsed);
    onError?.(parsed);
    return [null, parsed];
  }
}

/**
 * Wraps async functions and returns a default value on error
 */
export async function tryCatchDefault<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  const [result, error] = await tryCatch(fn);
  if (error) return defaultValue;
  return result;
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Creates a success API response
 */
export function apiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/**
 * Creates an error API response
 */
export function apiError(error: unknown): ApiResponse {
  const parsed = parseError(error);
  logError(parsed);
  return {
    success: false,
    error: {
      code: parsed.code,
      message: parsed.userMessage,
    },
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Throws a validation error if condition is false
 */
export function assertValid(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) {
    throw new StackBotError("VALIDATION_ERROR", message, {
      userMessage: message,
    });
  }
}

/**
 * Throws a not found error if value is null/undefined
 */
export function assertFound<T>(
  value: T | null | undefined,
  resourceName = "Resource"
): asserts value is T {
  if (value === null || value === undefined) {
    throw new StackBotError("NOT_FOUND", `${resourceName} not found`, {
      userMessage: `${resourceName} not found.`,
    });
  }
}

/**
 * Throws an auth error if not authenticated
 */
export function assertAuthenticated(
  userId: string | null | undefined
): asserts userId is string {
  if (!userId) {
    throw new StackBotError("AUTH_REQUIRED", "Authentication required");
  }
}