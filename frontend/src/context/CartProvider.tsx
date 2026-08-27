"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authFetch } from "@/src/lib/authFetch";
import { supabase } from "@/src/lib/supabase";
import { requestAuthPrompt } from "@/src/components/AuthRequiredPrompt";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type CartItem = {
  id: string;
  cart_id?: string;
  product_id: string;
  quantity: number;
  selected_color_id: string | null;
  subtotal: number;
  products?: {
    name: string;
    price: number;
    slug: string;
  } | null;
  product_colors?: {
    color_name: string;
    color_hex: string;
  } | null;
};

type CartResponse = {
  cart_id: string;
  items: CartItem[];
  total: number;
};

type AddItemInput = {
  productId: string;
  quantity?: number;
  selectedColorId?: string | null;
};

type CartContextValue = {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartLoading: boolean;
  isAuthenticated: boolean;
  busyIds: Set<string>;
  message: string;
  addItem: (input: AddItemInput) => Promise<boolean>;
  updateItem: (
    itemId: string,
    productId: string,
    quantity: number,
  ) => Promise<boolean>;
  removeItem: (
    itemId: string,
    productId: string,
  ) => Promise<boolean>;
  refreshCart: () => Promise<void>;
};

const CartContext =
  createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartLoading, setCartLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(
    new Set(),
  );
  const [message, setMessage] = useState("");

  const showMessage = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);

      window.setTimeout(() => {
        setMessage("");
      }, 1800);
    },
    [],
  );

  const refreshCart = useCallback(async () => {
    try {
      setCartLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsAuthenticated(false);
        setCartItems([]);
        setCartTotal(0);
        return;
      }

      setIsAuthenticated(true);

      const response = await authFetch(
        `${API_URL}/cart`,
      );

      if (!response.ok) {
        throw new Error("Unable to load cart.");
      }

      const data: CartResponse = await response.json();

      setCartItems(data.items ?? []);
      setCartTotal(Number(data.total ?? 0));
    } catch (err) {
      console.error("Cart refresh failed:", err);
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        window.setTimeout(() => {
          if (!mounted) {
            return;
          }

          if (!session) {
            setIsAuthenticated(false);
            setCartItems([]);
            setCartTotal(0);
            setCartLoading(false);
            return;
          }

          setIsAuthenticated(true);
          void refreshCart();
        }, 0);
      },
    );

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        window.setTimeout(() => {
          if (!mounted) {
            return;
          }

          if (!data.session) {
            setIsAuthenticated(false);
            setCartItems([]);
            setCartTotal(0);
            setCartLoading(false);
            return;
          }

          setIsAuthenticated(true);
          void refreshCart();
        }, 0);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshCart]);

  const addItem = useCallback(
    async ({
      productId,
      quantity = 1,
      selectedColorId = null,
    }: AddItemInput) => {
      if (busyIds.has(productId)) {
        return false;
      }

      try {
        setBusyIds((current) => {
          const next = new Set(current);
          next.add(productId);
          return next;
        });

        setMessage("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          showMessage("Sign in to add pieces to your bag.");
          requestAuthPrompt({
            title: "Add this piece to your bag",
            message: "Sign in to add pieces to your bag.",
          });
          return false;
        }

        const response = await authFetch(
          `${API_URL}/cart/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              product_id: productId,
              quantity,
              selected_color_id: selectedColorId,
            }),
          },
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => null);

          throw new Error(
            data?.detail ??
              "Unable to add item to cart.",
          );
        }

        await refreshCart();

        showMessage(
          quantity === 1
            ? "Added to cart"
            : `${quantity} items added to cart`,
        );

        return true;
      } catch (err) {
        console.error(err);

        if (
          err instanceof Error &&
          err.message === "AUTH_REQUIRED"
        ) {
          showMessage("Sign in to add pieces to your bag.");
          requestAuthPrompt({
            title: "Add this piece to your bag",
            message: "Sign in to add pieces to your bag.",
          });
          return false;
        }

        showMessage(
          err instanceof Error
            ? err.message
            : "Unable to add item to cart.",
        );

        return false;
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [busyIds, refreshCart, showMessage],
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      productId: string,
      quantity: number,
    ) => {
      if (
        busyIds.has(productId) ||
        quantity < 1
      ) {
        return false;
      }

      try {
        setBusyIds((current) => {
          const next = new Set(current);
          next.add(productId);
          return next;
        });

        setMessage("");

        const response = await authFetch(
          `${API_URL}/cart/items/${itemId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ quantity }),
          },
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => null);

          throw new Error(
            data?.detail ??
              "Unable to update cart quantity.",
          );
        }

        await refreshCart();
        showMessage("Bag updated");

        return true;
      } catch (err) {
        console.error(err);

        if (
          err instanceof Error &&
          err.message === "AUTH_REQUIRED"
        ) {
          requestAuthPrompt({
            title: "Your bag needs an account",
            message:
              "Log in or create an account to manage the pieces in your bag.",
          });
          return false;
        }

        showMessage(
          err instanceof Error
            ? err.message
            : "Unable to update cart quantity.",
        );

        return false;
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [busyIds, refreshCart, showMessage],
  );

  const removeItem = useCallback(
    async (
      itemId: string,
      productId: string,
    ) => {
      if (busyIds.has(productId)) {
        return false;
      }

      try {
        setBusyIds((current) => {
          const next = new Set(current);
          next.add(productId);
          return next;
        });

        setMessage("");

        const response = await authFetch(
          `${API_URL}/cart/items/${itemId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => null);

          throw new Error(
            data?.detail ??
              "Unable to remove item from cart.",
          );
        }

        await refreshCart();
        showMessage("Removed from bag");

        return true;
      } catch (err) {
        console.error(err);

        if (
          err instanceof Error &&
          err.message === "AUTH_REQUIRED"
        ) {
          requestAuthPrompt({
            title: "Your bag needs an account",
            message:
              "Log in or create an account to manage the pieces in your bag.",
          });
          return false;
        }

        showMessage(
          err instanceof Error
            ? err.message
            : "Unable to remove item from cart.",
        );

        return false;
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(productId);
          return next;
        });
      }
    },
    [busyIds, refreshCart, showMessage],
  );

  const cartCount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0,
      ),
    [cartItems],
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      cartTotal,
      cartLoading,
      isAuthenticated,
      busyIds,
      message,
      addItem,
      updateItem,
      removeItem,
      refreshCart,
    }),
    [
      cartItems,
      cartCount,
      cartTotal,
      cartLoading,
      isAuthenticated,
      busyIds,
      message,
      addItem,
      updateItem,
      removeItem,
      refreshCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return context;
}
