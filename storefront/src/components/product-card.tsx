import { Link } from "wouter";
import { Heart, ImageOff, Tag } from "lucide-react";
import { cn, formatPrice, effectivePrice } from "@/lib/utils";
import type { StoreProduct } from "@/lib/api";

interface Props {
  product: StoreProduct;
  className?: string;
  listView?: boolean;
}

export default function ProductCard({ product, className, listView = false }: Props) {
  const discounted = product.discountPercent > 0;
  const finalPrice = effectivePrice(product.price, product.discountPercent);
  const inStock = product.stock > 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        "group quiet-card overflow-hidden",
        listView ? "flex items-center gap-4 p-3" : "block",
        className,
      )}
    >
      {/* Image */}
      <div className={cn(
        "relative bg-surface-3 overflow-hidden shrink-0",
        listView ? "w-24 h-24 rounded-lg" : "aspect-[1.08/1]",
      )}>
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <ImageOff className="w-8 h-8" />
            <span className="text-[10px] uppercase tracking-widest">No image</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discounted && (
            <span className="badge badge-amber text-xs">
              <Tag className="w-3 h-3 mr-1" />
              {product.discountPercent}% off
            </span>
          )}
          {!inStock && (
            <span className="badge badge-red text-xs">Out of stock</span>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute right-3 top-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2/90 text-slate-500 shadow-sm transition-colors group-hover:text-amber">
            <Heart className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className={cn("space-y-1.5", listView ? "py-1 pr-2 min-w-0 flex-1" : "p-4")}>
        {product.categoryName && (
          <span className="text-[10px] font-bold text-amber tracking-[0.14em] uppercase">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-bold text-slate-100 leading-snug line-clamp-2 group-hover:text-amber transition-colors">
          {product.name}
        </h3>
        <div className="flex items-end gap-2 pt-1">
          <span className="text-sm font-bold text-slate-50">
            {formatPrice(finalPrice)}
          </span>
          {discounted && (
            <span className="text-sm text-slate-500 line-through pb-0.5">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className={cn("text-[10px] font-medium", inStock ? "text-green-600" : "text-red-500")}>
            {inStock ? `${product.stock} available` : "Out of stock"}
          </span>
          <span className="text-[10px] text-slate-500">View details →</span>
        </div>
      </div>
    </Link>
  );
}
