import { useState } from "react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { login, register } from "@/lib/auth";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-semibold text-gray-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </label>
  );
}

function GoogleButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#fbbc05] via-[#ea4335] via-[#34a853] to-[#4285f4] text-[10px] font-bold text-white">
        G
      </span>
      Continue with Google
    </button>
  );
}

function AuthShell({ children, extraFooter }: { children: React.ReactNode; extraFooter?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-4 font-[Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif] text-gray-900">
      <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white px-8 py-8 shadow-lg">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500 shadow-lg">
            <ShoppingCart className="h-8 w-8 text-white" strokeWidth={2.4} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign in to Nexus POS</h1>
          <p className="mt-2 text-[15px] text-gray-600">Welcome back! Please sign in to continue</p>
        </div>

        <div className="mt-8 space-y-5">{children}</div>

        {extraFooter}
      </div>
    </div>
  );
}

function AuthFooter({ prompt, actionText, href }: { prompt: string; actionText: string; href: string }) {
  return (
    <div className="mt-6 text-center text-[15px] text-gray-600">
      {prompt}{" "}
      <a href={href} className="font-semibold text-blue-500 hover:underline">
        {actionText}
      </a>
    </div>
  );
}

export function SignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ username, password });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      extraFooter={<AuthFooter prompt="Don't have an account?" actionText="Sign up" href="/sign-up" />}
    >
      <GoogleButton />

      <div className="relative flex items-center justify-center text-sm text-gray-500">
        <span className="h-px flex-1 bg-gray-300" />
        <span className="mx-3">or</span>
        <span className="h-px flex-1 bg-gray-300" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Email address or username"
          name="username"
          value={username}
          onChange={setUsername}
          placeholder="Enter email or username"
          autoComplete="username"
        />

        <Field
          label="Password"
          name="password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Enter password"
          autoComplete="current-password"
        />

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-[15px] font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Signing in…" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Secured by <span className="font-semibold text-gray-900">ShopDesk</span>
      </div>
    </AuthShell>
  );
}

export function SignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    address: "",
    position: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    applicationNotes: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const update = (name: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      extraFooter={<AuthFooter prompt="Already have an account?" actionText="Sign in" href="/sign-in" />}
    >
      <div className="mb-3 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
        <p className="mt-2 text-[15px] text-gray-600">Request access to the Nexus POS workspace.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="fullName" value={form.fullName} onChange={update("fullName")} placeholder="Jane Smith" autoComplete="name" />
          <Field label="Position" name="position" value={form.position} onChange={update("position")} placeholder="Cashier" autoComplete="organization-title" />
          <Field label="Email" name="email" value={form.email} onChange={update("email")} type="email" placeholder="name@example.com" autoComplete="email" />
          <Field label="Phone" name="phone" value={form.phone} onChange={update("phone")} placeholder="+254 ..." autoComplete="tel" />
          <Field label="Username" name="username" value={form.username} onChange={update("username")} placeholder="jane.smith" autoComplete="username" />
          <Field label="Password" name="password" value={form.password} onChange={update("password")} type="password" placeholder="Minimum 8 chars" autoComplete="new-password" />
        </div>

        <Field label="Address" name="address" value={form.address} onChange={update("address")} placeholder="Street, city, country" autoComplete="street-address" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Next of kin" name="nextOfKinName" value={form.nextOfKinName} onChange={update("nextOfKinName")} placeholder="Emergency contact" />
          <Field label="Kin phone" name="nextOfKinPhone" value={form.nextOfKinPhone} onChange={update("nextOfKinPhone")} placeholder="+254 ..." autoComplete="tel" />
        </div>

        <label className="block text-sm">
          <span className="mb-2 block font-semibold text-gray-700">Additional details</span>
          <textarea
            name="applicationNotes"
            value={form.applicationNotes}
            onChange={(event) => update("applicationNotes")(event.target.value)}
            rows={3}
            placeholder="Tell the admin about your role and availability"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-[15px] font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting…" : "Submit application"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}
