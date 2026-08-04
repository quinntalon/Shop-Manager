import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImageOff, Tag, CheckCircle2, XCircle, Package, Zap } from "lucide-react";
import { fetchProduct, fetchProducts } from "@/lib/api";
import { formatPrice, effectivePrice } from "@/lib/utils";
import ProductCard from "@/components/product-card";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["store-product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: !isNaN(productId),
  });

  const { data: related = [] } = useQuery({
    queryKey: ["store-products", "related", product?.categoryId],
    queryFn: () =>
      fetchProducts({ categoryId: product?.categoryId ?? undefined, sort: "newest" }),
    enabled: !!product,
    select: (data) => data.filter((p) => p.id !== productId).slice(0, 4),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
        <div className="h-4 bg-surface-3 rounded w-24 mb-8" />
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-surface-3 rounded-2xl" />
          <div className="space-y-4 py-2">
            <div className="h-3 bg-surface-3 rounded w-24" />
            <div className="h-8 bg-surface-3 rounded w-3/4" />
            <div className="h-6 bg-surface-3 rounded w-1/3" />
            <div className="h-20 bg-surface-3 rounded" />
            <div className="h-12 bg-surface-3 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-slate-300 mb-2">Product not found</h2>
        <p className="text-slate-500 mb-6">This product may have been removed or doesn't exist.</p>
        <Link href="/catalog" className="btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const finalPrice = effectivePrice(product.price, product.discountPercent);
  const discounted = product.discountPercent > 0;
  const inStock = product.stock > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/" className="hover:text-amber transition-colors">Home</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-amber transition-colors">Catalog</Link>
        {product.categoryName && (
          <>
            <span>/</span>
            <Link
              href={`/catalog?categoryId=${product.categoryId}`}
              className="hover:text-amber transition-colors"
            >
              {product.categoryName}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-300 truncate max-w-[180px]">{product.name}</span>
      </nav>

      {/* Product layout */}
      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Image */}
        <div className="relative aspect-square bg-surface-2 rounded-2xl border border-border overflow-hidden">
          {product.photoUrl ? (
            <img
              src={product.photoUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600">
              <ImageOff className="w-16 h-16" />
              <span className="text-sm">No image available</span>
            </div>
          )}
          {discounted && (
            <div className="absolute top-4 left-4">
              <span className="badge badge-amber text-sm">
                <Tag className="w-3.5 h-3.5 mr-1" />
                {product.discountPercent}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {product.categoryName && (
            <Link
              href={`/catalog?categoryId=${product.categoryId}`}
              className="section-label hover:text-amber-light transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              {product.categoryName}
            </Link>
          )}

          <div>
            <h1 className="font-display text-3xl font-bold text-slate-50 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-mono">SKU: {product.sku}</p>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-slate-50 font-display">
              {formatPrice(finalPrice)}
            </span>
            {discounted && (
              <div className="pb-1 space-y-0.5">
                <span className="block text-lg text-slate-500 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="badge badge-amber text-xs">Save {formatPrice(product.price - finalPrice)}</span>
              </div>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-green-400">
                  In Stock
                </span>
                <span className="text-sm text-slate-500">— {product.stock} unit{product.stock !== 1 ? "s" : ""} available</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Out of Stock</span>
              </>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-slate-400 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Divider */}
          <div className="glow-line" />

          {/* CTA */}
          <div className="space-y-3">
            <a
              href="tel:+233200000000"
              className="btn-primary w-full justify-center text-base py-3"
            >
              <Package className="w-5 h-5" />
              {inStock ? "Enquire to Order" : "Join Waitlist"}
            </a>
            <Link href="/catalog" className="btn-ghost w-full justify-center text-sm">
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>

          {/* Perks */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { icon: "🛡️", text: "2-Year Warranty" },
              { icon: "🚚", text: "Free Delivery on orders ≥ GH₵500" },
              { icon: "🔄", text: "30-Day Returns" },
              { icon: "🔧", text: "Expert Installation" },
            ].map((p) => (
              <div
                key={p.text}
                className="flex items-start gap-2 bg-surface-3 rounded-lg p-3 text-xs text-slate-400"
              >
                <span className="text-base leading-none">{p.icon}</span>
                {p.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-slate-50">More in {product.categoryName ?? "this category"}</h2>
            <Link
              href={product.categoryId ? `/catalog?categoryId=${product.categoryId}` : "/catalog"}
              className="btn-ghost text-sm"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
