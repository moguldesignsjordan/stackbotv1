"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary - catches errors in the root layout.
 * This must define its own <html> and <body> tags since the root layout may have errored.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to error service
    console.error("[StackBot Global Error]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-white mb-3">
            Critical Error
          </h1>
          <p className="text-gray-400 mb-8">
            A critical error occurred while loading the application. 
            Please try refreshing the page.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all"
            >
              <Home className="w-5 h-5" />
              Go Home
            </a>
          </div>

          {/* Error ID */}
          {error.digest && (
            <p className="mt-8 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Inline styles since Tailwind might not be loaded */}
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .min-h-screen { min-height: 100vh; }
          .bg-gradient-to-br { background: linear-gradient(to bottom right, #111827, #1f2937, #7f1d1d); }
          .flex { display: flex; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .p-4 { padding: 1rem; }
          .max-w-md { max-width: 28rem; }
          .w-full { width: 100%; }
          .text-center { text-align: center; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mb-8 { margin-bottom: 2rem; }
          .mt-8 { margin-top: 2rem; }
          .w-20 { width: 5rem; }
          .h-20 { height: 5rem; }
          .w-10 { width: 2.5rem; }
          .h-10 { height: 2.5rem; }
          .w-5 { width: 1.25rem; }
          .h-5 { height: 1.25rem; }
          .rounded-2xl { border-radius: 1rem; }
          .rounded-xl { border-radius: 0.75rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          .text-xs { font-size: 0.75rem; line-height: 1rem; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-white { color: #ffffff; }
          .text-gray-400 { color: #9ca3af; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-900 { color: #111827; }
          .text-red-400 { color: #f87171; }
          .bg-red-500\\/20 { background-color: rgba(239, 68, 68, 0.2); }
          .border { border-width: 1px; border-style: solid; }
          .border-red-500\\/30 { border-color: rgba(239, 68, 68, 0.3); }
          .border-white\\/20 { border-color: rgba(255, 255, 255, 0.2); }
          .bg-white { background-color: #ffffff; }
          .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1); }
          .gap-2 { gap: 0.5rem; }
          .gap-3 { gap: 0.75rem; }
          .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .inline-flex { display: inline-flex; }
          .flex-col { flex-direction: column; }
          .transition-all { transition: all 0.15s ease; }
          button:hover, a:hover { opacity: 0.9; }
          @media (min-width: 640px) {
            .sm\\:flex-row { flex-direction: row; }
            .sm\\:w-auto { width: auto; }
          }
        `}</style>
      </body>
    </html>
  );
}