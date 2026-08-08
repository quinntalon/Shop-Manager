import "./_group.css";
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  Heart,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

const products = [
  { name: "Arctic French Door Refrigerator", category: "Kitchen / Cooling", price: "GH₵8,499", oldPrice: "GH₵9,200", tone: "blue", note: "Best seller" },
  { name: "ProWash Front Load Washer", category: "Laundry / Care", price: "GH₵4,299", oldPrice: "", tone: "warm", note: "New arrival" },
  { name: "Nova Smart TV 55” 4K", category: "Living / Entertainment", price: "GH₵5,799", oldPrice: "GH₵6,100", tone: "violet", note: "Limited offer" },
];

function PremiumProduct({ product, index }: { product: (typeof products)[number]; index: number }) {
  return (
    <div className="group overflow-hidden rounded-[20px] border border-white/10 bg-[#111827]/80 transition duration-300 hover:-translate-y-1 hover:border-blue-400/45 hover:bg-[#162033]">
      <div className={`product-image ${product.tone === "warm" ? "warm" : ""} relative flex aspect-[0.9] items-center justify-center overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${product.tone === "violet" ? "from-violet-500/10" : "from-blue-500/10"} to-transparent`} />
        <div className="device relative h-40 w-28 rounded-[22px] border border-white/20 bg-gradient-to-br from-slate-300/55 via-slate-700 to-slate-950">
          <div className="mx-auto mt-5 h-2 w-12 rounded-full bg-white/25" />
          <div className="mx-auto mt-7 h-14 w-16 rounded-xl border border-white/10 bg-black/30" />
          <div className="absolute -right-8 top-10 h-16 w-16 rounded-full border border-blue-300/20 bg-blue-400/10 blur-md" />
        </div>
        <div className="absolute left-4 top-4 flex items-center gap-2"><span className="rounded-full border border-blue-300/25 bg-blue-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-200">{product.note}</span></div>
        <button type="button" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-300 opacity-0 transition group-hover:opacity-100"><Heart size={14} /></button>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><span>0{index + 1}</span><span>View details <ArrowRight className="ml-1 inline" size={12} /></span></div>
      </div>
      <div className="space-y-2 p-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">{product.category}</div>
        <h3 className="max-w-[220px] text-sm font-bold leading-snug text-slate-100">{product.name}</h3>
        <div className="flex items-end gap-2 pt-2"><span className="text-xl font-extrabold tracking-tight text-white">{product.price}</span>{product.oldPrice && <span className="pb-0.5 text-xs text-slate-500 line-through">{product.oldPrice}</span>}</div>
        <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-emerald-300"><CircleCheck size={13} /> Ready to ship</div>
      </div>
    </div>
  );
}

export function PremiumShopDesk() {
  return (
    <div className="shopfront-preview overflow-x-hidden bg-[#0a1020] text-slate-100">
      <div className="border-b border-white/10 bg-[#0e1729] px-6 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Complimentary delivery on orders over GH₵500 <span className="mx-2 text-blue-400">·</span> Designed for better living</div>
      <header className="relative z-10 border-b border-white/10 bg-[#0a1020]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-8 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25"><Zap size={17} fill="currentColor" /></div>
            <div><div className="text-[15px] font-extrabold tracking-tight text-white">Shop<span className="text-blue-400">Desk</span></div><div className="text-[8px] font-bold uppercase tracking-[0.24em] text-slate-500">Curated living</div></div>
          </div>
          <nav className="hidden items-center gap-7 text-xs font-semibold text-slate-400 lg:flex"><span className="text-white">Home</span><span>Collections</span><span>New arrivals</span><span>Our promise</span></nav>
          <div className="ml-auto flex items-center gap-3"><div className="hidden h-10 w-52 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-500 md:flex"><Search size={14} /> Search the collection</div><button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300"><ShoppingBag size={16} /></button><button type="button" className="hidden rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 sm:block">Shop all</button></div>
        </div>
      </header>

      <main>
        <section className="premium-grid relative overflow-hidden">
          <div className="absolute -right-24 top-0 h-[620px] w-[620px] rounded-full bg-blue-500/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-indigo-500/8 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-28 lg:pt-28">
            <div className="max-w-xl">
              <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-300"><span className="h-px w-8 bg-blue-400" /> The ShopDesk edit <Sparkles size={13} /></div>
              <h1 className="display text-5xl font-extrabold leading-[0.98] text-white sm:text-7xl">The art of a<br /><span className="text-blue-400">better home.</span></h1>
              <p className="mt-7 max-w-md text-[15px] leading-7 text-slate-400">A considered collection of appliances that make everyday living feel effortless. Beautifully designed. Expertly supported.</p>
              <div className="mt-9 flex flex-wrap gap-3"><span className="inline-flex items-center gap-3 rounded-xl bg-blue-500 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/20">Explore the collection <ArrowRight size={16} /></span><span className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3.5 text-sm font-semibold text-slate-200">Why ShopDesk <ChevronRight size={16} /></span></div>
              <div className="mt-12 flex items-center gap-5 border-t border-white/10 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"><span className="flex items-center gap-2"><ShieldCheck size={14} className="text-blue-400" /> 2-year care</span><span className="flex items-center gap-2"><Truck size={14} className="text-blue-400" /> White-glove delivery</span></div>
            </div>
            <div className="relative hidden min-h-[420px] lg:block">
              <div className="absolute right-0 top-0 h-[385px] w-[430px] overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-[#243858] via-[#15233c] to-[#0e1729] shadow-2xl shadow-blue-950/40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(96,165,250,0.32),transparent_38%)]" />
                <div className="absolute bottom-0 left-10 right-10 h-44 rounded-t-[110px] border border-white/15 bg-gradient-to-b from-slate-300/30 to-slate-800/30" />
                <div className="absolute bottom-28 left-1/2 h-32 w-24 -translate-x-1/2 rounded-2xl border border-white/20 bg-gradient-to-br from-slate-200/60 via-slate-700 to-slate-950 shadow-2xl"><div className="mx-auto mt-4 h-2 w-10 rounded-full bg-white/30" /><div className="mx-auto mt-5 h-11 w-14 rounded-lg bg-black/30" /></div>
                <div className="absolute bottom-6 left-7 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">01 / Signature collection</div>
              </div>
              <div className="absolute -bottom-3 left-0 rounded-2xl border border-white/10 bg-[#111c31]/90 p-4 shadow-2xl backdrop-blur-xl"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300"><Sparkles size={16} /></div><div><div className="text-xs font-bold text-white">Elevated essentials</div><div className="mt-1 text-[10px] text-slate-500">Selected for how you live</div></div></div></div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0e1729]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-6 py-7 text-xs font-semibold text-slate-300 sm:grid-cols-4"><div><div className="text-lg font-extrabold text-white">01</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Thoughtful selection</div></div><div><div className="text-lg font-extrabold text-white">02</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Expert guidance</div></div><div><div className="text-lg font-extrabold text-white">03</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Reliable delivery</div></div><div><div className="text-lg font-extrabold text-white">04</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">Long-term care</div></div></div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-9 flex items-end justify-between"><div><div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300"><span className="h-px w-7 bg-blue-400" /> The edit</div><h2 className="display mt-3 text-3xl font-extrabold text-white sm:text-4xl">Made for modern living.</h2><p className="mt-2 text-sm text-slate-500">The pieces that make the everyday feel considered.</p></div><span className="hidden items-center gap-2 text-xs font-bold text-blue-300 sm:flex">View all products <ArrowRight size={14} /></span></div>
          <div className="grid gap-5 md:grid-cols-3">{products.map((product, index) => <PremiumProduct key={product.name} product={product} index={index} />)}</div>
        </section>

        <section className="mx-6 mb-16 overflow-hidden rounded-[24px] border border-blue-400/20 bg-gradient-to-br from-blue-500/20 via-[#172744] to-[#10192c] p-10 sm:p-14">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">The ShopDesk promise</div><h2 className="display mt-3 max-w-xl text-3xl font-extrabold leading-tight text-white sm:text-4xl">Buy once. Live beautifully. Feel looked after.</h2></div><span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0a1020]">Discover our promise <ArrowRight size={16} /></span></div>
        </section>
      </main>
    </div>
  );
}