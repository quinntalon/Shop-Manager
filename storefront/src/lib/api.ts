const BASE = "/api/store";

export interface StoreCategory {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface StoreProduct {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  photoUrl: string | null;
  price: number;
  discountPercent: number;
  stock: number;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: string;
}

export interface StoreProductsParams {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
}

async function request<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchCategories(): Promise<StoreCategory[]> {
  return request<StoreCategory[]>(`${BASE}/categories`);
}

export function fetchProducts(params: StoreProductsParams = {}): Promise<StoreProduct[]> {
  const q = new URLSearchParams();
  if (params.search)     q.set("search",     params.search);
  if (params.categoryId) q.set("categoryId", String(params.categoryId));
  if (params.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  if (params.sort)       q.set("sort",       params.sort);
  const qs = q.toString();
  return request<StoreProduct[]>(`${BASE}/products${qs ? `?${qs}` : ""}`);
}

export function fetchProduct(id: number): Promise<StoreProduct> {
  return request<StoreProduct>(`${BASE}/products/${id}`);
}
