// src/components/cart/AddToCartButton.tsx
'use client';

import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/lib/types/order';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    vendorId: string;
    vendorName: string;
  };
  className?: string;
  showQuantity?: boolean;
}

export function AddToCartButton({
  product,
  className = '',
  showQuantity = false,
}: AddToCartButtonProps) {
  const { cart, addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [showVendorWarning, setShowVendorWarning] = useState(false);

  // Check if cart has items from a different vendor
  const differentVendor = cart.vendorId && cart.vendorId !== product.vendorId;

  const handleAddToCart = () => {
    if (differentVendor && !showVendorWarning) {
      setShowVendorWarning(true);
      return;
    }

    const cartItem: CartItem = {
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
    };

    addItem(cartItem);
    setAdded(true);
    setShowVendorWarning(false);
    setQuantity(1);

    // Reset "added" state after animation
    setTimeout(() => setAdded(false), 1500);
  };

  const handleConfirmReplace = () => {
    const cartItem: CartItem = {
      productId: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
    };

    addItem(cartItem);
    setAdded(true);
    setShowVendorWarning(false);
    setQuantity(1);

    setTimeout(() => setAdded(false), 1500);
  };

  // Vendor warning modal
  if (showVendorWarning) {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
          Your cart has items from <strong>{cart.vendorName}</strong>. Adding this item will clear your cart.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVendorWarning(false)}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmReplace}
            className="flex-1 px-3 py-2 text-sm bg-[#55529d] text-white rounded-lg hover:bg-[#444287] transition-colors"
          >
            Replace Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Quantity Selector (optional) */}
      {showQuantity && (
        <div className="flex items-center border border-gray-200 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-gray-50 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <span className="w-8 text-center font-medium text-sm">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 hover:bg-gray-50 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={added}
        className={`
          flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
          ${
            added
              ? 'bg-green-500 text-white'
              : 'bg-[#55529d] text-white hover:bg-[#444287]'
          }
          disabled:cursor-not-allowed
        `}
      >
        {added ? (
          <>
            <Check className="w-5 h-5" />
            Added!
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </>
        )}
      </button>
    </div>
  );
}