import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  salesAnalyticsService,
  type SalesAnalyticsDashboard,
  type SalesAnalyticsKind,
} from '@/services/dashboard/salesAnalyticsService';

export function useSalesAnalyticsDashboard<T extends Record<string, unknown>>(
  kind: SalesAnalyticsKind,
  year: number,
) {
  const [data, setData] = useState<T | null>(null);
  const [liveFields, setLiveFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyResponse = useCallback((res: SalesAnalyticsDashboard<T>) => {
    setData(res.data);
    setLiveFields(res.live_fields || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesAnalyticsService.get<T>(kind, year);
      applyResponse(res);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível carregar o dashboard');
      setData(null);
      setLiveFields([]);
    } finally {
      setLoading(false);
    }
  }, [applyResponse, kind, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next?: T) => {
      const payload = next ?? data;
      if (!payload) return;
      setSaving(true);
      try {
        const res = await salesAnalyticsService.save<T>(kind, year, payload);
        applyResponse(res);
        toast.success('Dashboard salvo');
      } catch (error) {
        console.error(error);
        toast.error('Falha ao salvar dashboard');
      } finally {
        setSaving(false);
      }
    },
    [applyResponse, data, kind, year],
  );

  return { data, setData, liveFields, loading, saving, save, reload: load };
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
