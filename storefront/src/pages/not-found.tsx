import { Link } from "wouter";
import { ArrowLeft, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-glow border border-amber/30 flex items-center justify-center">
        <Zap className="w-8 h-8 text-amber" />
      </div>
      <div>
        <h1 className="font-display text-7xl font-bold text-slate-700 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-300">Page not found</h2>
        <p className="text-slate-500 mt-2 text-sm">The page you're looking for doesn't exist.</p>
      </div>
      <Link href="/" className="btn-primary">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
    </div>
  );
}
