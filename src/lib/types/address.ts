// src/lib/types/address.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  instructions?: string;
  isPinned: boolean;
  coordinates?: Coordinates;
  createdAt: string;
  updatedAt: string;
}

export interface AddressFormData {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  instructions: string;
  isPinned: boolean;
  coordinates?: Coordinates;
}