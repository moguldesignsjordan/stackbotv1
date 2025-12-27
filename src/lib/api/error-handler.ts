import { NextResponse } from "next/server";
import {
  parseError,
  logError,
  apiSuccess,
  apiError,
  StackBotError,
  type ApiResponse,
} from "@/lib/utils/errors";

// ============================================================================
// API HANDLER WRAPPER
// ============================================================================

type ApiHandler<T = unknown> = (
  request: Request,
  context?: { params: Record<string, string> }
) => Promise<T>;

interface ApiHandlerOptions {
  /** Log all requests (default: false in production) */
  logRequests?: boolean;
}

/**
 * Wraps API route handlers with error handling, logging, and response formatting
 *
 * @example
 * export const GET = withApiHandler(async (request) => {
 *   const data = await fetchData();
 *   return data;
 * });
 */
export function withApiHandler<T>(
  handler: ApiHandler<T>,
  options?: ApiHandlerOptions
) {
  return async (
    request: Request,
    context?: { params: Record<string, string> }
  ): Promise<NextResponse<ApiResponse<T>>> => {
    const startTime = Date.now();
    const { pathname } = new URL(request.url);

    try {
      // Log request in development
      if (options?.logRequests || process.env.NODE_ENV === "development") {
        console.log(`[API] ${request.method} ${pathname}`);
      }

      const result = await handler(request, context);

      // Log success
      if (process.env.NODE_ENV === "development") {
        console.log(`[API] ${request.method} ${pathname} - 200 (${Date.now() - startTime}ms)`);
      }

      return NextResponse.json(apiSuccess(result));
    } catch (error) {
      const parsed = parseError(error);

      // Log error
      logError(parsed, {
        method: request.method,
        pathname,
        duration: Date.now() - startTime,
      });

      return NextResponse.json(apiError(parsed), {
        status: parsed.statusCode,
      });
    }
  };
}

// ============================================================================
// API RESPONSE HELPERS
// ============================================================================

/**
 * Create a success JSON response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(apiSuccess(data), { status });
}

/**
 * Create an error JSON response
 */
export function errorResponse(error: unknown, status?: number) {
  const parsed = parseError(error);
  logError(parsed);
  return NextResponse.json(apiError(parsed), {
    status: status ?? parsed.statusCode,
  });
}

/**
 * Create a not found response
 */
export function notFoundResponse(message = "Resource not found") {
  const error = new StackBotError("NOT_FOUND", message);
  return NextResponse.json(apiError(error), { status: 404 });
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = "Authentication required") {
  const error = new StackBotError("AUTH_REQUIRED", message);
  return NextResponse.json(apiError(error), { status: 401 });
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = "Permission denied") {
  const error = new StackBotError("PERMISSION_DENIED", message);
  return NextResponse.json(apiError(error), { status: 403 });
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  message: string,
  fieldErrors?: Record<string, string>
) {
  const error = new StackBotError("VALIDATION_ERROR", message, {
    userMessage: message,
    context: fieldErrors ? { fieldErrors } : undefined,
  });
  return NextResponse.json(apiError(error), { status: 400 });
}

/**
 * Create a rate limit response
 */
export function rateLimitResponse(retryAfter?: number) {
  const error = new StackBotError("RATE_LIMIT", "Too many requests");
  const response = NextResponse.json(apiError(error), { status: 429 });

  if (retryAfter) {
    response.headers.set("Retry-After", String(retryAfter));
  }

  return response;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate request body exists and is JSON
 */
export async function parseJsonBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch {
    throw new StackBotError("VALIDATION_ERROR", "Invalid JSON body", {
      userMessage: "Request body must be valid JSON.",
    });
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): void {
  const missing = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );

  if (missing.length > 0) {
    throw new StackBotError("VALIDATION_ERROR", `Missing required fields: ${missing.join(", ")}`, {
      userMessage: `Please provide: ${missing.join(", ")}`,
      context: {
        fieldErrors: Object.fromEntries(missing.map((f) => [f, "This field is required"])),
      },
    });
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new StackBotError("VALIDATION_ERROR", "Invalid email format", {
      userMessage: "Please enter a valid email address.",
      context: { fieldErrors: { email: "Invalid email format" } },
    });
  }
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

/**
 * Extract and validate Bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    throw new StackBotError("AUTH_REQUIRED", "No authorization header");
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new StackBotError("AUTH_INVALID", "Invalid authorization format");
  }

  const token = authHeader.slice(7);
  if (!token) {
    throw new StackBotError("AUTH_INVALID", "Empty token");
  }

  return token;
}