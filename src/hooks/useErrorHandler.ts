"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  parseError,
  logError,
  StackBotError,
  type ErrorCode,
} from "@/lib/utils/errors";

// ============================================================================
// TYPES
// ============================================================================

interface ErrorHandlerOptions {
  /** Show toast notification (default: true) */
  showToast?: boolean;
  /** Redirect on specific error codes */
  redirectMap?: Partial<Record<ErrorCode, string>>;
  /** Custom handler for specific error codes */
  handlers?: Partial<Record<ErrorCode, (error: StackBotError) => void>>;
  /** Callback after error is handled */
  onError?: (error: StackBotError) => void;
  /** Custom toast title */
  toastTitle?: string;
}

interface UseErrorHandlerReturn {
  /** Handle any error */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => StackBotError;
  /** Wrap an async function with error handling */
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
  /** Current error state */
  error: StackBotError | null;
  /** Clear error state */
  clearError: () => void;
  /** Whether currently handling an error */
  isError: boolean;
}

// ============================================================================
// DEFAULT REDIRECTS
// ============================================================================

const defaultRedirectMap: Partial<Record<ErrorCode, string>> = {
  AUTH_REQUIRED: "/login",
  AUTH_EXPIRED: "/login",
};

// ============================================================================
// HOOK
// ============================================================================

export function useErrorHandler(
  defaultOptions?: ErrorHandlerOptions
): UseErrorHandlerReturn {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<StackBotError | null>(null);

  const handleError = useCallback(
    (err: unknown, options?: ErrorHandlerOptions): StackBotError => {
      const opts = { ...defaultOptions, ...options };
      const parsed = parseError(err);

      // Log the error
      logError(parsed);

      // Set error state
      setError(parsed);

      // Check for custom handler
      if (opts.handlers?.[parsed.code]) {
        opts.handlers[parsed.code]!(parsed);
        return parsed;
      }

      // Check for redirect
      const redirectMap = { ...defaultRedirectMap, ...opts.redirectMap };
      if (redirectMap[parsed.code]) {
        // Store return URL for auth redirects
        if (parsed.code === "AUTH_REQUIRED" || parsed.code === "AUTH_EXPIRED") {
          const returnUrl = window.location.pathname + window.location.search;
          sessionStorage.setItem("returnUrl", returnUrl);
        }
        router.push(redirectMap[parsed.code]!);
        return parsed;
      }

      // Show toast (default: true)
      if (opts.showToast !== false) {
        toast.error(parsed, opts.toastTitle);
      }

      // Call custom onError callback
      opts.onError?.(parsed);

      return parsed;
    },
    [defaultOptions, router, toast]
  );

  const withErrorHandling = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<T | null> => {
      try {
        const result = await fn();
        setError(null);
        return result;
      } catch (err) {
        handleError(err, options);
        return null;
      }
    },
    [handleError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handleError,
    withErrorHandling,
    error,
    clearError,
    isError: error !== null,
  };
}

// ============================================================================
// SIMPLE ASYNC HANDLER
// ============================================================================

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: StackBotError) => void;
  showToast?: boolean;
}

interface UseAsyncReturn<T, Args extends unknown[]> {
  execute: (...args: Args) => Promise<T | null>;
  isLoading: boolean;
  error: StackBotError | null;
  data: T | null;
  reset: () => void;
}

/**
 * Hook for handling async operations with loading/error states
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFn: (...args: Args) => Promise<T>,
  options?: UseAsyncOptions<T>
): UseAsyncReturn<T, Args> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<StackBotError | null>(null);
  const [data, setData] = useState<T | null>(null);
  const toast = useToast();

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const parsed = parseError(err);
        setError(parsed);
        logError(parsed);

        if (options?.showToast !== false) {
          toast.error(parsed);
        }

        options?.onError?.(parsed);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFn, options, toast]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, isLoading, error, data, reset };
}

// ============================================================================
// FORM ERROR HANDLER
// ============================================================================

interface FormErrors {
  [field: string]: string | undefined;
}

interface UseFormErrorsReturn {
  errors: FormErrors;
  setError: (field: string, message: string) => void;
  setErrors: (errors: FormErrors) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
  getError: (field: string) => string | undefined;
  /** Parse API validation errors into form errors */
  parseApiErrors: (error: unknown) => void;
}

/**
 * Hook for managing form validation errors
 */
export function useFormErrors(): UseFormErrorsReturn {
  const [errors, setErrorsState] = useState<FormErrors>({});

  const setError = useCallback((field: string, message: string) => {
    setErrorsState((prev) => ({ ...prev, [field]: message }));
  }, []);

  const setErrors = useCallback((newErrors: FormErrors) => {
    setErrorsState(newErrors);
  }, []);

  const clearError = useCallback((field: string) => {
    setErrorsState((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrorsState({});
  }, []);

  const getError = useCallback(
    (field: string) => errors[field],
    [errors]
  );

  const parseApiErrors = useCallback((error: unknown) => {
    const parsed = parseError(error);

    // Check if context contains field-specific errors
    if (parsed.context?.fieldErrors) {
      setErrorsState(parsed.context.fieldErrors as FormErrors);
    } else if (parsed.code === "VALIDATION_ERROR") {
      // Set generic form error
      setErrorsState({ _form: parsed.userMessage });
    }
  }, []);

  return {
    errors,
    setError,
    setErrors,
    clearError,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0,
    getError,
    parseApiErrors,
  };
}