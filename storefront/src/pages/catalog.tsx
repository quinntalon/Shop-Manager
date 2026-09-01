import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AirVent,
  ChevronDown,
  ChevronRight,
  Columns2,
  FlameKindling,
  Grid2X2,
  GlassWater,
  Heart,
  Home,
  LayoutGrid,
  List,
  MoreHorizontal,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkle,
  User,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { fetchCategories, fetchProducts, type StoreProductsParams } from "@/lib/api";
import ProductCard from "@/components/product-card";
import { effectivePrice, cn } from "@/lib/utils";

/* ─── constants ─────────────────────────────────────────── */

const SORT_OPTIONS = [
  { value: "newest",     label: "New arrivals" },
  { value: "price_asc",  label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
  { value: "name",       label: "Name A–Z" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** Map category name fragments → a Lucide icon component */
function getCategoryIcon(name: string) {
  const l = name.toLowerCase();
  if (l.includes("airfry") || l.includes("air fry"))  return FlameKindling;
  if (l.includes("blend"))                             return Zap;
  if (l.includes("bottle") || l.includes("water"))    return GlassWater;
  if (l.includes("clean") || l.includes("vacuum"))    return Wind;
  if (l.includes("air") || l.includes("ac"))          return AirVent;
  if (l.includes("wash"))                             return Sparkle;
  if (l.includes("fridge") || l.includes("refriger") || l.includes("freez")) return Package;
  if (l.includes("tv") || l.includes("telev"))        return Columns2;
  return Package;
}

const HERO_PRODUCT_KEYWORDS = ["vitamix", "blender", "food processor"];

/* ─── url helpers ───────────────────────────────────────── */

function parseSearch(qs: string) {
  const p = new URLSearchParams(qs);
  return {
    search:     p.get("search") ?? "",
    categoryId: p.get("categoryId") ? Number(p.get("categoryId")) : undefined,
    sort:       (p.get("sort") as SortValue) ?? "newest",
  };
}

/* ─── sub-components ────────────────────────────────────── */

/** Five-star display */
function StarRating({ rating = 4.5 }: { rating?: number }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full)              return "full";
    if (i === full && half)    return "half";
    return "empty";
  });
  return (
    <span className="flex items-center gap-0.5">
      {stars.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="h-3 w-3"
          fill={s === "empty" ? "none" : "currentColor"}
          style={{ color: s === "empty" ? "var(--border-2)" : "var(--sd-orange)" }}
        >
          {s === "half" ? (
            <>
              <defs>
                <clipPath id={`half-${i}`}>
                  <rect x="0" y="0" width="10" height="20" />
                </clipPath>
              </defs>
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                style={{ color: "var(--border-2)" }}
                fill="currentColor"
              />
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                style={{ color: "var(--sd-orange)" }}
                fill="currentColor"
                clipPath={`url(#half-${i})`}
              />
            </>
          ) : (
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          )}
        </svg>
      ))}
    </span>
  );
}

/* ─── bottom nav ────────────────────────────────────────── */

function BottomNav() {
  const [location] = useLocation();
  const items = [
    { href: "/",          label: "Home",       Icon: Home },
    { href: "/catalog",   label: "Categories", Icon: LayoutGrid },
    { href: "/cart",      label: "Cart",       Icon: ShoppingCart },
    { href: "/wishlist",  label: "Wishlist",   Icon: Heart },
    { href: "/profile",   label: "Profile",    Icon: User },
  ] as const;

  return (
    <nav className="bottom-nav md:hidden" aria-label="Bottom navigation">
      {items.map(({ href, label, Icon }) => {
        const active =
          href === "/"
            ? location === "/"
            : location === href || location.startsWith(href);
        return (
          <Link key={href} href={href}>
            <button
              type="button"
              className="bottom-nav-item"
              data-active={active ? "true" : "false"}
              aria-label={label}
            >
              <span className="bnav-icon">
                <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 1.8} />
              </span>
              <span className="bnav-label">{label}</span>
            </button>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── hero banner ───────────────────────────────────────── */

function HeroBanner({ heroImageUrl }: { heroImageUrl: string | null }) {
  const [dot, setDot] = useState(0);
  return (
    <div className="hero-banner-mobile mx-0">
      {/* Soft abstract background shapes */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 10% 120%, rgba(251,59,0,0.10) 0%, transparent 70%), " +
            "radial-gradient(ellipse 50% 60% at 90% -10%, rgba(251,59,0,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative flex items-stretch min-h-[9.5rem]">
        {/* Left: text */}
        <div className="flex-1 flex flex-col justify-center px-5 py-5 min-w-0">
          <p
            className="text-[0.78rem] font-extrabold leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Everything your
            <br />
            home needs,
            <br />
            <span style={{ color: "var(--sd-orange)" }}>beautifully</span>
            <br />
            <span style={{ color: "var(--sd-orange)" }}>considered.</span>
          </p>
          <Link href="/catalog" className="mt-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[0.7rem] font-bold text-white"
              style={{ background: "var(--text-primary)" }}
            >
              Shop now <ChevronRight className="h-3 w-3" />
            </button>
          </Link>
          {/* Carousel dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setDot(i)}
                className="rounded-full transition-all"
                style={{
                  width:  dot === i ? "1.25rem" : "0.375rem",
                  height: "0.375rem",
                  background: dot === i ? "var(--sd-orange)" : "var(--border-2)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: product image */}
        <div className="w-[45%] shrink-0 relative overflow-hidden flex items-end justify-center">
          {/* Soft peach glow blob behind product */}
          <div
            className="pointer-events-none absolute bottom-0 right-0 left-0 h-full"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 70% at 50% 100%, rgba(251,59,0,0.09) 0%, transparent 70%)",
            }}
          />
          {heroImageUrl ? (
            <img
              src={heroImageUrl}
              alt="Featured product"
              className="relative z-10 w-full h-full object-contain object-bottom"
              style={{ maxHeight: "11rem" }}
              loading="eager"
            />
          ) : (
            <div
              className="relative z-10 flex items-center justify-center w-full h-full"
              style={{ minHeight: "9rem" }}
            >
              <ShoppingBag
                className="h-16 w-16 opacity-20"
                style={{ color: "var(--sd-orange)" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── main catalog page ─────────────────────────────────── */

export default function Catalog() {
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();
  const initial = parseSearch(rawSearch);

  const [searchInput,  setSearchInput]  = useState(initial.search);
  const [categoryId,   setCategoryId]   = useState<number | undefined>(initial.categoryId);
  const [sort,         setSort]         = useState<SortValue>(initial.sort);
  const [minPrice,     setMinPrice]     = useState("");
  const [maxPrice,     setMaxPrice]     = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [gridView,     setGridView]     = useState(false); // default list on mobile

  useEffect(() => {
    const next = parseSearch(rawSearch);
    setSearchInput(next.search);
    setCategoryId(next.categoryId);
    setSort(next.sort);
  }, [rawSearch]);

  /* ── data ── */
  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
  });

  const params: StoreProductsParams = {
    search:     searchInput.trim() || undefined,
    categoryId,
    sort,
    minPrice:   minPrice ? Number(minPrice) : undefined,
    maxPrice:   maxPrice ? Number(maxPrice) : undefined,
  };
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["store-products", params],
    queryFn:  () => fetchProducts(params),
  });

  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    return products.filter((p) => {
      const price = effectivePrice(p.price, p.discountPercent);
      return (
        (min === undefined || price >= min) &&
        (max === undefined || price <= max)
      );
    });
  }, [products, minPrice, maxPrice]);

  /* Hero: pick first product whose name matches a blender/vitamix keyword,
     otherwise fall back to first product with a photo */
  const heroProduct = useMemo(() => {
    const byKeyword = products.find((p) =>
      HERO_PRODUCT_KEYWORDS.some((kw) => p.name.toLowerCase().includes(kw)),
    );
    return byKeyword ?? products.find((p) => p.photoUrl) ?? null;
  }, [products]);

  const activeCategoryName = categories.find((c) => c.id === categoryId)?.name;
  const hasFilters = Boolean(
    searchInput || categoryId || minPrice || maxPrice || sort !== "newest",
  );

  /* ── url helpers ── */
  function updateUrl(
    overrides: Partial<{ search: string; cat: number | undefined; s: SortValue }> = {},
  ) {
    const query  = new URLSearchParams();
    const search = overrides.search ?? searchInput.trim();
    const cat    = overrides.cat !== undefined ? overrides.cat : categoryId;
    const ns     = overrides.s ?? sort;
    if (search) query.set("search", search);
    if (cat)    query.set("categoryId", String(cat));
    if (ns !== "newest") query.set("sort", ns);
    setLocation(`/catalog${query.toString() ? `?${query}` : ""}`);
  }

  function clearAll() {
    setSearchInput("");
    setCategoryId(undefined);
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setLocation("/catalog");
  }

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    setSidebarOpen(false);
    updateUrl({ cat: id });
  }

  /* ── visible categories in the icon row (All + up to 4 + More) ── */
  const visibleCats = categories.slice(0, 4);
  const hasMore     = categories.length > 4;

  /* ─────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< md)
          ════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-screen pb-20">
        {/* ── Search bar ── */}
        <div className="px-4 pt-3 pb-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateUrl();
            }}
          >
            <label className="mobile-search">
              <Search
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--text-faint)" }}
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="flex-1 bg-transparent outline-none text-[0.82rem]"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Filters"
                className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg transition-colors"
                style={{
                  border: "1.5px solid var(--border-2)",
                  background: "var(--surface-3)",
                  color: "var(--text-subtle)",
                }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </label>
          </form>
        </div>

        {/* ── Breadcrumb ── */}
        <div className="px-4 pb-2">
          <p
            className="text-[0.62rem] font-bold tracking-[0.18em] uppercase"
            style={{ color: "var(--text-subtle)" }}
          >
            <Link href="/" className="hover:underline" style={{ color: "var(--text-subtle)" }}>
              HOME
            </Link>
            {" "}
            <span style={{ color: "var(--text-faint)" }}>/</span>
            {" "}
            <span style={{ color: "var(--text-muted)" }}>
              {activeCategoryName ? activeCategoryName.toUpperCase() : "COLLECTIONS"}
            </span>
          </p>
        </div>

        {/* ── Hero banner ── */}
        <div className="px-4 pb-3">
          <HeroBanner heroImageUrl={heroProduct?.photoUrl ?? null} />
        </div>

        {/* ── Category icon shortcuts ── */}
        <div
          className="px-4 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex items-start gap-3 w-max">
            {/* All */}
            <button
              type="button"
              className="cat-icon-btn"
              data-active={!categoryId ? "true" : "false"}
              onClick={() => selectCategory(undefined)}
              aria-label="All products"
            >
              <span className="cat-icon-circle">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span className="cat-icon-label">All</span>
            </button>

            {/* Dynamic categories */}
            {visibleCats.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="cat-icon-btn"
                  data-active={categoryId === cat.id ? "true" : "false"}
                  onClick={() => selectCategory(cat.id)}
                  aria-label={cat.name}
                >
                  <span className="cat-icon-circle">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="cat-icon-label">{cat.name.split(" ")[0]}</span>
                </button>
              );
            })}

            {/* More */}
            {hasMore && (
              <button
                type="button"
                className="cat-icon-btn"
                data-active="false"
                onClick={() => setSidebarOpen(true)}
                aria-label="More categories"
              >
                <span className="cat-icon-circle">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
                <span className="cat-icon-label">More</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Products header ── */}
        <div className="px-4 pb-3 flex items-end justify-between gap-2">
          <div>
            <h2
              className="text-[1.15rem] font-extrabold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {activeCategoryName ?? "All products"}
            </h2>
            <p
              className="text-[0.72rem] mt-0.5"
              style={{ color: "var(--text-subtle)" }}
            >
              {isLoading
                ? "Loading products…"
                : `${filtered.length} piece${filtered.length !== 1 ? "s" : ""} to explore`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Grid / List toggle */}
            <button
              type="button"
              onClick={() => setGridView(true)}
              aria-label="Grid view"
              className="h-7 w-7 flex items-center justify-center rounded-lg border transition-colors"
              style={{
                borderColor: gridView ? "var(--sd-orange)" : "var(--border-2)",
                color:       gridView ? "var(--sd-orange)" : "var(--text-subtle)",
                background:  gridView ? "var(--sd-orange-glow)" : "var(--surface-2)",
              }}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setGridView(false)}
              aria-label="List view"
              className="h-7 w-7 flex items-center justify-center rounded-lg border transition-colors"
              style={{
                borderColor: !gridView ? "var(--sd-orange)" : "var(--border-2)",
                color:       !gridView ? "var(--sd-orange)" : "var(--text-subtle)",
                background:  !gridView ? "var(--sd-orange-glow)" : "var(--surface-2)",
              }}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => {
                  const next = e.target.value as SortValue;
                  setSort(next);
                  updateUrl({ s: next });
                }}
                aria-label="Sort products"
                className="appearance-none pl-2.5 pr-6 h-7 text-[0.68rem] font-semibold rounded-lg border cursor-pointer outline-none"
                style={{
                  borderColor: "var(--border-2)",
                  background:  "var(--surface-2)",
                  color:       "var(--text-primary)",
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3"
                style={{ color: "var(--text-faint)" }}
              />
            </div>
          </div>
        </div>

        {/* ── Product list ── */}
        <div className="px-4 flex flex-col gap-3">
          {isLoading ? (
            /* Skeleton cards */
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="mobile-product-card animate-pulse"
                style={{ height: "8rem" }}
              >
                <div
                  className="shrink-0"
                  style={{
                    width: "8rem",
                    background: "var(--surface-3)",
                    borderRadius: "1.25rem 0 0 1.25rem",
                  }}
                />
                <div className="flex-1 p-4 space-y-2">
                  <div
                    className="h-2.5 rounded-full w-1/3"
                    style={{ background: "var(--surface-3)" }}
                  />
                  <div
                    className="h-3.5 rounded-full w-3/4"
                    style={{ background: "var(--surface-3)" }}
                  />
                  <div
                    className="h-3 rounded-full w-1/2"
                    style={{ background: "var(--surface-3)" }}
                  />
                </div>
              </div>
            ))
          ) : isError ? (
            <div
              className="py-16 text-center text-sm"
              style={{ color: "var(--color-red)" }}
            >
              Unable to load products. Please try again.
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Heart
                className="h-8 w-8 mx-auto mb-3"
                style={{ color: "var(--border-2)" }}
              />
              <p
                className="font-bold text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                No products found
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-subtle)" }}
              >
                Try adjusting your search or filters.
              </p>
              <button
                type="button"
                className="btn-ghost mt-4 text-xs"
                onClick={clearAll}
              >
                Clear filters
              </button>
            </div>
          ) : gridView ? (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            filtered.map((p) => (
              <ProductCard key={p.id} product={p} listView />
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (≥ md) — existing design preserved
          ════════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] mb-5"
          style={{ color: "var(--text-subtle)" }}>
          <span>
            Home{" "}
            <span className="mx-2" style={{ color: "var(--text-muted)" }}>/</span>
            Collections
          </span>
          <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>
            ShopDesk / 2026
          </span>
        </div>

        {/* Desktop hero banner */}
        <section className="collection-banner mb-7">
          <div className="relative z-10 max-w-md px-6 sm:px-10 py-7 sm:py-8">
            <p
              className="text-[10px] uppercase tracking-[0.18em] font-bold mb-2"
              style={{ color: "var(--sd-orange)" }}
            >
              The ShopDesk collection
            </p>
            <h1
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Everything your home needs,
              <br />
              <span style={{ color: "var(--sd-orange)" }}>beautifully considered.</span>
            </h1>
            <p
              className="mt-3 text-xs max-w-sm leading-relaxed"
              style={{ color: "var(--text-subtle)" }}
            >
              Discover reliable appliances chosen for everyday living, from kitchen
              essentials to smart home upgrades.
            </p>
          </div>
        </section>

        {/* Desktop filter pills */}
        <div className="flex flex-wrap items-center gap-2 mb-7">
          <button
            type="button"
            className="filter-pill"
            onClick={() => setSidebarOpen(true)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
          </button>
          <button
            type="button"
            className="filter-pill"
            data-active={!categoryId ? "true" : "false"}
            onClick={() => selectCategory(undefined)}
          >
            All products
          </button>
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="filter-pill"
              data-active={cat.id === categoryId ? "true" : "false"}
              onClick={() => selectCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
          <div className="relative ml-auto">
            <select
              value={sort}
              onChange={(e) => {
                const next = e.target.value as SortValue;
                setSort(next);
                updateUrl({ s: next });
              }}
              className="filter-pill appearance-none pr-8 cursor-pointer"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3"
              style={{ color: "var(--text-subtle)" }}
            />
          </div>
        </div>

        {/* Desktop main area with optional sidebar */}
        <div className="flex gap-8 items-start">
          {/* Sidebar */}
          <aside
            className={cn(
              "fixed inset-0 z-40 lg:static lg:opacity-100 lg:pointer-events-auto lg:bg-transparent lg:backdrop-blur-none lg:w-52 lg:shrink-0",
              sidebarOpen
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            )}
            style={
              sidebarOpen
                ? { background: "color-mix(in srgb, var(--surface) 70%, transparent)" }
                : {}
            }
          >
            <div
              className={cn(
                "absolute right-0 top-0 h-full w-72 border-l p-6 transition-transform",
                sidebarOpen ? "translate-x-0" : "translate-x-full",
                "lg:static lg:translate-x-0 lg:h-auto lg:w-auto lg:border-0 lg:p-0",
              )}
              style={{
                background:  "var(--surface-2)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-6 lg:hidden">
                <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <h2
                    className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Category
                  </h2>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => selectCategory(undefined)}
                      className="w-full flex items-center justify-between text-left text-xs py-1.5 transition-colors"
                      style={{
                        fontWeight: !categoryId ? 700 : 400,
                        color: !categoryId ? "var(--sd-orange)" : "var(--text-faint)",
                      }}
                    >
                      All products <span>{products.length}</span>
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectCategory(cat.id)}
                        className="w-full flex items-center justify-between text-left text-xs py-1.5 gap-2 transition-colors"
                        style={{
                          fontWeight: categoryId === cat.id ? 700 : 400,
                          color: categoryId === cat.id
                            ? "var(--sd-orange)"
                            : "var(--text-faint)",
                        }}
                      >
                        <span className="break-words leading-snug">{cat.name}</span>
                        <ChevronRight className="w-3 h-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h2
                    className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Price range
                  </h2>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="input-field h-8 px-2 text-xs"
                      min={0}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="input-field h-8 px-2 text-xs"
                      min={0}
                    />
                  </div>
                </div>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--sd-orange)" }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Product grid / list */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2
                  className="font-display text-2xl font-extrabold tracking-[-0.04em]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {activeCategoryName ?? "All products"}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
                  {isLoading
                    ? "Curating your selection…"
                    : `${filtered.length} pieces to explore`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateUrl();
                  }}
                  className="relative hidden sm:block"
                >
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    style={{ color: "var(--text-subtle)" }}
                  />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search"
                    className="input-field h-8 w-36 pl-8 text-xs"
                  />
                </form>
                <button
                  type="button"
                  onClick={() => setGridView(true)}
                  className="theme-toggle"
                  aria-label="Grid view"
                  style={
                    gridView ? { color: "var(--sd-orange)", borderColor: "var(--sd-orange)" } : {}
                  }
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGridView(false)}
                  className="theme-toggle"
                  aria-label="List view"
                  style={
                    !gridView ? { color: "var(--sd-orange)", borderColor: "var(--sd-orange)" } : {}
                  }
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="quiet-card animate-pulse">
                    <div
                      className="aspect-[1.08/1]"
                      style={{ background: "var(--surface-3)" }}
                    />
                    <div className="p-4 space-y-2">
                      <div
                        className="h-3 rounded w-1/3"
                        style={{ background: "var(--surface-3)" }}
                      />
                      <div
                        className="h-4 rounded w-3/4"
                        style={{ background: "var(--surface-3)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div
                className="py-20 text-center text-sm"
                style={{ color: "var(--color-red)" }}
              >
                Unable to load products right now.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <Heart
                  className="w-8 h-8 mx-auto mb-3"
                  style={{ color: "var(--border-2)" }}
                />
                <p
                  className="font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  No products found
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
                  Try adjusting your search or filters.
                </p>
                <button
                  type="button"
                  className="btn-ghost mt-4 text-xs"
                  onClick={clearAll}
                >
                  Clear filters
                </button>
              </div>
            ) : gridView ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} listView />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Mobile filter sidebar ── */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed inset-y-0 right-0 z-50 w-72 flex flex-col border-l overflow-y-auto"
            style={{
              background:  "var(--surface-2)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                Filters
              </h2>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-5 w-5" style={{ color: "var(--text-subtle)" }} />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-6">
              <div>
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
                  style={{ color: "var(--text-subtle)" }}
                >
                  Category
                </h3>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => selectCategory(undefined)}
                    className="w-full flex items-center justify-between text-left text-sm py-2"
                    style={{
                      fontWeight: !categoryId ? 700 : 400,
                      color: !categoryId ? "var(--sd-orange)" : "var(--text-muted)",
                    }}
                  >
                    All products <span className="text-xs">{products.length}</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat.id)}
                      className="w-full flex items-center justify-between text-left text-sm py-2 gap-2"
                      style={{
                        fontWeight: categoryId === cat.id ? 700 : 400,
                        color: categoryId === cat.id ? "var(--sd-orange)" : "var(--text-muted)",
                      }}
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3
                  className="text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
                  style={{ color: "var(--text-subtle)" }}
                >
                  Price range
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="input-field h-9 px-3 text-sm"
                    min={0}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="input-field h-9 px-3 text-sm"
                    min={0}
                  />
                </div>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--sd-orange)" }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Bottom navigation (mobile only) ── */}
      <BottomNav />
    </>
  );
}
