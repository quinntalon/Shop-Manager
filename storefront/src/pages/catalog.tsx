import { useState, useEffect, useMemo } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, ChevronDown, LayoutGrid, LayoutList } from "lucide-react";
import { fetchCategories, fetchProducts, type StoreProductsParams } from "@/lib/api";
import ProductCard from "@/components/product-card";
import { effectivePrice, formatPrice } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSearch(qs: string) {
  const p = new URLSearchParams(qs);
  return {
    search: p.get("search") ?? "",
    categoryId: p.get("categoryId") ? Number(p.get("categoryId")) : undefined,
    sort: (p.get("sort") as SortValue) ?? "newest",
  };
}

export default function Catalog() {
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();

  const init = parseSearch(rawSearch);
  const [searchInput, setSearchInput] = useState(init.search);
  const [categoryId, setCategoryId] = useState<number | undefined>(init.categoryId);
  const [sort, setSort] = useState<SortValue>(init.sort);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gridView, setGridView] = useState(true);

  // sync URL → state when URL changes externally
  useEffect(() => {
    const p = parseSearch(rawSearch);
    setSearchInput(p.search);
    setCategoryId(p.categoryId);
    setSort(p.sort);
  }, [rawSearch]);

  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
  });

  const params: StoreProductsParams = {
    search: searchInput.trim() || undefined,
    categoryId,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  };

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["store-products", params],
    queryFn: () => fetchProducts(params),
  });

  // client-side price filter (server handles it too if implemented)
  const filtered = useMemo(() => {
    let list = [...products];
    const mn = minPrice ? Number(minPrice) : undefined;
    const mx = maxPrice ? Number(maxPrice) : undefined;
    if (mn != null || mx != null) {
      list = list.filter((p) => {
        const price = effectivePrice(p.price, p.discountPercent);
        if (mn != null && price < mn) return false;
        if (mx != null && price > mx) return false;
        return true;
      });
    }
    return list;
  }, [products, minPrice, maxPrice]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUrl();
  }

  function updateUrl(overrides: Partial<{ search: string; cat: number | undefined; s: SortValue }> = {}) {
    const q = new URLSearchParams();
    const s = overrides.search ?? searchInput.trim();
    const c = overrides.cat !== undefined ? overrides.cat : categoryId;
    const so = overrides.s ?? sort;
    if (s) q.set("search", s);
    if (c) q.set("categoryId", String(c));
    if (so !== "newest") q.set("sort", so);
    const qs = q.toString();
    setLocation(`/catalog${qs ? `?${qs}` : ""}`);
  }

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    updateUrl({ cat: id });
    setSidebarOpen(false);
  }

  function selectSort(v: SortValue) {
    setSort(v);
    updateUrl({ s: v });
  }

  function clearAll() {
    setSearchInput("");
    setCategoryId(undefined);
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setLocation("/catalog");
  }

  const hasFilters = !!(searchInput || categoryId || minPrice || maxPrice || sort !== "newest");
  const activeCategoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <h1 className="font-display text-4xl font-bold text-slate-50">
          {activeCategoryName ?? "All Appliances"}
        </h1>
        <p className="text-slate-500 text-sm">
          {isLoading ? "Loading…" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""} found`}
          {hasFilters && " · "}
          {hasFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="text-amber hover:underline"
            >
              Clear all filters
            </button>
          )}
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar ── */}
        <aside
          className={`
            fixed inset-0 z-40 bg-surface/80 backdrop-blur-sm transition-opacity
            lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none
            ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto"}
          `}
          onClick={(e) => { if (e.target === e.currentTarget) setSidebarOpen(false); }}
        >
          <div
            className={`
              absolute right-0 top-0 h-full w-72 bg-surface-2 border-l border-border p-6 overflow-y-auto
              transition-transform
              lg:static lg:w-56 lg:h-auto lg:bg-transparent lg:border-none lg:p-0 lg:translate-x-0 lg:shrink-0
              ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            `}
          >
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="font-semibold text-slate-200">Filters</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Category</h3>
              <button
                type="button"
                onClick={() => selectCategory(undefined)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !categoryId
                    ? "bg-amber-glow text-amber font-semibold border border-amber/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-3"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    categoryId === cat.id
                      ? "bg-amber-glow text-amber font-semibold border border-amber/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-surface-3"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Price range */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Price Range (GH₵)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="input-field h-9 text-sm w-full"
                  min={0}
                />
                <span className="text-slate-600 shrink-0">—</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="input-field h-9 text-sm w-full"
                  min={0}
                />
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="w-full btn-ghost text-sm py-2 text-red-400 border-red-900/30 hover:border-red-500/40 hover:text-red-400 hover:bg-red-950/20"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input-field pl-9 h-9 text-sm"
                />
              </div>
            </form>

            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => selectSort(e.target.value as SortValue)}
                className="input-field h-9 pr-8 text-sm appearance-none cursor-pointer"
                style={{ minWidth: "160px" }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Grid/list toggle */}
            <div className="flex items-center gap-1 bg-surface-3 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setGridView(true)}
                className={`p-1.5 rounded-md transition-colors ${gridView ? "bg-amber text-surface" : "text-slate-500 hover:text-slate-300"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setGridView(false)}
                className={`p-1.5 rounded-md transition-colors ${!gridView ? "bg-amber text-surface" : "text-slate-500 hover:text-slate-300"}`}
                title="List view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="btn-ghost h-9 px-3 text-sm lg:hidden"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {searchInput && (
                <span className="badge badge-slate flex items-center gap-1.5">
                  "{searchInput}"
                  <button type="button" onClick={() => { setSearchInput(""); updateUrl({ search: "" }); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeCategoryName && (
                <span className="badge badge-amber flex items-center gap-1.5">
                  {activeCategoryName}
                  <button type="button" onClick={() => selectCategory(undefined)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="badge badge-slate flex items-center gap-1.5">
                  {minPrice ? formatPrice(Number(minPrice)) : "—"} – {maxPrice ? formatPrice(Number(maxPrice)) : "∞"}
                  <button type="button" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Products grid / list */}
          {isLoading ? (
            <div className={gridView ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5" : "space-y-3"}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  {gridView ? (
                    <>
                      <div className="aspect-square bg-surface-3" />
                      <div className="p-4 space-y-2">
                        <div className="h-2.5 bg-surface-3 rounded w-1/3" />
                        <div className="h-4 bg-surface-3 rounded w-3/4" />
                        <div className="h-5 bg-surface-3 rounded w-1/2" />
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 bg-surface-3 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-surface-3 rounded w-1/2" />
                        <div className="h-3 bg-surface-3 rounded w-3/4" />
                        <div className="h-5 bg-surface-3 rounded w-1/4" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-lg font-medium text-red-400">Failed to load products</p>
              <p className="text-sm mt-1">Please try again later.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-lg font-medium text-slate-300">No products found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters.</p>
              <button type="button" onClick={clearAll} className="btn-ghost mt-4 text-sm">
                Clear all filters
              </button>
            </div>
          ) : gridView ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => {
                const price = effectivePrice(p.price, p.discountPercent);
                const discounted = p.discountPercent > 0;
                return (
                  <a
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="card flex gap-4 p-4 hover:border-border-2 group"
                  >
                    <div className="w-24 h-24 rounded-xl bg-surface-3 overflow-hidden shrink-0">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-slate-600">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1 space-y-1">
                      {p.categoryName && (
                        <span className="text-xs text-amber font-semibold uppercase tracking-wide">{p.categoryName}</span>
                      )}
                      <h3 className="font-semibold text-slate-200 group-hover:text-amber transition-colors leading-snug line-clamp-1">
                        {p.name}
                      </h3>
                      {p.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-bold text-slate-50">{formatPrice(price)}</span>
                        {discounted && <span className="text-sm text-slate-500 line-through">{formatPrice(p.price)}</span>}
                        {discounted && <span className="badge badge-amber text-xs">{p.discountPercent}% off</span>}
                      </div>
                    </div>
                    <div className="self-center shrink-0">
                      <span className={`badge text-xs ${p.stock > 0 ? "badge-green" : "badge-red"}`}>
                        {p.stock > 0 ? "In stock" : "Out of stock"}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
