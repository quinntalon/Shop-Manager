import { Link } from "wouter";
import { ShoppingBag, ImageOff, Tag } from "lucide-react";
import { cn, formatPrice, effectivePrice } from "@/lib/utils";
import type { StoreProduct } from "@/lib/api";

interface Props {
  product: StoreProduct;
  className?: string;
}

export default function ProductCard({ product, className }: Props) {
  const discounted = product.discountPercent > 0;
  const finalPrice = effectivePrice(product.price, product.discountPercent);
  const inStock = product.stock > 0;

  return (
    <Link href={`/products/${product.id}`} className={cn("group block card", className)}>
      {/* Image */}
      <div className="relative aspect-square bg-surface-3 overflow-hidden">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-600">
            <ImageOff className="w-10 h-10" />
            <span className="text-xs">No image</span>
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
        <div className="absolute inset-0 bg-surface/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="flex items-center gap-2 btn-primary text-sm shadow-xl">
            <ShoppingBag className="w-4 h-4" />
            View Details
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-1.5">
        {product.categoryName && (
          <span className="text-xs font-semibold text-amber tracking-wide uppercase">
            {product.categoryName}
          </span>
        )}
        <h3 className="font-semibold text-slate-100 leading-snug line-clamp-2 group-hover:text-amber transition-colors">
          {product.name}
        </h3>
        <div className="flex items-end gap-2 pt-1">
          <span className="text-lg font-bold text-slate-50">
            {formatPrice(finalPrice)}
          </span>
          {discounted && (
            <span className="text-sm text-slate-500 line-through pb-0.5">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className={cn("badge text-xs", inStock ? "badge-green" : "badge-red")}>
            {inStock ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>
    </Link>
  );
}
