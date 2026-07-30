import { useState, useEffect, type ReactNode } from "react";
import { ShoppingBag, Tag, Globe } from "lucide-react";

type PublicProduct = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  photoUrl: string | null;
  price: number;
  discountPercent: number;
  salePrice: number;
  stock: number;
  soldOut: boolean;
  categoryId: number | null;
  categoryName: string | null;
};

type PublicSettings = {
  businessName: string;
  logoUrl: string | null;
};

export default function StoreFront() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({
    businessName: "Our Store",
    logoUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/products").then((r) => r.json()),
      fetch("/api/public/settings").then((r) => r.json()),
    ])
      .then(([prods, sett]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        if (sett && typeof sett === "object") setSettings(sett);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(
    new Set(
      products
        .map((p) => p.categoryName)
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort();

  const filtered =
    activeCategory === null
      ? products
      : products.filter((p) => p.categoryName === activeCategory);

  const availableCount = filtered.filter((p) => !p.soldOut).length;
  const totalCount = filtered.length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.businessName}
                className="h-9 w-9 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <ShoppingBag className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="text-xl font-bold tracking-tight text-slate-900">
              {settings.businessName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Globe className="h-4 w-4" />
            <span>
              {availableCount} available · {totalCount} items
            </span>
          </div>
        </div>
      </header>

      {/* ── Category filter ──────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
            <FilterPill
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <FilterPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() =>
                  setActiveCategory(activeCategory === cat ? null : cat)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error ? (
          <EmptyState
            icon={<ShoppingBag className="h-10 w-10 text-slate-300" />}
            title="Could not load products"
            subtitle="Please try again later."
          />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-100 rounded-full w-1/3" />
                  <div className="h-5 bg-slate-100 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-full w-full" />
                  <div className="h-3 bg-slate-100 rounded-full w-2/3" />
                  <div className="h-6 bg-slate-100 rounded-full w-1/4 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-10 w-10 text-slate-300" />}
            title={
              activeCategory
                ? `No products in "${activeCategory}"`
                : "No products available"
            }
            subtitle="Check back soon for new arrivals."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-16 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-medium text-slate-600">
            {settings.businessName}
          </span>
          . All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-xs">{subtitle}</p>
    </div>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col">
      {/* ── Image ─────────────────────────── */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden flex-shrink-0">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
              product.soldOut ? "opacity-50 grayscale" : ""
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-14 w-14 text-slate-200" />
          </div>
        )}

        {/* Sold-out overlay */}
        {product.soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="bg-black/75 text-white text-xs font-bold px-5 py-2 rounded-full uppercase tracking-widest">
              Sold Out
            </span>
          </div>
        )}

        {/* Discount badge */}
        {product.discountPercent > 0 && !product.soldOut && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
            <Tag className="h-3 w-3" />
            {product.discountPercent}% off
          </div>
        )}
      </div>

      {/* ── Info ──────────────────────────── */}
      <div className="p-5 flex flex-col flex-1">
        {product.categoryName && (
          <span className="inline-block self-start text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-2">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-semibold text-slate-900 text-base leading-snug">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 flex-1">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-2">
          {product.discountPercent > 0 ? (
            <>
              <span className="text-xl font-bold text-slate-900">
                ₵{product.salePrice.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                ₵{product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-xl font-bold text-slate-900">
              ₵{product.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock status */}
        {!product.soldOut && (
          <div className="mt-2">
            <span className="text-xs text-green-600 font-medium">
              ✓ In stock
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
