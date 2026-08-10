import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Zap, Menu, X, Sun, Moon, Heart, ShoppingBag, UserRound, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchCategories } from "@/lib/api";

export default function Navbar() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [lightMode, setLightMode] = useState(true);
  const { data: categories = [] } = useQuery({
    queryKey: ["store-categories"],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("shopdesk-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const shouldUseLight = savedTheme ? savedTheme === "light" : prefersLight;
    setLightMode(shouldUseLight);
    document.documentElement.classList.toggle("theme-dark", !shouldUseLight);
  }, []);

  function toggleTheme() {
    const nextLightMode = !lightMode;
    setLightMode(nextLightMode);
    document.documentElement.classList.toggle("theme-dark", !nextLightMode);
    window.localStorage.setItem("shopdesk-theme", nextLightMode ? "light" : "dark");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(search.trim())}`;
    }
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/catalog?sort=newest&new=1", label: "New Arrivals" },
    { href: "/catalog", label: "Shop All" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative flex items-center h-[4.5rem] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-amber flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Zap className="w-4.5 h-4.5 text-surface" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-extrabold text-slate-50 tracking-[-0.04em]">
              Shop<span className="text-amber">Desk</span>
            </span>
          </Link>

          {/* Nav links (desktop) */}
           <nav className="hidden md:flex items-center gap-1 ml-5">
             <div className="relative">
               <button
                 type="button"
                 className={cn(
                   "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1",
                   location.startsWith("/catalog")
                     ? "text-amber bg-amber-glow"
                     : "text-slate-400 hover:text-slate-100 hover:bg-surface-3",
                 )}
                 onClick={() => setCategoriesOpen((open) => !open)}
                 aria-expanded={categoriesOpen}
                 aria-haspopup="menu"
               >
                 Categories <ChevronDown className={cn("w-3 h-3 transition-transform", categoriesOpen && "rotate-180")} />
               </button>
               {categoriesOpen && (
                 <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface-2 p-2 shadow-xl" role="menu">
                   <Link href="/catalog" onClick={() => setCategoriesOpen(false)} className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-surface-3">
                     All categories
                   </Link>
                   {categories.map((category) => (
                     <Link
                       key={category.id}
                       href={`/catalog?categoryId=${category.id}`}
                       onClick={() => setCategoriesOpen(false)}
                       className="block rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-surface-3 hover:text-slate-100"
                       role="menuitem"
                     >
                       {category.name}
                     </Link>
                   ))}
                 </div>
               )}
             </div>
             {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                   "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                  location === l.href
                    ? "text-amber bg-amber-glow"
                    : "text-slate-400 hover:text-slate-100 hover:bg-surface-3",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Search */}
           <form onSubmit={handleSearch} className="flex-1 hidden sm:flex max-w-md mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 pr-4 h-9 text-sm"
              />
            </div>
          </form>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <button type="button" className="theme-toggle" aria-label="Saved items">
              <Heart className="w-4 h-4" />
            </button>
            <button type="button" className="theme-toggle" aria-label="Shopping bag">
              <ShoppingBag className="w-4 h-4" />
            </button>
            <button type="button" className="theme-toggle" aria-label="Account">
              <UserRound className="w-4 h-4" />
            </button>
          </div>

            <button
            type="button"
            className="theme-toggle shrink-0"
            onClick={toggleTheme}
            aria-label={lightMode ? "Switch to dark theme" : "Switch to light theme"}
            title={lightMode ? "Switch to dark theme" : "Switch to light theme"}
          >
            {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="ml-auto md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-3"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
             <Link href="/catalog" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3">
               Categories
             </Link>
             {categories.map((category) => (
               <Link
                 key={category.id}
                 href={`/catalog?categoryId=${category.id}`}
                 onClick={() => setMenuOpen(false)}
                 className="block pl-6 pr-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-100 hover:bg-surface-3"
               >
                 {category.name}
               </Link>
             ))}
             {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  location === l.href
                    ? "text-amber bg-amber-glow"
                    : "text-slate-400 hover:text-slate-100 hover:bg-surface-3",
                )}
              >
                {l.label}
              </Link>
            ))}
            <form onSubmit={handleSearch} className="px-1 pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search appliances..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-9 h-9 text-sm"
                />
              </div>
            </form>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-amber transition-colors"
              onClick={toggleTheme}
            >
              {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {lightMode ? "Dark theme" : "Light theme"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
