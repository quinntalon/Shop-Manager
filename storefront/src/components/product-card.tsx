import { useState } from "react";
import { Link } from "wouter";
import { Heart, ImageOff, ShoppingCart, Tag, CheckSquare } from "lucide-react";
import { cn, formatPrice, effectivePrice } from "@/lib/utils";
import type { StoreProduct } from "@/lib/api";

interface Props {
  product: StoreProduct;
  className?: string;
  /** true = legacy grid card (used on desktop / home page), false = new mobile horizontal card */
  listView?: boolean;
}

/* ─── star rating ──────────────────────────────────────────── */

/** Deterministic pseudo-rating derived from product id so cards look
 *  realistic without a real ratings API.  Range: 4.0 – 5.0 */
function deriveRating(id: number): number {
  return 4.0 + (id % 11) / 10; // 4.0, 4.1 … 5.0, 4.1 …
}

function StarRating({ rating, uid }: { rating: number; uid: string }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full)           return "full";
    if (i === full && half) return "half";
    return "empty";
  });

  return (
    <span className="flex items-center gap-0.5">
      {stars.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="h-3 w-3 shrink-0"
          fill={s !== "empty" ? "currentColor" : "none"}
          style={{ color: s === "empty" ? "var(--border-2)" : "var(--sd-orange)" }}
        >
          {s === "half" ? (
            <>
              <defs>
                <clipPath id={`hc-${uid}-${i}`}>
                  <rect x="0" y="0" width="10" height="20" />
                </clipPath>
              </defs>
              {/* empty background star */}
              <path
                fill="var(--border-2)"
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
                   0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
                   1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197
                   -1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81
                   .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
              {/* filled left half */}
              <path
                fill="var(--sd-orange)"
                clipPath={`url(#hc-${uid}-${i})`}
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
                   0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
                   1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197
                   -1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81
                   .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </>
          ) : (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969
                     0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755
                     1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197
                     -1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81
                     .588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          )}
        </svg>
      ))}
    </span>
  );
}

/* ─── product card ─────────────────────────────────────────── */

export default function ProductCard({ product, className, listView = false }: Props) {
  const discounted = product.discountPercent > 0;
  const finalPrice = effectivePrice(product.price, product.discountPercent);
  const inStock    = product.stock > 0;
  const rating     = deriveRating(product.id);
  const ratingText = rating.toFixed(1);

  const [wishlisted, setWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted((v) => !v);
  }

  /* ══════════════════════════════════════════════════════════
     MOBILE HORIZONTAL CARD  (listView === true)
     ══════════════════════════════════════════════════════════ */
  if (listView) {
    return (
      <Link href={`/products/${product.id}`}>
        <article
          className={cn("mobile-product-card group", className)}
          aria-label={product.name}
        >
          {/* ── Left: product image ── */}
          <div
            className="shrink-0 relative overflow-hidden"
            style={{
              width: "7.5rem",
              minHeight: "9rem",
              background: "var(--surface-3)",
              borderRadius: "1.25rem 0 0 1.25rem",
            }}
          >
            {product.photoUrl ? (
              <img
                src={product.photoUrl}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ minHeight: "9rem" }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-1"
                style={{ color: "var(--text-quiet)", minHeight: "9rem" }}
              >
                <ImageOff className="h-7 w-7 opacity-40" />
                <span className="text-[9px] uppercase tracking-widest opacity-40">No image</span>
              </div>
            )}

            {/* Discount badge */}
            {discounted && (
              <span
                className="absolute top-2 left-2 badge badge-orange"
                style={{ fontSize: "0.6rem" }}
              >
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                {product.discountPercent}% off
              </span>
            )}
          </div>

          {/* ── Right: product info ── */}
          <div className="flex-1 flex flex-col justify-between px-3.5 py-3 min-w-0 relative">
            {/* Wishlist heart — top right */}
            <button
              type="button"
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute top-3 right-3 flex items-center justify-center h-7 w-7 rounded-full transition-colors"
              style={{
                border:     "1px solid var(--border)",
                background: "var(--surface-2)",
                color:      wishlisted ? "var(--sd-orange)" : "var(--text-subtle)",
              }}
            >
              <Heart
                className="h-3.5 w-3.5"
                fill={wishlisted ? "currentColor" : "none"}
              />
            </button>

            {/* Product name */}
            <div className="pr-8">
              <h3
                className="font-bold text-[0.82rem] leading-snug line-clamp-2"
                style={{ color: "var(--text-primary)" }}
              >
                {product.name}
              </h3>

              {/* Category / subtitle */}
              <p
                className="text-[0.68rem] mt-0.5 line-clamp-1"
                style={{ color: "var(--text-subtle)" }}
              >
                {product.categoryName ?? (product.description?.split(".")[0] ?? "Product")}
              </p>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span
                className="text-[0.9rem] font-extrabold"
                style={{ color: "var(--sd-orange)" }}
              >
                {formatPrice(finalPrice)}
              </span>
              {discounted && (
                <span
                  className="text-[0.68rem] line-through"
                  style={{ color: "var(--text-faint)" }}
                >
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Star rating */}
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={rating} uid={`lv-${product.id}`} />
              <span
                className="text-[0.65rem] font-semibold"
                style={{ color: "var(--text-subtle)" }}
              >
                ({ratingText})
              </span>
            </div>

            {/* Add to Cart + secondary action */}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                className="btn-add-cart"
                onClick={handleAddToCart}
                disabled={!inStock}
                aria-label="Add to cart"
                style={
                  !inStock
                    ? { opacity: 0.45, cursor: "not-allowed" }
                    : addedToCart
                    ? { background: "#16a34a" }
                    : {}
                }
              >
                {addedToCart ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {inStock ? "Add to Cart" : "Out of Stock"}
                  </>
                )}
              </button>

              {/* Secondary action: quick-view / details */}
              <Link href={`/products/${product.id}`}>
                <button
                  type="button"
                  className="btn-secondary-action"
                  aria-label="View product details"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  /* ══════════════════════════════════════════════════════════
     GRID CARD  (listView === false, used in grid view + desktop)
     ══════════════════════════════════════════════════════════ */
  return (
    <Link
      href={`/products/${product.id}`}
      className={cn("group quiet-card overflow-hidden block", className)}
    >
      {/* Image */}
      <div className="relative bg-surface-3 overflow-hidden aspect-[1.08/1]">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <ImageOff className="w-8 h-8 opacity-40" />
            <span className="text-[10px] uppercase tracking-widest opacity-40">No image</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discounted && (
            <span className="badge badge-orange text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {product.discountPercent}% off
            </span>
          )}
          {!inStock && (
            <span className="badge badge-red text-xs">Out of stock</span>
          )}
        </div>

        {/* Wishlist */}
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors"
            style={{
              background: "color-mix(in srgb, var(--surface-2) 90%, transparent)",
              color:      wishlisted ? "var(--sd-orange)" : "var(--text-subtle)",
              border:     "1px solid var(--border)",
            }}
          >
            <Heart
              className="w-4 h-4"
              fill={wishlisted ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-1.5">
        {product.categoryName && (
          <span
            className="text-[10px] font-bold tracking-[0.14em] uppercase"
            style={{ color: "var(--sd-orange)" }}
          >
            {product.categoryName}
          </span>
        )}

        <h3
          className="font-bold leading-snug line-clamp-2 text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2 pt-0.5">
          <span
            className="text-sm font-extrabold"
            style={{ color: "var(--sd-orange)" }}
          >
            {formatPrice(finalPrice)}
          </span>
          {discounted && (
            <span
              className="text-xs line-through"
              style={{ color: "var(--text-faint)" }}
            >
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <StarRating rating={rating} uid={`gv-${product.id}`} />
          <span
            className="text-[10px] font-semibold"
            style={{ color: "var(--text-subtle)" }}
          >
            ({ratingText})
          </span>
        </div>

        {/* Stock */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span
            className={cn(
              "text-[10px] font-medium",
              inStock ? "" : "text-red",
            )}
            style={{ color: inStock ? "#16a34a" : "var(--color-red)" }}
          >
            {inStock ? `${product.stock} available` : "Out of stock"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-faint)" }}>
            View details →
          </span>
        </div>
      </div>
    </Link>
  );
}
