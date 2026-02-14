// src/contexts/CartContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem } from '@/lib/types/order';

// ============================================================================
// Types
// ============================================================================

interface VendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
}

interface Cart {
  items: CartItem[];
  // DEPRECATED: kept for backward compat — use vendorGroups instead
  vendorId: string | null;
  vendorName: string | null;
}

interface CartContextType {
  cart: Cart;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number; // Keep for backward compatibility, always 0
  tax: number;
  total: number;
  // Multi-vendor helpers
  vendorGroups: VendorGroup[];
  vendorCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: Cart };

// ============================================================================
// Constants
// ============================================================================

const CART_STORAGE_KEY = 'stackbot_cart';
const CART_VERSION_KEY = 'stackbot_cart_version';
const CURRENT_CART_VERSION = 3; // Bumped for multi-vendor support
const DELIVERY_FEE_PER_VENDOR = 1.99; // $1.99 per vendor delivery
const TAX_PERCENT = 0.18; // 18% ITBIS

const initialCart: Cart = {
  items: [],
  vendorId: null,
  vendorName: null,
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates a single cart item has all required fields
 */
function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== 'object') return false;

  const i = item as Record<string, unknown>;

  return (
    typeof i.productId === 'string' && i.productId.length > 0 &&
    typeof i.vendorId === 'string' && i.vendorId.length > 0 &&
    typeof i.vendorName === 'string' && i.vendorName.length > 0 &&
    typeof i.name === 'string' && i.name.length > 0 &&
    typeof i.price === 'number' && i.price >= 0 &&
    typeof i.quantity === 'number' && i.quantity > 0
  );
}

/**
 * Validates and migrates cart data from localStorage
 * Returns null if cart is invalid and should be cleared
 */
function validateAndMigrateCart(data: unknown): Cart | null {
  if (!data || typeof data !== 'object') return null;

  const cart = data as Record<string, unknown>;

  // Check if items array exists
  if (!Array.isArray(cart.items)) return null;

  // Filter out invalid items
  const validItems = cart.items.filter(isValidCartItem);

  // If no valid items remain, return empty cart
  if (validItems.length === 0) {
    return initialCart;
  }

  // Log if we filtered out items
  if (validItems.length !== cart.items.length) {
    console.warn(
      `[Cart] Filtered out ${cart.items.length - validItems.length} invalid cart items`
    );
  }

  // Multi-vendor: keep ALL valid items (no longer filter to single vendor)
  const firstItem = validItems[0];

  return {
    items: validItems,
    // Backward compat: use first item's vendor
    vendorId: firstItem.vendorId,
    vendorName: firstItem.vendorName,
  };
}

/**
 * Derive vendorId/vendorName from items for backward compatibility
 */
function deriveVendorInfo(items: CartItem[]): { vendorId: string | null; vendorName: string | null } {
  if (items.length === 0) return { vendorId: null, vendorName: null };
  return { vendorId: items[0].vendorId, vendorName: items[0].vendorName };
}

// ============================================================================
// Reducer
// ============================================================================

function cartReducer(state: Cart, action: CartAction): Cart {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem = action.payload;

      // Validate the new item
      if (!isValidCartItem(newItem)) {
        console.error('[Cart] Attempted to add invalid item:', newItem);
        return state;
      }

      // MULTI-VENDOR: No longer clear cart for different vendors!
      // Just add the item regardless of vendor.

      // Check if item already exists (same productId)
      const existingIndex = state.items.findIndex(
        (item) => item.productId === newItem.productId
      );

      let updatedItems: CartItem[];

      if (existingIndex > -1) {
        // Update quantity of existing item
        updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + newItem.quantity,
        };
      } else {
        // Add new item
        updatedItems = [...state.items, newItem];
      }

      const { vendorId, vendorName } = deriveVendorInfo(updatedItems);
      return { items: updatedItems, vendorId, vendorName };
    }

    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(
        (item) => item.productId !== action.payload
      );
      if (filteredItems.length === 0) {
        return initialCart;
      }
      const { vendorId, vendorName } = deriveVendorInfo(filteredItems);
      return { items: filteredItems, vendorId, vendorName };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        const remaining = state.items.filter((item) => item.productId !== productId);
        if (remaining.length === 0) {
          return initialCart;
        }
        const { vendorId, vendorName } = deriveVendorInfo(remaining);
        return { items: remaining, vendorId, vendorName };
      }
      const updatedItems = state.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      );
      return { ...state, items: updatedItems };
    }

    case 'CLEAR_CART':
      return initialCart;

    case 'LOAD_CART':
      return action.payload;

    default:
      return state;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function groupItemsByVendor(items: CartItem[]): VendorGroup[] {
  const groups: Record<string, VendorGroup> = {};

  for (const item of items) {
    if (!groups[item.vendorId]) {
      groups[item.vendorId] = {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [],
        subtotal: 0,
      };
    }
    groups[item.vendorId].items.push(item);
    groups[item.vendorId].subtotal += item.price * item.quantity;
  }

  return Object.values(groups);
}

// ============================================================================
// Context
// ============================================================================

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialCart);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedVersion = localStorage.getItem(CART_VERSION_KEY);
      const saved = localStorage.getItem(CART_STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        // Check version and migrate if needed
        const version = savedVersion ? parseInt(savedVersion, 10) : 1;

        if (version < CURRENT_CART_VERSION) {
          console.log(`[Cart] Migrating cart from v${version} to v${CURRENT_CART_VERSION}`);
        }

        // Validate and migrate cart data
        const validatedCart = validateAndMigrateCart(parsed);

        if (validatedCart) {
          dispatch({ type: 'LOAD_CART', payload: validatedCart });
        } else {
          console.warn('[Cart] Invalid cart data, clearing');
          localStorage.removeItem(CART_STORAGE_KEY);
        }

        // Update version
        localStorage.setItem(CART_VERSION_KEY, String(CURRENT_CART_VERSION));
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  // Multi-vendor grouping
  const vendorGroups = groupItemsByVendor(cart.items);
  const vendorCount = vendorGroups.length;

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // Delivery fee per vendor (each vendor = separate delivery)
  const deliveryFee = cart.items.length > 0 ? DELIVERY_FEE_PER_VENDOR * vendorCount : 0;
  const serviceFee = 0; // Removed
  const tax = (subtotal + deliveryFee) * TAX_PERCENT;
  const total = subtotal + deliveryFee + tax;
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (item: CartItem) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (productId: string) => dispatch({ type: 'REMOVE_ITEM', payload: productId });
  const updateQuantity = (productId: string, quantity: number) =>
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        deliveryFee,
        serviceFee,
        tax,
        total,
        vendorGroups,
        vendorCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}