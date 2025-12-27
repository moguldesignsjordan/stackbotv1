"use client";

import Link from "next/link";
import Image from "next/image";
import { Home, Search, ArrowLeft, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex flex-col">
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
          {/* 404 Visual */}
          <div className="relative mb-8">
            {/* Large 404 Text */}
            <h1 className="text-[120px] md:text-[180px] font-black text-gray-100 leading-none select-none">
              404
            </h1>
            
            {/* Floating Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-sb-primary to-purple-600 rounded-2xl shadow-xl shadow-purple-200 flex items-center justify-center animate-bounce">
                <Search className="w-10 h-10 md:w-14 md:h-14 text-white" />
              </div>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Page not found
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. 
            It might have been moved, deleted, or never existed.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-sb-primary text-white font-semibold rounded-xl hover:bg-sb-primary/90 transition-all shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 hover:-translate-y-0.5"
            >
              <Home className="w-5 h-5" />
              Go Home
            </Link>
            
            <GoBackButton />
          </div>

          {/* Help Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-4">Looking for something specific?</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link
                href="/categories"
                className="text-sb-primary hover:text-sb-primary/80 hover:underline"
              >
                Browse Categories
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/vendors"
                className="text-sb-primary hover:text-sb-primary/80 hover:underline"
              >
                Find Vendors
              </Link>
              <span className="text-gray-300">•</span>
              <Link
                href="/contact"
                className="text-sb-primary hover:text-sb-primary/80 hover:underline inline-flex items-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Get Help
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} StackBot Global, S.R.L. All rights reserved.
      </footer>
    </div>
  );
}

// Client component for back button
function GoBackButton() {
  return (
    <button
      onClick={() => typeof window !== "undefined" && window.history.back()}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
    >
      <ArrowLeft className="w-5 h-5" />
      Go Back
    </button>
  );
}