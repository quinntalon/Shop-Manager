export interface LocalUser {
  id: number;
  username: string;
  name: string;
  email: string;
  address: string;
  phone: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  position: string;
  applicationNotes: string;
  status: "pending" | "approved" | "rejected";
  role: "admin" | "salesperson" | "cashier" | null;
  permissions: string[];
  createdAt: string;
}

export const authQueryKey = ["/api/auth/me"] as const;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(getApiErrorMessage(body, response.status)) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return body as T;
}

function getApiErrorMessage(body: unknown, status: number): string {
  if (!body || typeof body !== "object") {
    return `Request failed (${status}).`;
  }

  const errorValue = (body as { error?: unknown }).error;
  if (typeof errorValue === "string" && errorValue.trim()) {
    return errorValue;
  }

  if (errorValue && typeof errorValue === "object") {
    const details = errorValue as {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
      message?: string;
    };
    const messages = [
      ...(details.formErrors ?? []),
      ...Object.values(details.fieldErrors ?? {}).flatMap((fieldMessages) => fieldMessages ?? []),
    ].filter(Boolean);
    if (messages.length > 0) {
      return messages.join(" ");
    }
    if (details.message) {
      return details.message;
    }
  }

  return `Request failed (${status}).`;
}

export function getCurrentUser(): Promise<LocalUser | null> {
  return request<{ user: LocalUser }>("/api/auth/me")
    .then((data) => data.user)
    .catch((error) => {
      if ((error as Error & { status?: number }).status === 401) return null;
      throw error;
    });
}

export function login(data: { username: string; password: string }) {
  return request<{ user: LocalUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function register(data: {
  fullName: string;
  address: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  position: string;
  applicationNotes: string;
}) {
  return request<{ user: LocalUser; message: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function logout() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}