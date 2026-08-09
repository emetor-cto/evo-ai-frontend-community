import { useEffect, useState } from 'react';

export function usePersistedState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / private mode
    }
  }, [key, state]);

  return [state, setState] as const;
}

export function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function num(n: number | null | undefined, digits = 0) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function safeDiv(a: number, b: number) {
  if (!b) return 0;
  return a / b;
}

/** OTE / commission attainment bands from the spreadsheet. */
export function commissionMultiplier(attainment: number): number {
  if (attainment <= 0.7) return 0.3;
  if (attainment <= 0.85) return 0.5;
  if (attainment <= 0.99) return 0.8;
  if (attainment < 1.2) return 1;
  return 2;
}

export const MONTHS_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;
