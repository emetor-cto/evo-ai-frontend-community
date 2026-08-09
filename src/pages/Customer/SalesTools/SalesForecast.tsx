import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { MONTHS_PT, money, num, pct, safeDiv, usePersistedState } from './shared';

type MonthPair = { meta: number; realizado: number };

type Metric = {
  id: string;
  label: string;
  kind: 'count' | 'rate' | 'money';
  computed?: 'lead_rate' | 'opp_rate' | 'sale_rate' | 'cpl';
  months: MonthPair[];
};

const emptyMonths = (meta = 0): MonthPair[] =>
  Array.from({ length: 12 }, () => ({ meta, realizado: 0 }));

const defaults: Metric[] = [
  { id: 'visitors', label: 'Visitantes', kind: 'count', months: emptyMonths(10000) },
  { id: 'lead_rate', label: '% conversão p/ lead', kind: 'rate', computed: 'lead_rate', months: emptyMonths(0.057) },
  { id: 'leads', label: 'Número de leads', kind: 'count', months: emptyMonths(570) },
  { id: 'opp_rate', label: '% conversão p/ oportunidade', kind: 'rate', computed: 'opp_rate', months: emptyMonths(0.122) },
  { id: 'opps', label: 'Oportunidades', kind: 'count', months: emptyMonths(70) },
  { id: 'sale_rate', label: '% conversão p/ venda', kind: 'rate', computed: 'sale_rate', months: emptyMonths(0.148) },
  { id: 'sales', label: 'Vendas', kind: 'count', months: emptyMonths(11) },
  { id: 'leads_email', label: 'Leads via e-mail', kind: 'count', months: emptyMonths(171) },
  { id: 'leads_organic', label: 'Leads via busca orgânica', kind: 'count', months: emptyMonths(171) },
  { id: 'leads_social', label: 'Leads via redes sociais', kind: 'count', months: emptyMonths(171) },
  { id: 'leads_paid', label: 'Leads via mídia paga', kind: 'count', months: emptyMonths(228) },
  { id: 'paid_budget', label: 'Orçamento de mídia paga (R$)', kind: 'money', months: emptyMonths(570) },
  { id: 'cpl', label: 'Custo por lead (mídia paga)', kind: 'money', computed: 'cpl', months: emptyMonths(2.5) },
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

export default function SalesForecast() {
  const [metrics, setMetrics] = usePersistedState<Metric[]>('sales-tools:forecast', defaults);

  const byId = (id: string) => metrics.find(m => m.id === id)!;

  const getRealizado = (metric: Metric, monthIdx: number) => {
    const pair = metric.months[monthIdx];
    if (metric.computed === 'lead_rate') {
      return safeDiv(byId('leads').months[monthIdx].realizado, byId('visitors').months[monthIdx].realizado);
    }
    if (metric.computed === 'opp_rate') {
      return safeDiv(byId('opps').months[monthIdx].realizado, byId('leads').months[monthIdx].realizado);
    }
    if (metric.computed === 'sale_rate') {
      return safeDiv(byId('sales').months[monthIdx].realizado, byId('opps').months[monthIdx].realizado);
    }
    if (metric.computed === 'cpl') {
      return safeDiv(
        byId('paid_budget').months[monthIdx].realizado,
        byId('leads_paid').months[monthIdx].realizado,
      );
    }
    return pair.realizado;
  };

  const updateMeta = (metricId: string, monthIdx: number, value: number) => {
    setMetrics(prev =>
      prev.map(m => {
        if (m.id !== metricId || m.computed) return m;
        const months = m.months.map((pair, i) => (i === monthIdx ? { ...pair, meta: value } : pair));
        return { ...m, months };
      }),
    );
  };

  const updateRealizado = (metricId: string, monthIdx: number, value: number) => {
    setMetrics(prev =>
      prev.map(m => {
        if (m.id !== metricId || m.computed) return m;
        const months = m.months.map((pair, i) =>
          i === monthIdx ? { ...pair, realizado: value } : pair,
        );
        return { ...m, months };
      }),
    );
  };

  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/sales-tools">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
      </Button>

      <BaseHeader
        title="Previsibilidade de Vendas 2.0"
        subtitle="Funil mensal com meta × realizado. Taxas e CPL são calculados automaticamente."
      />

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
                            {formatValue(metric.kind, pair.meta)}
                          </div>
                        ) : (
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            step={metric.kind === 'rate' ? 0.001 : 1}
                            value={pair.meta}
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
                      return (
                        <td key={`${metric.id}-real-${i}`} className="py-1 px-1">
                          {metric.computed ? (
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
                      const value = getRealizado(metric, i);
                      const hasReal = metric.computed ? value > 0 : pair.realizado > 0;
                      const v = hasReal ? variance(pair.meta, value) : null;
                      const positive = (v ?? 0) >= 0;
                      return (
                        <td key={`${metric.id}-var-${i}`} className="py-2 px-1 text-center">
                          {v == null ? (
                            '—'
                          ) : (
                            <span
                              className={
                                positive
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
    </div>
  );
}
