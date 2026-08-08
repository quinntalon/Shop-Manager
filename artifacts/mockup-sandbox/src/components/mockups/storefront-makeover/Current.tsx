import './_group.css';

import { ArrowRight, ChevronRight, Sparkles, Shield, Truck, RotateCcw, Zap } from 'lucide-react';

type Category = { id: number; name: string; description: string | null };
type Product = {
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
};

const categories: Category[] = [
  { id: 1, name: 'Refrigerators', description: 'French door, top mount, and smart cooling' },
  { id: 2, name: 'Washing Machines', description: 'Front load and top load laundry care' },
  { id: 3, name: 'Ovens', description: 'Built-in, gas, and electric cooking' },
  { id: 4, name: 'Air Conditioners', description: 'Split and portable cooling solutions' },
  { id: 5, name: 'Televisions', description: '4K smart TVs for every room' },
  { id: 6, name: 'Cookers', description: 'Gas cookers and induction options' },
];

const featuredProducts: Product[] = [
  { id: 101, name: 'Samsung 300L Double Door Refrigerator', sku: 'RF-300-SAM', description: 'No frost cooling with inverter efficiency.', photoUrl: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=900&q=80', price: 6999, discountPercent: 10, stock: 18, categoryId: 1, categoryName: 'Refrigerators' },
  { id: 102, name: 'LG 8kg Front Load Washer', sku: 'WM-8-LG', description: 'Quiet wash cycles with steam care.', photoUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80', price: 5299, discountPercent: 0, stock: 12, categoryId: 2, categoryName: 'Washing Machines' },
  { id: 103, name: 'Hisense 60cm Built-in Oven', sku: 'OV-60-HIS', description: 'Convection baking with digital controls.', photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80', price: 4499, discountPercent: 15, stock: 7, categoryId: 3, categoryName: 'Ovens' },
  { id: 104, name: 'Midea 1.5HP Inverter AC', sku: 'AC-15-MID', description: 'Fast cooling for medium-sized rooms.', photoUrl: 'https://images.unsplash.com/photo-1581091215367-59ab6b2f3da2?auto=format&fit=crop&w=900&q=80', price: 3899, discountPercent: 8, stock: 9, categoryId: 4, categoryName: 'Air Conditioners' },
  { id: 105, name: 'TCL 55" 4K Smart TV', sku: 'TV-55-TCL', description: 'High-contrast panel with streaming apps.', photoUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=80', price: 5999, discountPercent: 12, stock: 14, categoryId: 5, categoryName: 'Televisions' },
  { id: 106, name: 'Vitamix 2L Countertop Blender', sku: 'BL-2-VTM', description: 'High-speed blending for daily prep.', photoUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', price: 1599, discountPercent: 5, stock: 22, categoryId: 6, categoryName: 'Cookers' },
  { id: 107, name: 'Scanfrost Chest Freezer', sku: 'FRZ-250-SCF', description: 'Reliable storage for bulk groceries.', photoUrl: 'https://images.unsplash.com/photo-1571179610095-9e5c0c6f08f9?auto=format&fit=crop&w=900&q=80', price: 4299, discountPercent: 7, stock: 11, categoryId: 1, categoryName: 'Refrigerators' },
  { id: 108, name: 'Nasco 5-Burner Gas Cooker', sku: 'CK-5-NAS', description: 'Tempered glass top with oven combo.', photoUrl: 'https://images.unsplash.com/photo-1585659727765-fc1c48c0f2f5?auto=format&fit=crop&w=900&q=80', price: 4799, discountPercent: 0, stock: 15, categoryId: 6, categoryName: 'Cookers' },
];

const saleProducts = featuredProducts.filter((p) => p.discountPercent > 0).slice(0, 4);

const perks = [
  { icon: Truck, title: 'Free Delivery', desc: 'On orders above GH₵500' },
  { icon: Shield, title: '2-Year Warranty', desc: 'All appliances covered' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
  { icon: Zap, title: 'Expert Support', desc: 'Certified technicians on call' },
];

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(amount);
}

function getFinalPrice(price: number, discountPercent: number) {
  return discountPercent > 0 ? price * (1 - discountPercent / 100) : price;
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('refrigerator') || lower.includes('fridge') || lower.includes('freezer')) return '🧊';
  if (lower.includes('washing') || lower.includes('washer')) return '🫧';
  if (lower.includes('oven')) return '🔥';
  if (lower.includes('air')) return '❄️';
  if (lower.includes('tv') || lower.includes('television')) return '📺';
  if (lower.includes('blender')) return '🥤';
  if (lower.includes('cooker')) return '🍳';
  return '📦';
}

function Card({ product }: { product: Product }) {
  const discounted = product.discountPercent > 0;
  const finalPrice = getFinalPrice(product.price, product.discountPercent);
  const inStock = product.stock > 0;
  return (
    <a href={`/products/${product.id}`} className="group block card">
      <div className="relative aspect-square bg-surface-3 overflow-hidden">
        {product.photoUrl ? (
          <img src={product.photoUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">No image</div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discounted && <span className="badge badge-amber text-xs">{product.discountPercent}% off</span>}
          {!inStock && <span className="badge badge-red text-xs">Out of stock</span>}
        </div>
        <div className="absolute inset-0 bg-surface/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="flex items-center gap-2 btn-primary text-sm shadow-xl"><span>View Details</span></span>
        </div>
      </div>
      <div className="p-4 space-y-1.5">
        {product.categoryName && <span className="text-xs font-semibold text-amber tracking-wide uppercase">{product.categoryName}</span>}
        <h3 className="font-semibold text-slate-100 leading-snug line-clamp-2 group-hover:text-amber transition-colors">{product.name}</h3>
        <div className="flex items-end gap-2 pt-1">
          <span className="text-lg font-bold text-slate-50">{formatPrice(finalPrice)}</span>
          {discounted && <span className="text-sm text-slate-500 line-through pb-0.5">{formatPrice(product.price)}</span>}
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className={`badge text-xs ${inStock ? 'badge-green' : 'badge-red'}`}>{inStock ? `${product.stock} in stock` : 'Out of stock'}</span>
        </div>
      </div>
    </a>
  );
}

export function Current() {
  return (
    <div className="overflow-x-hidden min-h-screen">
      <section className="relative min-h-[88vh] flex items-center">
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(var(--color-slate-400) 1px, transparent 1px), linear-gradient(90deg, var(--color-slate-400) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute right-0 top-0 w-[700px] h-[700px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at 70% 30%, var(--color-amber) 0%, transparent 65%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <span className="section-label"><Sparkles className="w-3.5 h-3.5" />New arrivals just dropped</span>
            <h1 className="font-display text-5xl sm:text-6xl xl:text-7xl font-bold text-slate-50 leading-[1.05] tracking-tight">Power Your<br /><span className="text-amber">Home</span> with<br />Precision.</h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-md">Premium appliances built to last. Browse hundreds of products — from smart refrigerators to energy-efficient ovens — all in one place.</p>
            <div className="flex flex-wrap gap-3">
              <a href="/catalog" className="btn-primary text-base px-6 py-3">Shop Now <ArrowRight className="w-4.5 h-4.5" /></a>
              <a href="/catalog?sort=newest" className="btn-ghost text-base px-6 py-3">New Arrivals</a>
            </div>
            <div className="flex flex-wrap gap-8 pt-2">
              {[
                { val: `${featuredProducts.length + 30}+`, label: 'Products' },
                { val: `${categories.length || 12}`, label: 'Categories' },
                { val: '2yr', label: 'Warranty' },
              ].map((s) => <div key={s.label}><div className="text-2xl font-bold font-display text-amber">{s.val}</div><div className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</div></div>)}
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {categories.slice(0, 6).map((cat) => <button key={cat.id} type="button" className="group card p-5 text-left cursor-pointer hover:border-amber/40"><div className="text-3xl mb-3">{getCategoryIcon(cat.name)}</div><div className="font-semibold text-slate-200 group-hover:text-amber transition-colors text-sm">{cat.name}</div>{cat.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cat.description}</div>}<ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber transition-all group-hover:translate-x-1 mt-2" /></button>)}
          </div>
        </div>
      </section>
      <div className="glow-line" />
      <section className="bg-surface-2 border-b border-border"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">{perks.map(({ icon: Icon, title, desc }) => <div key={title} className="flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-amber-glow flex items-center justify-center shrink-0"><Icon className="w-4.5 h-4.5 text-amber" /></div><div><div className="text-sm font-semibold text-slate-200">{title}</div><div className="text-xs text-slate-500 mt-0.5">{desc}</div></div></div>)}</div></section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-center justify-between mb-8"><div className="space-y-1"><span className="section-label"><Sparkles className="w-3.5 h-3.5" />Latest stock</span><h2 className="font-display text-3xl font-bold text-slate-50">Featured Products</h2></div><a href="/catalog" className="btn-ghost hidden sm:flex">View all <ArrowRight className="w-4 h-4" /></a></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{featuredProducts.map((p) => <Card key={p.id} product={p} />)}</div>
      </section>
      {saleProducts.length > 0 && <section className="bg-surface-2 border-y border-border"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-20"><div className="flex items-center justify-between mb-8"><div className="space-y-1"><span className="section-label"><Zap className="w-3.5 h-3.5" />Limited time deals</span><h2 className="font-display text-3xl font-bold text-slate-50">On Sale Now</h2></div><a href="/catalog?sort=price_asc" className="btn-ghost hidden sm:flex">See all deals <ArrowRight className="w-4 h-4" /></a></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{saleProducts.map((p) => <Card key={p.id} product={p} />)}</div></div></section>}
      <section className="relative overflow-hidden bg-amber mx-4 sm:mx-6 mb-16 rounded-2xl"><div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(var(--color-surface) 1px, transparent 1px), linear-gradient(90deg, var(--color-surface) 1px, transparent 1px)', backgroundSize: '30px 30px' }} /><div className="relative max-w-3xl mx-auto px-8 py-14 text-center space-y-5"><h2 className="font-display text-3xl sm:text-4xl font-bold text-surface leading-tight">Ready to upgrade your home?</h2><p className="text-surface/70 text-lg">Explore our full catalog of premium appliances and find the perfect fit for every room.</p><a href="/catalog" className="inline-flex items-center gap-2 bg-surface text-amber font-bold px-7 py-3 rounded-xl hover:bg-surface-2 transition-colors text-base">Shop the Catalog <ArrowRight className="w-4.5 h-4.5" /></a></div></section>
    </div>
  );
}
