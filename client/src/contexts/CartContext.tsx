import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;
  isCartLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY_PREFIX = 'gymsaathi_cart_';

function getCartStorageKey(userId?: string): string {
  return `${CART_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadCartFromStorage(userId?: string): CartItem[] {
  if (!isBrowser()) return [];
  
  try {
    const key = getCartStorageKey(userId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: any) => {
          const price = parseFloat(item.price);
          const quantity = parseInt(item.quantity, 10);
          return (
            item && 
            typeof item.productId === 'string' && 
            typeof item.productName === 'string' &&
            !isNaN(price) && price >= 0 &&
            !isNaN(quantity) && quantity > 0
          );
        }).map((item: any) => ({
          ...item,
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity, 10),
        }));
      }
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }
  return [];
}

function saveCartToStorage(cart: CartItem[], userId?: string): void {
  if (!isBrowser()) return;
  
  try {
    const key = getCartStorageKey(userId);
    if (cart.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(cart));
    }
  } catch (error) {
    console.error('Error saving cart to storage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [initializedForUser, setInitializedForUser] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    const userKey = userId || 'guest';
    
    if (initializedForUser !== userKey) {
      setIsCartLoading(true);
      const loadedCart = loadCartFromStorage(userId);
      setCart(loadedCart);
      setInitializedForUser(userKey);
      setIsCartLoading(false);
    }
  }, [user?.id, initializedForUser]);

  useEffect(() => {
    if (!isCartLoading && initializedForUser) {
      saveCartToStorage(cart, user?.id);
    }
  }, [cart, user?.id, isCartLoading, initializedForUser]);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((i) => i.productId === item.productId);
      const quantityToAdd = item.quantity || 1;
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        if (newQuantity <= existingItem.stock) {
          toast({
            title: "Added to Cart",
            description: `${item.productName} (${newQuantity} in cart)`,
            variant: "success",
            duration: 2000,
          });
          return prevCart.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: newQuantity }
              : i
          );
        } else {
          toast({
            title: "Stock Limit Reached",
            description: `Cannot add more than ${existingItem.stock} items`,
            variant: "destructive",
            duration: 2000,
          });
          return prevCart;
        }
      } else {
        toast({
          title: "Added to Cart",
          description: item.productName,
          variant: "success",
          duration: 2000,
        });
        return [...prevCart, {
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: quantityToAdd,
          stock: item.stock,
          image: item.image,
        }];
      }
    });
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity > 0 && newQuantity <= item.stock) {
              return { ...item, quantity: newQuantity };
            } else if (newQuantity <= 0) {
              return null;
            }
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    if (isBrowser()) {
      if (user?.id) {
        localStorage.removeItem(getCartStorageKey(user.id));
      }
      localStorage.removeItem(getCartStorageKey('guest'));
    }
  }, [user?.id]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount,
        isCartLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
