import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Zap, Menu, X, Sun, Moon, Heart, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightMode, setLightMode] = useState(true);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("shopdesk-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const shouldUseLight = savedTheme ? savedTheme === "light" : prefersLight;
    setLightMode(shouldUseLight);
    document.documentElement.classList.toggle("theme-dark", !shouldUseLight);
  }, []);

  function toggleTheme() {
    const next = !lightMode;
    setLightMode(next);
    document.documentElement.classList.toggle("theme-dark", !next);
    window.localStorage.setItem("shopdesk-theme", next ? "light" : "dark");
  }

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
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "0 1px 6px color-mix(in srgb, var(--text-strong) 4%, transparent)",
      }}
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-5">
        {/* ── Main header row ── */}
        <div className="flex h-11 items-center gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0 text-decoration-none">
            {/* Orange lightning circle */}
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
              style={{ background: "var(--sd-orange)" }}
            >
              <Zap className="h-3 w-3 text-white" strokeWidth={2.5} fill="white" />
            </div>
            {/* Wordmark */}
            <span
              className="text-[0.875rem] font-extrabold leading-none tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Shop
              <span style={{ color: "var(--sd-orange)" }}>Desk</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-0.5 ml-3">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold transition-colors",
                  location === l.href
                    ? "text-white"
                    : "hover:bg-[var(--surface-3)]",
                )}
                style={
                  location === l.href
                    ? { background: "var(--sd-orange)" }
                    : { color: "var(--text-subtle)" }
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xs ml-auto">
            <div className="relative w-full">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                style={{ color: "var(--text-faint)" }}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-8 pr-3 h-8 text-xs"
              />
            </div>
          </form>

          {/* Desktop right icons */}
          <div className="hidden md:flex items-center gap-0.5" style={{ color: "var(--text-subtle)" }}>
            <button type="button" className="theme-toggle" aria-label="Saved items">
              <Heart className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="theme-toggle" aria-label="Shopping bag">
              <ShoppingBag className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="theme-toggle" aria-label="Account">
              <UserRound className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dark mode toggle — always visible */}
          <button
            type="button"
            className="theme-toggle shrink-0"
            onClick={toggleTheme}
            aria-label={lightMode ? "Switch to dark theme" : "Switch to light theme"}
            title={lightMode ? "Dark mode" : "Light mode"}
          >
            {lightMode ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Mobile: search icon button */}
          <Link
            href="/catalog"
            className="md:hidden theme-toggle shrink-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden theme-toggle shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <div
            className="md:hidden py-2 space-y-0.5 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                )}
                style={
                  location === l.href
                    ? { background: "var(--sd-orange-glow)", color: "var(--sd-orange)" }
                    : { color: "var(--text-subtle)" }
                }
              >
                {l.label}
              </Link>
            ))}

            {/* Mobile search inside menu */}
            <form onSubmit={handleSearch} className="px-1 pt-1.5">
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
                  style={{ color: "var(--text-faint)" }}
                />
                <input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-8 h-8 text-xs"
                />
              </div>
            </form>

            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-medium rounded-lg transition-colors"
              style={{ color: "var(--text-subtle)" }}
              onClick={() => { toggleTheme(); setMenuOpen(false); }}
            >
              {lightMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              {lightMode ? "Dark theme" : "Light theme"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
