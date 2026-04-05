import { useState } from "react";

import silverWorn from "@/assets/product-silver-worn.jpg";
import silverBox from "@/assets/product-silver-box.jpg";
import goldBox from "@/assets/product-gold-box.jpg";
import silverCard from "@/assets/product-silver-card.jpg";
import goldCard from "@/assets/product-gold-card.jpg";
import silverMahogany from "@/assets/product-silver-mahogany.jpg";
import goldMahogany from "@/assets/product-gold-mahogany.jpg";
import heroNecklace from "@/assets/hero-necklace.jpg";

const images = [
  { src: heroNecklace, alt: "ANIMUS 14K Gold bar necklace worn" },
  { src: silverWorn, alt: "ANIMUS Surgical Steel bar necklace worn" },
  { src: goldBox, alt: "14K Gold pendant on luxury box" },
  { src: silverBox, alt: "Surgical Steel pendant on luxury box" },
  { src: goldCard, alt: "Gold pendant with ANIMUS message card" },
  { src: silverCard, alt: "Silver pendant with ANIMUS message card" },
  { src: goldMahogany, alt: "Gold pendant in mahogany gift box" },
  { src: silverMahogany, alt: "Silver pendant in mahogany gift box" },
];

const ProductGallery = () => {
  const [selected, setSelected] = useState(0);

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs tracking-[0.4em] uppercase text-gold font-sans">
            The Collection
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-foreground">
            Every Angle, Every Detail
          </h2>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <img
              src={images[selected].src}
              alt={images[selected].alt}
              className="w-full max-h-[600px] object-contain rounded-sm"
            />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`aspect-square overflow-hidden rounded-sm border-2 transition-all ${
                  selected === i
                    ? "border-gold opacity-100"
                    : "border-border opacity-50 hover:opacity-80"
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductGallery;
