import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowRight, Zap, Shield, Truck, RotateCcw, ChevronRight, Sparkles } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api";
import ProductCard from "@/components/product-card";

const CATEGORY_ICONS: Record<string, string> = {
  default: "📦",
  refrigerator: "🧊",
  fridge: "🧊",
  washing: "🫧",
  washer: "🫧",
  dryer: "💨",
  oven: "🔥",
  microwave: "📡",
  air: "❄️",
  tv: "📺",
  television: "📺",
  blender: "🥤",
  dishwasher: "🍽️",
  freezer: "🧊",
  cooker: "🍳",
  iron: "👔",
  vacuum: "🌀",
  fan: "🌬️",
  water: "💧",
  generator: "⚡",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

const PERKS = [
  { icon: Truck, title: "Free Delivery", desc: "On orders above GH₵500" },
  { icon: Shield, title: "2-Year Warranty", desc: "All appliances covered" },
  { icon: RotateCcw, title: "Easy Returns", desc: "30-day hassle-free returns" },
  { icon: Zap, title: "Expert Support", desc: "Certified technicians on call" },
];

export default function Home() {
  const [, setLocation] = useLocation();

  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
  });

  const { data: featuredProducts = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ["store-products", "featured"],
    queryFn: () => fetchProducts({ sort: "newest" }),
    select: (data) => data.filter((p) => p.stock > 0).slice(0, 8),
  });

  const { data: saleProducts = [] } = useQuery({
    queryKey: ["store-products", "sale"],
    queryFn: () => fetchProducts({ sort: "price_asc" }),
    select: (data) => data.filter((p) => p.discountPercent > 0 && p.stock > 0).slice(0, 4),
  });

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-slate-400) 1px, transparent 1px), linear-gradient(90deg, var(--color-slate-400) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow blob */}
        <div
          className="absolute right-0 top-0 w-[700px] h-[700px] opacity-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, var(--color-amber) 0%, transparent 65%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="space-y-8">
            <span className="section-label">
              <Sparkles className="w-3.5 h-3.5" />
              New arrivals just dropped
            </span>
            <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl font-bold text-slate-50 leading-[1.05] tracking-tight">
              Power Your
              <br />
              <span className="text-amber">Home</span> with
              <br />
              Precision.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md">
              Premium appliances built to last. Browse hundreds of products — from
              smart refrigerators to energy-efficient ovens — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalog" className="btn-primary text-base px-6 py-3">
                Shop Now
                <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <Link href="/catalog?sort=newest" className="btn-ghost text-base px-6 py-3">
                New Arrivals
              </Link>
            </div>
            {/* Stats */}
            <div className="flex flex-wrap gap-8 pt-2">
              {[
                { val: `${featuredProducts.length + 30}+`, label: "Products" },
                { val: `${categories.length || 12}`, label: "Categories" },
                { val: "2yr", label: "Warranty" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-bold font-display text-amber">{s.val}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — category pills */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {categories.slice(0, 6).map((cat, i) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setLocation(`/catalog?categoryId=${cat.id}`)}
                className="group card p-5 text-left cursor-pointer hover:border-amber/40"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="text-3xl mb-3">{getCategoryIcon(cat.name)}</div>
                <div className="font-semibold text-slate-200 group-hover:text-amber transition-colors text-sm">
                  {cat.name}
                </div>
                {cat.description && (
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cat.description}</div>
                )}
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber transition-all group-hover:translate-x-1 mt-2" />
              </button>
            ))}
            {categories.length === 0 &&
              ["Refrigerators", "Washing Machines", "Ovens", "Air Conditioners", "Televisions", "Cookers"].map(
                (n, i) => (
                  <div key={n} className="card p-5 opacity-30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="text-3xl mb-3">{Object.values(CATEGORY_ICONS)[i + 1]}</div>
                    <div className="h-3 bg-surface-3 rounded w-24 mt-2" />
                  </div>
                ),
              )}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* ── Perks bar ── */}
      <section className="bg-surface-2 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-glow flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5 text-amber" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">{title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories grid ── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <span className="section-label">
                <Sparkles className="w-3.5 h-3.5" />
                Browse by category
              </span>
              <h2 className="font-display text-3xl font-bold text-slate-50">Shop by Category</h2>
            </div>
            <Link href="/catalog" className="btn-ghost hidden sm:flex">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalog?categoryId=${cat.id}`}
                className="group card p-4 text-center hover:border-amber/40 cursor-pointer"
              >
                <div className="text-4xl mb-2 transition-transform group-hover:scale-110">
                  {getCategoryIcon(cat.name)}
                </div>
                <div className="text-sm font-semibold text-slate-300 group-hover:text-amber transition-colors leading-tight">
                  {cat.name}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Sale products ── */}
      {saleProducts.length > 0 && (
        <section className="bg-surface-2 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <span className="section-label">
                  <Zap className="w-3.5 h-3.5" />
                  Limited time deals
                </span>
                <h2 className="font-display text-3xl font-bold text-slate-50">On Sale Now</h2>
              </div>
              <Link href="/catalog?sort=price_asc" className="btn-ghost hidden sm:flex">
                See all deals <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {saleProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured products ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <span className="section-label">
              <Sparkles className="w-3.5 h-3.5" />
              Latest stock
            </span>
            <h2 className="font-display text-3xl font-bold text-slate-50">Featured Products</h2>
          </div>
          <Link href="/catalog" className="btn-ghost hidden sm:flex">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingFeatured ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-surface-3" />
                <div className="p-4 space-y-2">
                  <div className="h-2.5 bg-surface-3 rounded w-1/3" />
                  <div className="h-4 bg-surface-3 rounded w-3/4" />
                  <div className="h-5 bg-surface-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-24 text-slate-500">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium text-slate-400">No products yet</p>
            <p className="text-sm mt-1">Products will appear here once added to the inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {featuredProducts.length > 0 && (
          <div className="flex justify-center mt-10">
            <Link href="/catalog" className="btn-primary px-8 py-3 text-base">
              Browse All Products <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ── CTA banner ── */}
      <section className="relative overflow-hidden bg-amber mx-4 sm:mx-6 mb-16 rounded-2xl">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-surface) 1px, transparent 1px), linear-gradient(90deg, var(--color-surface) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-8 py-14 text-center space-y-5">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-surface leading-tight">
            Ready to upgrade your home?
          </h2>
          <p className="text-surface/70 text-lg">
            Explore our full catalog of premium appliances and find the perfect fit for every room.
          </p>
          <Link href="/catalog" className="inline-flex items-center gap-2 bg-surface text-amber font-bold px-7 py-3 rounded-xl hover:bg-surface-2 transition-colors text-base">
            Shop the Catalog <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
