export type LocationValue =
  | string
  | {
      lat?: number;
      lng?: number;
      location_address?: string;
      address?: string;
      [key: string]: any;
    }
  | null
  | undefined;

export function formatLocation(loc: LocationValue): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;

  if (typeof loc === "object") {
    return (
      loc.location_address ||
      loc.address ||
      (loc.lat != null && loc.lng != null ? `${loc.lat}, ${loc.lng}` : "")
    );
  }

  return String(loc);
}
