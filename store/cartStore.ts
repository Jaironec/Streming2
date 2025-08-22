import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: number
  name: string
  logo: string
  description: string
  price: number
  features: string[]
  popular: boolean
  months: number
  profiles: number
  totalPrice: number
  originalPrice: number
  savings: number
  savingsPercentage: number
}

interface CartStore {
  cartItems: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: number) => void
  clearCart: () => void
  updateQuantity: (id: number, months: number, profiles: number) => void
  getTotalPrice: () => number
  getOriginalTotalPrice: () => number
  getTotalSavings: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cartItems: [],
      
      addToCart: (item) => {
        set((state) => {
          const existingItem = state.cartItems.find(
            (cartItem) => cartItem.id === item.id
          )
          
          if (existingItem) {
            // Update existing item
            return {
              cartItems: state.cartItems.map((cartItem) =>
                cartItem.id === item.id
                  ? { ...item }
                  : cartItem
              ),
            }
          } else {
            // Add new item
            return {
              cartItems: [...state.cartItems, item],
            }
          }
        })
      },
      
      removeFromCart: (id) => {
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.id !== id),
        }))
      },
      
      clearCart: () => {
        set({ cartItems: [] })
      },
      
      updateQuantity: (id, months, profiles) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === id
              ? { ...item, months, profiles }
              : item
          ),
        }))
      },
      
      getTotalPrice: () => {
        const { cartItems } = get()
        return cartItems.reduce((total, item) => total + item.totalPrice, 0)
      },
      
      getOriginalTotalPrice: () => {
        const { cartItems } = get()
        return cartItems.reduce((total, item) => total + item.originalPrice, 0)
      },
      
      getTotalSavings: () => {
        const { cartItems } = get()
        return cartItems.reduce((total, item) => total + item.savings, 0)
      },
      
      getTotalItems: () => {
        const { cartItems } = get()
        return cartItems.length
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
