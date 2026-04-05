import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ShoppingBag, X, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0);
  const currency = items[0]?.price.currencyCode || "USD";

  useEffect(() => {
    if (isOpen) syncCart();
  }, [isOpen, syncCart]);

  const handleCheckout = () => {
    const checkoutUrl = getCheckoutUrl();
    if (checkoutUrl) {
      window.open(checkoutUrl, '_blank');
      setIsOpen(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <button className="relative" aria-label="Open cart">
          <ShoppingBag className="w-5 h-5 text-foreground hover:text-gold transition-colors" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gold text-background text-[10px] flex items-center justify-center font-sans">
              {totalItems}
            </span>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-card border-border/50">
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-serif text-foreground">Your Cart</DrawerTitle>
            <DrawerClose asChild>
              <button aria-label="Close cart">
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-muted-foreground text-sm font-light">
            {totalItems === 0 ? "Your cart is empty" : `${totalItems} item${totalItems !== 1 ? 's' : ''} in your cart`}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.variantId} className="flex gap-4 border border-border/30 rounded-sm p-3">
                <div className="w-16 h-16 bg-background/50 rounded-sm overflow-hidden flex-shrink-0">
                  {item.product.node.images?.edges?.[0]?.node && (
                    <img
                      src={item.product.node.images.edges[0].node.url}
                      alt={item.product.node.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-serif text-foreground truncate">{item.product.node.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.selectedOptions.map(o => o.value).join(' · ')}
                  </p>
                  <p className="text-sm text-gold font-sans mt-1">
                    ${(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button onClick={() => removeItem(item.variantId)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className="w-6 h-6 border border-border/50 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs text-foreground">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className="w-6 h-6 border border-border/50 rounded-sm flex items-center justify-center text-muted-foreground hover:text-foreground">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <span className="text-sm text-muted-foreground tracking-wide uppercase">Total</span>
              <span className="text-lg font-serif text-foreground">${totalPrice.toFixed(2)} {currency}</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={isLoading || isSyncing}
              className="w-full bg-gold text-background py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading || isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  Checkout with Shopify
                </>
              )}
            </button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default CartDrawer;
