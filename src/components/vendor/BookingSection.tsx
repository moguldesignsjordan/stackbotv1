"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useState } from "react";
import { Calendar, X } from "lucide-react";

interface BookingSectionProps {
  calLink: string;
}

export default function BookingSection({ calLink }: BookingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "light",
        cssVarsPerTheme: {
          light: {
            "cal-brand": "#55529d",
            "cal-text": "#111827",
          },
          // ✅ FIX: Added 'dark' block to satisfy TypeScript
          dark: {
            "cal-brand": "#55529d",
            "cal-text": "#ffffff",
          },
        },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <>
      {/* 1. THE TRIGGER BUTTON (Sits in Sidebar) */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mt-6 border border-gray-100">
        <h3 className="font-semibold text-lg mb-4 text-gray-900">Book Appointment</h3>
        <p className="text-gray-500 text-sm mb-4">
          Schedule a meeting directly with us to discuss your needs.
        </p>
        
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#55529d] text-white rounded-xl font-medium hover:bg-[#444287] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Calendar className="w-5 h-5" />
          Book Appointment
        </button>
      </div>

      {/* 2. THE MODAL POPUP (Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop (Darkens background) */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#55529d]" />
                Schedule Meeting
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Embed */}
            <div className="flex-1 w-full bg-gray-50 overflow-auto">
              <Cal
                calLink={calLink}
                style={{ width: "100%", height: "100%", minHeight: "100%" }}
                config={{ layout: "month_view", theme: "light" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}