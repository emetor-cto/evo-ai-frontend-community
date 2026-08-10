import { Fragment, useMemo } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { Loader2, Save } from 'lucide-react';
import { num, pct, safeDiv, useSalesAnalyticsDashboard } from './shared';

type Goals = {
  connections: number;
  meetings: number;
  opportunities: number;
  wins: number;
};
type Week = Goals;
type ProspectingData = {
  year_goals: Goals;
  weeks: Week[];
};

const METRICS: Array<{ key: keyof Goals; label: string }> = [
  { key: 'connections', label: 'Conexões' },
  { key: 'meetings', label: 'Reuniões' },
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'wins', label: 'Ganhos' },
];

export default function ProspectingDashboard({ year }: { year: number }) {
  const { data, setData, loading, saving, save } =
    useSalesAnalyticsDashboard<ProspectingData>('prospecting', year);

  const weeklyGoals = useMemo(() => {
    const goals = data?.year_goals || {
      connections: 0,
      meetings: 0,
      opportunities: 0,
      wins: 0,
    };
    return {
      connections: Math.round((goals.connections || 0) / 52),
      meetings: Math.round((goals.meetings || 0) / 52),
      opportunities: Math.round((goals.opportunities || 0) / 52),
      wins: Math.round((goals.wins || 0) / 52),
    };
  }, [data?.year_goals]);

  const yearDone = useMemo(() => {
    const weeks = data?.weeks || [];
    return weeks.reduce(
      (acc, week) => ({
        connections: acc.connections + (week.connections || 0),
        meetings: acc.meetings + (week.meetings || 0),
        opportunities: acc.opportunities + (week.opportunities || 0),
        wins: acc.wins + (week.wins || 0),
      }),
      { connections: 0, meetings: 0, opportunities: 0, wins: 0 },
    );
  }, [data?.weeks]);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const weeks =
    data.weeks?.length === 52
      ? data.weeks
      : Array.from({ length: 52 }, () => ({
          connections: 0,
          meetings: 0,
          opportunities: 0,
          wins: 0,
        }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Prospecção Semanal</h2>
          <p className="text-sm text-muted-foreground">
            Defina as metas anuais. O realizado semanal vem do CRM (contatos, reuniões, oportunidades
            e ganhos).
          </p>
        </div>
        <Button onClick={() => void save({ ...data, weeks })} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar metas
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Metas do ano</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2">Campo</th>
                {METRICS.map(m => (
                  <th key={m.key} className="py-2 pr-2">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-2 text-muted-foreground">Meta</td>
                {METRICS.map(m => (
                  <td key={`goal-${m.key}`} className="py-2 pr-2">
                    <Input
                      type="number"
                      value={data.year_goals?.[m.key] || ''}
                      placeholder="0"
                      onChange={e =>
                        setData({
                          ...data,
                          year_goals: {
                            ...data.year_goals,
                            [m.key]: Number(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-muted/10">
                <td className="py-2 pr-2 text-muted-foreground">Realizado (CRM)</td>
                {METRICS.map(m => (
                  <td key={`done-${m.key}`} className="py-2 pr-2 font-semibold">
                    {num(yearDone[m.key])}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 pr-2 text-muted-foreground">% da meta</td>
                {METRICS.map(m => (
                  <td key={`pct-${m.key}`} className="py-2 pr-2 font-medium">
                    {pct(safeDiv(yearDone[m.key], data.year_goals?.[m.key] || 0))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Realizado por semana (CRM)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[520px]">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2">Semana</th>
                {METRICS.map(m => (
                  <th key={m.key} className="py-2 pr-2" colSpan={3}>
                    {m.label}
                  </th>
                ))}
              </tr>
              <tr className="text-left text-muted-foreground border-b text-[10px]">
                <th className="py-1 pr-2" />
                {METRICS.map(m => (
                  <Fragment key={m.key}>
                    <th className="py-1 pr-2">Meta</th>
                    <th className="py-1 pr-2">Realizado</th>
                    <th className="py-1 pr-2">%</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, idx) => (
                <tr key={`week-${idx}`} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">S{idx + 1}</td>
                  {METRICS.map(m => (
                    <Fragment key={m.key}>
                      <td className="py-1 pr-2 text-muted-foreground">{weeklyGoals[m.key]}</td>
                      <td className="py-1 pr-2 font-medium">{num(week[m.key] || 0)}</td>
                      <td className="py-1 pr-2">
                        {pct(safeDiv(week[m.key] || 0, weeklyGoals[m.key]))}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
