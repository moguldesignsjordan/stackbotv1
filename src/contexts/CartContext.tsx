// src/contexts/CartContext.tsx
'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem } from '@/lib/types/order';

// ============================================================================
// Types
// ============================================================================

interface Cart {
  items: CartItem[];
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
const CURRENT_CART_VERSION = 2; // Increment when cart schema changes
const DELIVERY_FEE = 3.99;
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
  
  // Ensure all items are from the same vendor
  const firstItem = validItems[0];
  const sameVendorItems = validItems.filter(
    item => item.vendorId === firstItem.vendorId
  );
  
  if (sameVendorItems.length !== validItems.length) {
    console.warn('[Cart] Found items from multiple vendors, keeping only first vendor');
  }
  
  return {
    items: sameVendorItems,
    vendorId: firstItem.vendorId,
    vendorName: firstItem.vendorName,
  };
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

      // If cart has items from different vendor, clear and start fresh
      if (state.vendorId && state.vendorId !== newItem.vendorId) {
        return {
          items: [newItem],
          vendorId: newItem.vendorId,
          vendorName: newItem.vendorName,
        };
      }

      // Check if item already exists
      const existingIndex = state.items.findIndex(
        (item) => item.productId === newItem.productId
      );

      if (existingIndex > -1) {
        // Update quantity
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + newItem.quantity,
        };
        return { ...state, items: updatedItems };
      }

      // Add new item
      return {
        ...state,
        items: [...state.items, newItem],
        vendorId: newItem.vendorId,
        vendorName: newItem.vendorName,
      };
    }

    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(
        (item) => item.productId !== action.payload
      );
      if (filteredItems.length === 0) {
        return initialCart;
      }
      return { ...state, items: filteredItems };

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        const remaining = state.items.filter((item) => item.productId !== productId);
        if (remaining.length === 0) {
          return initialCart;
        }
        return { ...state, items: remaining };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        ),
      };
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

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = cart.items.length > 0 ? DELIVERY_FEE : 0;
  const serviceFee = 0; // Removed, kept for backward compat
  const tax = (subtotal + deliveryFee) * TAX_PERCENT;
  const total = subtotal + deliveryFee + tax;

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (productId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}