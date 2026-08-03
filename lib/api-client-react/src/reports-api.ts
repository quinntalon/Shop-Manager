import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { RevenueEntry, PaymentMethodStat, ReportSummary } from "./generated/api.schemas";

export type RevenueReportParams = {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
};

export type DateRangeParams = {
  from?: string;
  to?: string;
};

function buildQs(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  return qs.toString() ? `?${qs}` : "";
}

// ── Revenue over time ─────────────────────────────────────────────────────────

export const getRevenueReportQueryKey = (params?: RevenueReportParams) =>
  ["revenueReport", params] as const;

export const getRevenueReport = (params?: RevenueReportParams): Promise<RevenueEntry[]> =>
  customFetch<RevenueEntry[]>(
    `/api/reports/revenue${buildQs({ from: params?.from, to: params?.to, groupBy: params?.groupBy })}`,
  );

export function useGetRevenueReport(
  params?: RevenueReportParams,
  options?: { query?: UseQueryOptions<RevenueEntry[], Error> },
) {
  return useQuery<RevenueEntry[], Error>({
    queryKey: getRevenueReportQueryKey(params),
    queryFn: () => getRevenueReport(params),
    ...options?.query,
  });
}

// ── Payment method breakdown ──────────────────────────────────────────────────

export const getPaymentMethodsQueryKey = (params?: DateRangeParams) =>
  ["paymentMethodStats", params] as const;

export const getPaymentMethods = (params?: DateRangeParams): Promise<PaymentMethodStat[]> =>
  customFetch<PaymentMethodStat[]>(
    `/api/reports/payment-methods${buildQs({ from: params?.from, to: params?.to })}`,
  );

export function useGetPaymentMethods(
  params?: DateRangeParams,
  options?: { query?: UseQueryOptions<PaymentMethodStat[], Error> },
) {
  return useQuery<PaymentMethodStat[], Error>({
    queryKey: getPaymentMethodsQueryKey(params),
    queryFn: () => getPaymentMethods(params),
    ...options?.query,
  });
}

// ── Summary stats ─────────────────────────────────────────────────────────────

export const getReportSummaryQueryKey = (params?: DateRangeParams) =>
  ["reportSummary", params] as const;

export const getReportSummary = (params?: DateRangeParams): Promise<ReportSummary> =>
  customFetch<ReportSummary>(
    `/api/reports/summary${buildQs({ from: params?.from, to: params?.to })}`,
  );

export function useGetReportSummary(
  params?: DateRangeParams,
  options?: { query?: UseQueryOptions<ReportSummary, Error> },
) {
  return useQuery<ReportSummary, Error>({
    queryKey: getReportSummaryQueryKey(params),
    queryFn: () => getReportSummary(params),
    ...options?.query,
  });
}
