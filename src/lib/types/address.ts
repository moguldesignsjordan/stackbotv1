// src/lib/types/address.ts

export interface SavedAddress {
  id: string;
  label: string; // "Home", "Work", "Mom's House", etc.
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isPinned: boolean; // The default/pinned address
  createdAt: string;
  updatedAt: string;
}

export interface AddressFormData {
  label: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  instructions?: string;
  isPinned?: boolean;
}

export interface CustomerAddresses {
  addresses: SavedAddress[];
  pinnedAddressId: string | null;
}