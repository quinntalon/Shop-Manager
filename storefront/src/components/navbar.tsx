import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Zap, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(search.trim())}`;
    }
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/catalog", label: "Shop All" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Zap className="w-4.5 h-4.5 text-surface" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-slate-50 tracking-tight">
              Volt<span className="text-amber">Ex</span>
            </span>
          </Link>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
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
          <form onSubmit={handleSearch} className="flex-1 hidden sm:flex max-w-md ml-auto">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search appliances..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 pr-4 h-9 text-sm"
              />
            </div>
          </form>

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
          </div>
        )}
      </div>
    </header>
  );
}
