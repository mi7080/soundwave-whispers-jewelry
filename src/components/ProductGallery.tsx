import { useState } from "react";

const images = [
  { src: "https://cdn.shopify.com/s/files/1/0992/5050/3992/files/asset_281_transformation_15471.png?v=1775475000", alt: "ANIMUS Engraved Dog Tag – 18K Yellow Gold Finish" },
  { src: "https://cdn.shopify.com/s/files/1/0992/5050/3992/files/asset_753_transformation_15472.png?v=1775475002", alt: "ANIMUS Engraved Dog Tag – Detail View" },
];

const ProductGallery = () => {
  const [selected, setSelected] = useState(0);

  return (
    <section className="py-24 md:py-32 bg-card">
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
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
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
