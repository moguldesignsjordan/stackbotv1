// src/lib/utils/store-hours.ts

/**
 * Structured store hours system for StackBot vendors.
 *
 * Firestore field: `store_hours` on the vendor document.
 * The legacy `hours` (free-text string) is kept for backward compatibility
 * and still displayed on the store profile page if `store_hours` is absent.
 *
 * All times are stored in 24-hour "HH:mm" format and evaluated against
 * the Dominican Republic timezone (America/Santo_Domingo, AST UTC-4).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DaySchedule {
  open: boolean; // false = closed all day
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
}

/** Stored on the vendor Firestore doc as `store_hours` */
export type StoreHours = Record<DayOfWeek, DaySchedule>;

export interface StoreStatus {
  isOpen: boolean;
  label: string; // e.g. "Open" / "Abierto"
  detail: string; // e.g. "Closes at 10:00 PM" / "Cierra a las 10:00 PM"
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayOfWeek, { en: string; es: string }> = {
  monday: { en: "Monday", es: "Lunes" },
  tuesday: { en: "Tuesday", es: "Martes" },
  wednesday: { en: "Wednesday", es: "Miércoles" },
  thursday: { en: "Thursday", es: "Jueves" },
  friday: { en: "Friday", es: "Viernes" },
  saturday: { en: "Saturday", es: "Sábado" },
  sunday: { en: "Sunday", es: "Domingo" },
};

/** Dominican Republic timezone */
const DR_TIMEZONE = "America/Santo_Domingo";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get current time in DR as { day, hours, minutes } */
function getDRTime(): { day: DayOfWeek; hours: number; minutes: number } {
  const now = new Date();

  // Get day name in DR timezone
  const dayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: DR_TIMEZONE,
  })
    .format(now)
    .toLowerCase() as DayOfWeek;

  // Get hours and minutes in DR timezone
  const timeParts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    timeZone: DR_TIMEZONE,
  })
    .formatToParts(now)
    .reduce(
      (acc, part) => {
        if (part.type === "hour") acc.hours = parseInt(part.value, 10);
        if (part.type === "minute") acc.minutes = parseInt(part.value, 10);
        return acc;
      },
      { hours: 0, minutes: 0 }
    );

  return { day: dayName, ...timeParts };
}

/** Convert "HH:mm" → total minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Convert "HH:mm" → "9:00 AM" or "10:00 PM" */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m || 0).padStart(2, "0")} ${period}`;
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Check if a vendor is currently open based on structured store_hours.
 *
 * @param storeHours - The structured hours object from Firestore
 * @param language   - "en" | "es" for labels
 * @returns StoreStatus with isOpen, label, and detail string
 */
export function getStoreStatus(
  storeHours: StoreHours | undefined | null,
  language: string = "en"
): StoreStatus {
  // No structured hours → assume open (graceful fallback)
  if (!storeHours) {
    return {
      isOpen: true,
      label: language === "es" ? "Abierto" : "Open",
      detail: "",
    };
  }

  const { day, hours, minutes } = getDRTime();
  const currentMinutes = hours * 60 + minutes;
  const todaySchedule = storeHours[day];

  // Day is marked closed
  if (!todaySchedule || !todaySchedule.open) {
    // Find next open day
    const nextOpen = findNextOpenDay(storeHours, day);
    return {
      isOpen: false,
      label: language === "es" ? "Cerrado" : "Closed",
      detail: nextOpen
        ? language === "es"
          ? `Abre ${nextOpen.dayLabel} a las ${formatTime12h(nextOpen.openTime)}`
          : `Opens ${nextOpen.dayLabel} at ${formatTime12h(nextOpen.openTime)}`
        : "",
    };
  }

  const openMin = timeToMinutes(todaySchedule.openTime);
  const closeMin = timeToMinutes(todaySchedule.closeTime);

  // Handle overnight hours (e.g., 20:00 - 02:00)
  const isOvernight = closeMin <= openMin;

  let isOpen: boolean;
  if (isOvernight) {
    // Open if after openTime OR before closeTime
    isOpen = currentMinutes >= openMin || currentMinutes < closeMin;
  } else {
    isOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  }

  if (isOpen) {
    // Calculate closing info
    const closingTime = formatTime12h(todaySchedule.closeTime);
    return {
      isOpen: true,
      label: language === "es" ? "Abierto" : "Open",
      detail:
        language === "es"
          ? `Cierra a las ${closingTime}`
          : `Closes at ${closingTime}`,
    };
  }

  // Currently closed but day has hours — either before open or after close
  if (currentMinutes < openMin) {
    // Before today's opening
    const opensAt = formatTime12h(todaySchedule.openTime);
    return {
      isOpen: false,
      label: language === "es" ? "Cerrado" : "Closed",
      detail:
        language === "es"
          ? `Abre hoy a las ${opensAt}`
          : `Opens today at ${opensAt}`,
    };
  }

  // After today's close — find next open
  const nextOpen = findNextOpenDay(storeHours, day);
  return {
    isOpen: false,
    label: language === "es" ? "Cerrado" : "Closed",
    detail: nextOpen
      ? language === "es"
        ? `Abre ${nextOpen.dayLabel} a las ${formatTime12h(nextOpen.openTime)}`
        : `Opens ${nextOpen.dayLabel} at ${formatTime12h(nextOpen.openTime)}`
      : "",
  };
}

/**
 * Simple boolean check — for conditional rendering.
 */
export function isStoreOpen(
  storeHours: StoreHours | undefined | null
): boolean {
  return getStoreStatus(storeHours).isOpen;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function findNextOpenDay(
  storeHours: StoreHours,
  currentDay: DayOfWeek
): { dayLabel: string; openTime: string } | null {
  const idx = DAYS_OF_WEEK.indexOf(currentDay);

  for (let offset = 1; offset <= 7; offset++) {
    const nextIdx = (idx + offset) % 7;
    const nextDay = DAYS_OF_WEEK[nextIdx];
    const schedule = storeHours[nextDay];

    if (schedule?.open && schedule.openTime) {
      const isEnglish = typeof window !== "undefined" ? true : true; // server fallback
      return {
        dayLabel: DAY_LABELS[nextDay].en, // caller provides language-aware label
        openTime: schedule.openTime,
      };
    }
  }

  return null;
}

/**
 * Find next open day with language-aware label.
 * Used internally by getStoreStatus but exposed for custom usage.
 */
export function findNextOpenDayLabel(
  storeHours: StoreHours,
  language: string = "en"
): { dayLabel: string; openTime: string } | null {
  const { day } = getDRTime();
  const idx = DAYS_OF_WEEK.indexOf(day);
  const lang = language === "es" ? "es" : "en";

  for (let offset = 1; offset <= 7; offset++) {
    const nextIdx = (idx + offset) % 7;
    const nextDay = DAYS_OF_WEEK[nextIdx];
    const schedule = storeHours[nextDay];

    if (schedule?.open && schedule.openTime) {
      // If it's tomorrow, use "Tomorrow" / "Mañana"
      if (offset === 1) {
        return {
          dayLabel: lang === "es" ? "mañana" : "tomorrow",
          openTime: schedule.openTime,
        };
      }
      return {
        dayLabel: DAY_LABELS[nextDay][lang],
        openTime: schedule.openTime,
      };
    }
  }

  return null;
}

// ─── Default Hours Generator ─────────────────────────────────────────────────

/** Generate a default store_hours object (Mon–Sat 9–6, Sun closed) */
export function getDefaultStoreHours(): StoreHours {
  return {
    monday: { open: true, openTime: "09:00", closeTime: "18:00" },
    tuesday: { open: true, openTime: "09:00", closeTime: "18:00" },
    wednesday: { open: true, openTime: "09:00", closeTime: "18:00" },
    thursday: { open: true, openTime: "09:00", closeTime: "18:00" },
    friday: { open: true, openTime: "09:00", closeTime: "18:00" },
    saturday: { open: true, openTime: "09:00", closeTime: "18:00" },
    sunday: { open: false, openTime: "09:00", closeTime: "18:00" },
  };
}