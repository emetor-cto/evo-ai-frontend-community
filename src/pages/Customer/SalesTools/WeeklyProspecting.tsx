import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { num, pct, safeDiv, usePersistedState } from './shared';

type Goals = {
  connections: number;
  meetings: number;
  opportunities: number;
  wins: number;
};

type Week = {
  connections: number;
  meetings: number;
  opportunities: number;
  wins: number;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  segment: string;
  size: string;
  origin: string;
  qualified: string;
  urgency: string;
  pain: string;
};

type State = {
  yearGoals: Goals;
  weeks: Week[];
  leads: Lead[];
};

const emptyWeek = (): Week => ({
  connections: 0,
  meetings: 0,
  opportunities: 0,
  wins: 0,
});

const defaults: State = {
  yearGoals: { connections: 502, meetings: 502, opportunities: 502, wins: 502 },
  weeks: Array.from({ length: 52 }, emptyWeek),
  leads: [],
};

const METRICS: Array<{ key: keyof Goals; label: string }> = [
  { key: 'connections', label: 'Conexões' },
  { key: 'meetings', label: 'Reuniões' },
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'wins', label: 'Ganhos' },
];

export default function WeeklyProspecting() {
  const [state, setState] = usePersistedState<State>('sales-tools:prospecting', defaults);

  const weeklyGoals = useMemo(
    () => ({
      connections: Math.round(state.yearGoals.connections / 52),
      meetings: Math.round(state.yearGoals.meetings / 52),
      opportunities: Math.round(state.yearGoals.opportunities / 52),
      wins: Math.round(state.yearGoals.wins / 52),
    }),
    [state.yearGoals],
  );

  const yearDone = useMemo(() => {
    return state.weeks.reduce(
      (acc, week) => ({
        connections: acc.connections + week.connections,
        meetings: acc.meetings + week.meetings,
        opportunities: acc.opportunities + week.opportunities,
        wins: acc.wins + week.wins,
      }),
      { connections: 0, meetings: 0, opportunities: 0, wins: 0 },
    );
  }, [state.weeks]);

  const updateGoal = (key: keyof Goals, value: number) => {
    setState(prev => ({ ...prev, yearGoals: { ...prev.yearGoals, [key]: value } }));
  };

  const updateWeek = (weekIdx: number, key: keyof Week, value: number) => {
    setState(prev => {
      const weeks = [...prev.weeks];
      weeks[weekIdx] = { ...weeks[weekIdx], [key]: value };
      return { ...prev, weeks };
    });
  };

  const addLead = () => {
    setState(prev => ({
      ...prev,
      leads: [
        {
          id: crypto.randomUUID(),
          name: '',
          email: '',
          phone: '',
          role: '',
          company: '',
          segment: '',
          size: '',
          origin: '',
          qualified: '',
          urgency: '',
          pain: '',
        },
        ...prev.leads,
      ],
    }));
  };

  const updateLead = (id: string, key: keyof Lead, value: string) => {
    setState(prev => ({
      ...prev,
      leads: prev.leads.map(lead => (lead.id === id ? { ...lead, [key]: value } : lead)),
    }));
  };

  const removeLead = (id: string) => {
    setState(prev => ({ ...prev, leads: prev.leads.filter(lead => lead.id !== id) }));
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
        title="Prospecção Semanal"
        subtitle="Defina metas anuais; as metas semanais e o % realizado são calculados automaticamente."
      />

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
                      value={state.yearGoals[m.key]}
                      onChange={e => updateGoal(m.key, Number(e.target.value) || 0)}
                    />
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-muted/10">
                <td className="py-2 pr-2 text-muted-foreground">Realizado</td>
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
                    {pct(safeDiv(yearDone[m.key], state.yearGoals[m.key]))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {state.weeks.map((week, idx) => (
          <Card key={`week-${idx}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Semana {idx + 1}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1 pr-1">Campo</th>
                    {METRICS.map(m => (
                      <th key={m.key} className="py-1 pr-1">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-1 pr-1 text-muted-foreground">Meta</td>
                    {METRICS.map(m => (
                      <td key={`wg-${idx}-${m.key}`} className="py-1 pr-1 font-medium">
                        {weeklyGoals[m.key]}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b bg-orange-500/[0.04]">
                    <td className="py-1 pr-1 text-muted-foreground">Realizado</td>
                    {METRICS.map(m => (
                      <td key={`wr-${idx}-${m.key}`} className="py-1 pr-1">
                        <Input
                          type="number"
                          className="h-8"
                          value={week[m.key] || ''}
                          placeholder="0"
                          onChange={e => updateWeek(idx, m.key, Number(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 pr-1 text-muted-foreground">% meta</td>
                    {METRICS.map(m => (
                      <td key={`wp-${idx}-${m.key}`} className="py-1 pr-1">
                        {pct(safeDiv(week[m.key], weeklyGoals[m.key]))}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lista de prospecção</CardTitle>
          <Button size="sm" onClick={addLead}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar lead
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {state.leads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum lead na lista. Clique em “Adicionar lead” para começar.
            </p>
          ) : (
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  {[
                    'Nome',
                    'E-mail',
                    'Telefone',
                    'Cargo',
                    'Empresa',
                    'Segmento',
                    'Tamanho',
                    'Origem',
                    'Qualificado?',
                    'Urgência',
                    'Dor principal',
                    '',
                  ].map(h => (
                    <th key={h || 'actions'} className="py-2 pr-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.leads.map(lead => (
                  <Fragment key={lead.id}>
                    <tr className="border-b border-border/50 align-top">
                      {(
                        [
                          'name',
                          'email',
                          'phone',
                          'role',
                          'company',
                          'segment',
                          'size',
                          'origin',
                          'qualified',
                          'urgency',
                          'pain',
                        ] as const
                      ).map(field => (
                        <td key={field} className="py-1 pr-1">
                          <Input
                            value={lead[field]}
                            onChange={e => updateLead(lead.id, field, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLead(lead.id)}
                          aria-label="Remover lead"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
