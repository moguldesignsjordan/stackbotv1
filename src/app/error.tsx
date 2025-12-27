"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to your error reporting service
    console.error("[StackBot Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // captureException(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex flex-col">
      {/* Simple Header */}
      <header className="p-4 md:p-6">
        <Link href="/" className="inline-block">
          <Image
            src="/stackbot-logo-purp.png"
            alt="StackBot"
            width={120}
            height={36}
            priority
          />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          {/* Error Visual */}
          <div className="mb-8">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-xl shadow-red-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            We encountered an unexpected error. Don&apos;t worry, your data is safe. 
            Try refreshing or go back to the home page.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-sb-primary text-white font-semibold rounded-xl hover:bg-sb-primary/90 transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:-translate-y-0.5"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
          </div>

          {/* Error Details (Dev mode or expandable) */}
          {isDev && error.message && (
            <details className="mt-8 text-left bg-gray-900 rounded-xl overflow-hidden">
              <summary className="px-4 py-3 bg-gray-800 text-gray-300 cursor-pointer hover:bg-gray-750 flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Developer Details
                </span>
                <ChevronDown className="w-4 h-4" />
              </summary>
              <div className="p-4 text-sm">
                <div className="mb-3">
                  <span className="text-gray-500 text-xs uppercase tracking-wide">Error Message</span>
                  <p className="text-red-400 font-mono mt-1 break-all">{error.message}</p>
                </div>
                {error.digest && (
                  <div className="mb-3">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Error ID</span>
                    <p className="text-gray-400 font-mono mt-1">{error.digest}</p>
                  </div>
                )}
                {error.stack && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Stack Trace</span>
                    <pre className="text-gray-400 font-mono mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Error ID for support */}
          {error.digest && !isDev && (
            <p className="mt-8 text-xs text-gray-400">
              Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{error.digest}</code>
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-400">
        <p>
          Need help?{" "}
          <a
            href="mailto:support@stackbot.com"
            className="text-sb-primary hover:underline"
          >
            Contact Support
          </a>
        </p>
      </footer>
    </div>
  );
}