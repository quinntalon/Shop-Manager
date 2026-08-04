import { Link } from "wouter";
import { Zap, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-surface-2 border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-surface" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-bold text-slate-50">
                Volt<span className="text-amber">Ex</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Your trusted source for premium home appliances. Quality products, expert service, unbeatable prices.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Home" },
                { href: "/catalog", label: "Shop All" },
                { href: "/catalog?sort=newest", label: "New Arrivals" },
                { href: "/catalog?sort=price_asc", label: "Best Price" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-500 hover:text-amber transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-500">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber" />
                123 Commerce St, Accra, Ghana
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-500">
                <Phone className="w-4 h-4 shrink-0 text-amber" />
                +233 20 000 0000
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-500">
                <Mail className="w-4 h-4 shrink-0 text-amber" />
                hello@voltex.shop
              </li>
            </ul>
          </div>
        </div>

        <div className="glow-line my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <span>© {new Date().getFullYear()} VoltEx Appliances. All rights reserved.</span>
          <span>Powered by VoltEx POS</span>
        </div>
      </div>
    </footer>
  );
}
