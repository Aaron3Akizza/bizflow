/**
 * Shared formatting utilities for BizFlow.
 * All money values must flow through formatMoney() so the correct
 * currency symbol is displayed for every business.
 */

// NOTE: useBusiness is imported here for the useMoney/useCurrency hooks.
// This is intentional — format.ts is a leaf dependency and does not
// create a circular import because AuthContext does not import format.ts.
import { useBusiness } from "../context/AuthContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: "UGX",
  KES: "KES",
  TZS: "TZS",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Format a numeric value as a currency string.
 */
export function formatMoney(value: number | null | undefined, currency = "UGX"): string {
  const amount = Number(value ?? 0);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString("en-UG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * React hook — returns a pre-bound formatMoney for the current business currency.
 */
export function useMoney(): (value: number | null | undefined) => string {
  const { business } = useBusiness();
  const currency = business?.currency ?? "UGX";
  return (value) => formatMoney(value, currency);
}

/**
 * React hook — returns the currency symbol/code for the current business.
 */
export function useCurrency(): string {
  const { business } = useBusiness();
  const code = business?.currency ?? "UGX";
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-UG", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-UG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
