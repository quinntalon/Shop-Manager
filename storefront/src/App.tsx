import { Switch, Route } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import Catalog from "@/pages/catalog";
import ProductDetail from "@/pages/product";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-surface transition-colors duration-300">
      <Navbar />

      {/* Main content — extra bottom padding on mobile leaves room for the
          floating bottom navigation bar (≈ 4.5rem height + 0.75rem gap × 2) */}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route component={NotFound} />
        </Switch>
      </main>

      {/* Footer: hidden on mobile — bottom nav replaces it there */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
