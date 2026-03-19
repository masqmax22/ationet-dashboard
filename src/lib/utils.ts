import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVolume(liters: number): string {
  if (liters >= 1_000_000) {
    return `${(liters / 1_000_000).toFixed(2)} ML`;
  }
  if (liters >= 1_000) {
    return `${(liters / 1_000).toFixed(1)} kL`;
  }
  return `${Math.round(liters).toLocaleString("es-AR")} L`;
}

export function formatCurrency(amount: number, currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function toISODate(d: Date = new Date()): string {
  return d.toISOString().split("T")[0];
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
