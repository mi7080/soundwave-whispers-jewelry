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
import { ShoppingBag, X, FileAudio } from "lucide-react";

const CartDrawer = () => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="relative" aria-label="Open cart">
          <ShoppingBag className="w-5 h-5 text-foreground hover:text-gold transition-colors" />
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
            Review your custom order before checkout.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 py-6 space-y-6">
          {/* Empty State */}
          <div className="text-center py-8 space-y-4">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Your cart is empty</p>
          </div>

          {/* Cart Properties Summary (shown when item exists) */}
          <div className="hidden border border-border/30 rounded-sm p-4 space-y-3">
            <p className="text-xs tracking-[0.2em] uppercase text-gold font-sans">Order Details</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-light">Material</span>
                <span className="text-foreground">14K Gold Finish</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-light">Pet's Name</span>
                <span className="text-foreground">Buddy</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-light">Audio File</span>
                <span className="text-foreground flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-gold" />
                  buddy-bark.mp3
                </span>
              </div>
            </div>
          </div>
        </div>

        <DrawerFooter>
          <button className="w-full bg-gold text-background py-4 text-xs tracking-[0.3em] uppercase hover:bg-gold-light transition-colors">
            Proceed to Checkout
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default CartDrawer;
