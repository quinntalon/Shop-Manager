import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Grid2X2,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { fetchCategories, fetchProducts, type StoreProductsParams } from "@/lib/api";
import ProductCard from "@/components/product-card";
import { effectivePrice, formatPrice } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "New arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function parseSearch(qs: string) {
  const p = new URLSearchParams(qs);
  return {
    search: p.get("search") ?? "",
    categoryId: p.get("categoryId") ? Number(p.get("categoryId")) : undefined,
    sort: (p.get("sort") as SortValue) ?? "newest",
    newArrivals: p.get("new") === "1",
  };
}

export default function Catalog() {
  const rawSearch = useSearch();
  const [, setLocation] = useLocation();
  const initial = parseSearch(rawSearch);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [categoryId, setCategoryId] = useState<number | undefined>(initial.categoryId);
  const [sort, setSort] = useState<SortValue>(initial.sort);
  const [newArrivals, setNewArrivals] = useState(initial.newArrivals);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gridView, setGridView] = useState(true);

  useEffect(() => {
    const next = parseSearch(rawSearch);
    setSearchInput(next.search);
    setCategoryId(next.categoryId);
    setSort(next.sort);
    setNewArrivals(next.newArrivals);
  }, [rawSearch]);

  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
  });

  const params: StoreProductsParams = {
    search: searchInput.trim() || undefined,
    categoryId,
    sort,
    newArrivals,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  };
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["store-products", params],
    queryFn: () => fetchProducts(params),
  });
  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    return products.filter((p) => {
      const price = effectivePrice(p.price, p.discountPercent);
      return (min === undefined || price >= min) && (max === undefined || price <= max);
    });
  }, [products, minPrice, maxPrice]);

  const activeCategoryName = categories.find((c) => c.id === categoryId)?.name;
  const hasFilters = Boolean(searchInput || categoryId || minPrice || maxPrice || sort !== "newest");

  function updateUrl(overrides: Partial<{ search: string; cat: number | undefined; s: SortValue }> = {}) {
    const query = new URLSearchParams();
    const search = overrides.search ?? searchInput.trim();
    const cat = overrides.cat !== undefined ? overrides.cat : categoryId;
    const nextSort = overrides.s ?? sort;
    if (search) query.set("search", search);
    if (cat) query.set("categoryId", String(cat));
    if (nextSort !== "newest") query.set("sort", nextSort);
    if (newArrivals) query.set("new", "1");
    setLocation(`/catalog${query.toString() ? `?${query}` : ""}`);
  }

  function clearAll() {
    setSearchInput("");
    setCategoryId(undefined);
    setSort("newest");
    setNewArrivals(false);
    setMinPrice("");
    setMaxPrice("");
    setLocation("/catalog");
  }

  function selectCategory(id: number | undefined) {
    setCategoryId(id);
    setSidebarOpen(false);
    updateUrl({ cat: id });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
       <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-5">
         <span>Home <span className="mx-2 text-slate-300">/</span> Categories</span>
        <span className="hidden sm:inline">ShopDesk / 2026</span>
      </div>

      <section className="collection-banner mb-7">
        <div className="relative z-10 max-w-md px-6 sm:px-10 py-7 sm:py-8">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber mb-2">
             ShopDesk categories
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-[-0.04em] text-slate-50 leading-tight">
            Everything your home needs,
            <br />
             <span className="text-amber">made for everyday living.</span>
          </h1>
          <p className="mt-3 text-xs text-slate-400 max-w-sm leading-relaxed">
             Explore live products synced directly from your ShopDesk inventory.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 mb-7">
        <button type="button" className="filter-pill" onClick={() => setSidebarOpen(true)}>
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
        <button type="button" className="filter-pill" data-active={!categoryId} onClick={() => selectCategory(undefined)}>
          All products
        </button>
        {categories.slice(0, 5).map((category) => (
          <button
            type="button"
            key={category.id}
            className="filter-pill"
            data-active={category.id === categoryId}
            onClick={() => selectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
        <div className="relative ml-auto">
          <select
            value={sort}
            onChange={(event) => {
              const next = event.target.value as SortValue;
              setSort(next);
              updateUrl({ s: next });
            }}
            className="filter-pill appearance-none pr-8 cursor-pointer"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        </div>
      </div>

       <div className="flex gap-8 items-start">
         <main className="flex-1 min-w-0">
           <div className="flex items-center justify-between gap-3 mb-4">
             <div>
               <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-slate-50">
                 {newArrivals ? "New Arrivals" : activeCategoryName ?? "All products"}
               </h2>
               <p className="text-xs text-slate-400 mt-1">{isLoading ? "Curating your selection…" : `${filtered.length} pieces to explore`}</p>
             </div>
             <div className="flex items-center gap-1">
               <form onSubmit={(event) => { event.preventDefault(); updateUrl(); }} className="relative hidden sm:block">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search" className="input-field h-8 w-36 pl-8 text-xs" />
               </form>
               <button type="button" onClick={() => setGridView(true)} className={`theme-toggle ${gridView ? "text-amber" : ""}`} aria-label="Grid view"><Grid2X2 className="w-4 h-4" /></button>
               <button type="button" onClick={() => setGridView(false)} className={`theme-toggle ${!gridView ? "text-amber" : ""}`} aria-label="List view"><List className="w-4 h-4" /></button>
             </div>
           </div>

           {isLoading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="quiet-card animate-pulse"><div className="aspect-[1.08/1] bg-surface-3" /><div className="p-4 space-y-2"><div className="h-3 bg-surface-3 rounded w-1/3" /><div className="h-4 bg-surface-3 rounded w-3/4" /><div className="h-3 bg-surface-3 rounded w-1/2" /></div></div>)}</div>
           ) : isError ? (
             <div className="py-20 text-center text-sm text-red-500">Unable to load products right now.</div>
           ) : filtered.length === 0 ? (
             <div className="py-20 text-center"><Heart className="w-8 h-8 mx-auto text-slate-300 mb-3" /><p className="font-bold text-slate-100">No products found</p><p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p><button type="button" className="btn-ghost mt-4 text-xs" onClick={clearAll}>Clear filters</button></div>
           ) : gridView ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div>
           ) : (
             <div className="space-y-3">{filtered.map((product) => <ProductCard key={product.id} product={product} listView />)}</div>
           )}
         </main>
         <aside className={`fixed inset-0 z-40 bg-surface/70 backdrop-blur-sm ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} lg:static lg:opacity-100 lg:pointer-events-auto lg:bg-transparent lg:backdrop-blur-none lg:w-48 lg:shrink-0 lg:order-last`}>
          <div className={`absolute right-0 top-0 h-full w-72 bg-surface-2 border-l border-border p-6 transition-transform ${sidebarOpen ? "translate-x-0" : "translate-x-full"} lg:static lg:translate-x-0 lg:h-auto lg:w-auto lg:border-0 lg:p-0`}>
            <div className="flex items-center justify-between mb-6 lg:hidden">
              <h2 className="font-bold text-slate-100">Filters</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close filters"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Category</h2>
                <div className="space-y-1">
                  <button type="button" onClick={() => selectCategory(undefined)} className={`w-full flex items-center justify-between text-left text-xs py-1.5 ${!categoryId ? "font-bold text-amber" : "text-slate-500 hover:text-slate-100"}`}>All products <span>{products.length}</span></button>
                  {categories.map((category) => (
                    <button type="button" key={category.id} onClick={() => selectCategory(category.id)} className={`w-full flex items-center justify-between text-left text-xs py-1.5 ${categoryId === category.id ? "font-bold text-amber" : "text-slate-500 hover:text-slate-100"}`}>
                      <span className="truncate pr-2">{category.name}</span><ChevronRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">Price range</h2>
                <div className="flex gap-2">
                  <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="input-field h-8 px-2 text-xs" min={0} />
                  <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="input-field h-8 px-2 text-xs" min={0} />
                </div>
              </div>
              {hasFilters && <button type="button" onClick={clearAll} className="text-xs font-semibold text-amber hover:underline">Clear all filters</button>}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}