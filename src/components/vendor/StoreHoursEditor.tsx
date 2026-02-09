// src/components/vendor/StoreHoursEditor.tsx
"use client";

import { useState, useCallback } from "react";
import { Clock, Copy } from "lucide-react";
import {
  StoreHours,
  DayOfWeek,
  DaySchedule,
  DAYS_OF_WEEK,
  DAY_LABELS,
  getDefaultStoreHours,
  formatTime12h,
} from "@/lib/utils/store-hours";

interface StoreHoursEditorProps {
  value: StoreHours | undefined | null;
  onChange: (hours: StoreHours) => void;
  language?: string;
}

/**
 * Structured store hours editor.
 *
 * Drop-in replacement for the free-text hours input in vendor settings.
 * Stores data as a StoreHours map on the vendor Firestore doc (`store_hours`).
 *
 * Usage in vendor settings page:
 *   <StoreHoursEditor
 *     value={form.store_hours}
 *     onChange={(hours) => setForm({ ...form, store_hours: hours })}
 *     language={language}
 *   />
 */
export default function StoreHoursEditor({
  value,
  onChange,
  language = "en",
}: StoreHoursEditorProps) {
  const hours: StoreHours = value || getDefaultStoreHours();
  const lang = language === "es" ? "es" : "en";

  // Toggle a day open/closed
  const toggleDay = useCallback(
    (day: DayOfWeek) => {
      onChange({
        ...hours,
        [day]: { ...hours[day], open: !hours[day].open },
      });
    },
    [hours, onChange]
  );

  // Update open or close time for a day
  const updateTime = useCallback(
    (day: DayOfWeek, field: "openTime" | "closeTime", time: string) => {
      onChange({
        ...hours,
        [day]: { ...hours[day], [field]: time },
      });
    },
    [hours, onChange]
  );

  // Copy a day's schedule to all other open days
  const [copiedFrom, setCopiedFrom] = useState<DayOfWeek | null>(null);
  const copyToAll = useCallback(
    (sourceDay: DayOfWeek) => {
      const source = hours[sourceDay];
      const updated = { ...hours };
      DAYS_OF_WEEK.forEach((day) => {
        if (day !== sourceDay && updated[day].open) {
          updated[day] = {
            ...updated[day],
            openTime: source.openTime,
            closeTime: source.closeTime,
          };
        }
      });
      onChange(updated);
      setCopiedFrom(sourceDay);
      setTimeout(() => setCopiedFrom(null), 1500);
    },
    [hours, onChange]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          {lang === "es" ? "Horario de la Tienda" : "Store Hours"}
        </span>
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = hours[day];
          return (
            <div
              key={day}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                schedule.open
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              {/* Day label + toggle */}
              <div className="w-20 sm:w-24 flex-shrink-0">
                <span
                  className={`text-sm font-medium ${
                    schedule.open ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {DAY_LABELS[day][lang]}
                </span>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => toggleDay(day)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  schedule.open ? "bg-[var(--sb-primary)]" : "bg-gray-300"
                }`}
                aria-label={`Toggle ${DAY_LABELS[day].en}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    schedule.open ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>

              {/* Time inputs or "Closed" label */}
              {schedule.open ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="time"
                    value={schedule.openTime}
                    onChange={(e) => updateTime(day, "openTime", e.target.value)}
                    className="w-[110px] px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--sb-primary)]/30 focus:border-[var(--sb-primary)]/40"
                  />
                  <span className="text-gray-400 text-xs">–</span>
                  <input
                    type="time"
                    value={schedule.closeTime}
                    onChange={(e) =>
                      updateTime(day, "closeTime", e.target.value)
                    }
                    className="w-[110px] px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--sb-primary)]/30 focus:border-[var(--sb-primary)]/40"
                  />

                  {/* Copy to all button */}
                  <button
                    type="button"
                    onClick={() => copyToAll(day)}
                    className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-[var(--sb-primary)] transition-colors ml-auto flex-shrink-0"
                    title={
                      lang === "es"
                        ? "Copiar a todos los días abiertos"
                        : "Copy to all open days"
                    }
                  >
                    <Copy className="w-3 h-3" />
                    {copiedFrom === day ? (
                      <span className="text-green-600">
                        {lang === "es" ? "¡Copiado!" : "Copied!"}
                      </span>
                    ) : (
                      <span>
                        {lang === "es" ? "Copiar a todos" : "Copy to all"}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">
                  {lang === "es" ? "Cerrado" : "Closed"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Timezone note */}
      <p className="text-xs text-gray-400 mt-2">
        {lang === "es"
          ? "Horarios en hora de República Dominicana (AST)"
          : "Times shown in Dominican Republic time (AST)"}
      </p>
    </div>
  );
}