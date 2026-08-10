import { Fragment, useMemo } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@evoapi/design-system';
import { Loader2, Save, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  MONTHS_PT,
  money,
  num,
  pct,
  safeDiv,
  useSalesAnalyticsDashboard,
} from './shared';

type MonthPair = { meta: number; realizado: number };
type Metric = {
  id: string;
  label: string;
  kind: 'count' | 'rate' | 'money';
  computed?: string;
  months: MonthPair[];
};
type ForecastData = { metrics: Metric[] };

const CHART_METRIC_IDS = [
  'visitors',
  'leads',
  'opps',
  'sales',
  'leads_email',
  'leads_organic',
  'leads_social',
  'leads_paid',
  'paid_budget',
  'cpl',
];

function formatValue(kind: Metric['kind'], value: number) {
  if (kind === 'rate') return pct(value);
  if (kind === 'money') return money(value);
  return num(value);
}

function variance(meta: number, realizado: number) {
  if (!meta) return null;
  return (realizado - meta) / meta;
}

export default function ForecastDashboard({ year }: { year: number }) {
  const { data, setData, loading, saving, save } =
    useSalesAnalyticsDashboard<ForecastData>('forecast', year);

  const metrics = data?.metrics || [];
  const byId = (id: string) => metrics.find(m => m.id === id);

  const getComputed = (metric: Metric, monthIdx: number, field: 'meta' | 'realizado') => {
    if (metric.computed === 'lead_rate') {
      return safeDiv(
        byId('leads')?.months[monthIdx]?.[field] || 0,
        byId('visitors')?.months[monthIdx]?.[field] || 0,
      );
    }
    if (metric.computed === 'opp_rate') {
      return safeDiv(
        byId('opps')?.months[monthIdx]?.[field] || 0,
        byId('leads')?.months[monthIdx]?.[field] || 0,
      );
    }
    if (metric.computed === 'sale_rate') {
      return safeDiv(
        byId('sales')?.months[monthIdx]?.[field] || 0,
        byId('opps')?.months[monthIdx]?.[field] || 0,
      );
    }
    if (metric.computed === 'cpl') {
      return safeDiv(
        byId('paid_budget')?.months[monthIdx]?.[field] || 0,
        byId('leads_paid')?.months[monthIdx]?.[field] || 0,
      );
    }
    return metric.months[monthIdx]?.[field] || 0;
  };

  const getRealizado = (metric: Metric, monthIdx: number) => getComputed(metric, monthIdx, 'realizado');
  const getMeta = (metric: Metric, monthIdx: number) => getComputed(metric, monthIdx, 'meta');

  const chartCards = useMemo(() => {
    return CHART_METRIC_IDS.map(id => {
      const metric = byId(id);
      if (!metric) return null;
      const series = MONTHS_PT.map((name, i) => ({
        name,
        meta: getMeta(metric, i),
        realizado: getRealizado(metric, i),
      }));
      return { metric, series };
    }).filter(Boolean) as Array<{ metric: Metric; series: Array<{ name: string; meta: number; realizado: number }> }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics]);

  const LIVE_REALIZADO_IDS = new Set(['leads', 'opps', 'sales']);

  const updateMeta = (metricId: string, monthIdx: number, value: number) => {
    if (!data) return;
    setData({
      ...data,
      metrics: data.metrics.map(m => {
        if (m.id !== metricId || m.computed) return m;
        const months = m.months.map((pair, i) => (i === monthIdx ? { ...pair, meta: value } : pair));
        return { ...m, months };
      }),
    });
  };

  const updateRealizado = (metricId: string, monthIdx: number, value: number) => {
    if (!data || LIVE_REALIZADO_IDS.has(metricId)) return;
    setData({
      ...data,
      metrics: data.metrics.map(m => {
        if (m.id !== metricId || m.computed) return m;
        const months = m.months.map((pair, i) =>
          i === monthIdx ? { ...pair, realizado: value } : pair,
        );
        return { ...m, months };
      }),
    });
  };

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Previsibilidade de Vendas 2.0</h2>
          <p className="text-sm text-muted-foreground">
            Leads, oportunidades e vendas realizadas vêm do CRM. Metas e mídia paga continuam
            editáveis.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dashboard do funil</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2 sticky left-0 bg-background min-w-[180px]">Métrica</th>
                <th className="py-2 pr-2">Campo</th>
                {MONTHS_PT.map(m => (
                  <th key={m} className="py-2 px-1 text-center min-w-[88px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <Fragment key={metric.id}>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-2 font-medium sticky left-0 bg-background" rowSpan={3}>
                      {metric.label}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">Meta</td>
                    {metric.months.map((pair, i) => (
                      <td key={`${metric.id}-meta-${i}`} className="py-1 px-1">
                        {metric.computed ? (
                          <div className="text-center font-medium">
                            {formatValue(metric.kind, getMeta(metric, i))}
                          </div>
                        ) : (
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            value={pair.meta || ''}
                            placeholder="0"
                            onChange={e => updateMeta(metric.id, i, Number(e.target.value) || 0)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/40 bg-muted/10">
                    <td className="py-2 pr-2 text-muted-foreground">Realizado</td>
                    {metric.months.map((pair, i) => {
                      const value = getRealizado(metric, i);
                      const isLive = LIVE_REALIZADO_IDS.has(metric.id);
                      return (
                        <td key={`${metric.id}-real-${i}`} className="py-1 px-1">
                          {metric.computed || isLive ? (
                            <div className="text-center font-semibold text-sky-600 dark:text-sky-400">
                              {formatValue(metric.kind, value)}
                            </div>
                          ) : (
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={pair.realizado || ''}
                              placeholder="0"
                              onChange={e =>
                                updateRealizado(metric.id, i, Number(e.target.value) || 0)
                              }
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b border-border/70">
                    <td className="py-2 pr-2 text-muted-foreground">Meta vs Real</td>
                    {metric.months.map((pair, i) => {
                      const meta = getMeta(metric, i);
                      const value = getRealizado(metric, i);
                      const hasReal = metric.computed ? value > 0 : pair.realizado > 0;
                      const v = hasReal ? variance(meta, value) : null;
                      return (
                        <td key={`${metric.id}-var-${i}`} className="py-2 px-1 text-center">
                          {v == null ? (
                            '—'
                          ) : (
                            <span
                              className={
                                v >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {pct(v)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Gráficos (Meta × Realizado)
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {chartCards.map(({ metric, series }) => (
            <Card key={metric.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{metric.label}</CardTitle>
                <CardDescription>Meta vs realizado ao longo do ano</CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) =>
                        formatValue(metric.kind, Number(value ?? 0) || 0)
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="meta"
                      name="Meta"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="realizado"
                      name="Realizado"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
