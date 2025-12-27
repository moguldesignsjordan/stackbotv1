// src/lib/types/location.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPin {
  coordinates: Coordinates;
  address: string;
  pinLocked: boolean;
}

export interface SavedLocation {
  id: string;
  label: string;
  address: string;
  coordinates: Coordinates;
  isDefault: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DeliveryAddressWithPin {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions?: string;
  coordinates?: Coordinates;
  pinLocked: boolean;
}

export interface VendorLocationSettings {
  coordinates?: Coordinates;
  address?: string;
  serviceRadius?: number; // in kilometers
  deliveryZones?: DeliveryZone[];
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  polygon?: Coordinates[]; // For advanced zone shapes
  radius?: number; // Simple circular zone in km
  center?: Coordinates;
}

// Default center for Dominican Republic (Puerto Plata area)
export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 19.7934,
  lng: -70.6884,
};

export const DEFAULT_MAP_ZOOM = 14;

// Caribbean region bounds for restricting map/search
export const CARIBBEAN_BOUNDS = {
  north: 27.0,
  south: 10.0,
  west: -85.0,
  east: -59.0,
};