import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { num, pct, safeDiv, usePersistedState } from './shared';

type State = {
  salesLastYear: number;
  meetingsLastYear: number;
  leadsLastYear: number;
  salesGoalThisYear: number;
};

const defaults: State = {
  salesLastYear: 100,
  meetingsLastYear: 1000,
  leadsLastYear: 10000,
  salesGoalThisYear: 200,
};

export default function ConversionCalculator() {
  const [state, setState] = usePersistedState<State>('sales-tools:conversion', defaults);

  const sellerConversion = safeDiv(state.salesLastYear, state.meetingsLastYear);
  const funnelConversion = safeDiv(state.salesLastYear, state.leadsLastYear);
  const leadsPerMonth =
    funnelConversion > 0 ? state.salesGoalThisYear / funnelConversion / 12 : 0;

  const set = (key: keyof State, value: string) => {
    const n = Number(value.replace(',', '.'));
    setState(prev => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sales-tools">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
        </Button>
      </div>

      <BaseHeader
        title="Calculadora de Conversão"
        subtitle="Preencha as células laranja. As azuis calculam automaticamente as taxas e a necessidade de leads."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(
          [
            ['salesLastYear', 'Quantas vendas sua empresa fez no ano passado?'],
            [
              'meetingsLastYear',
              'Quantas reuniões foram feitas pelos vendedores no ano passado?',
            ],
            [
              'leadsLastYear',
              'Quantos leads os vendedores receberam no ano passado?',
            ],
            ['salesGoalThisYear', 'Quantas vendas você deseja fazer este ano?'],
          ] as const
        ).map(([key, label]) => (
          <Card key={key} className="border-orange-500/30 bg-orange-500/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground leading-snug">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min={0}
                value={state[key]}
                onChange={e => set(key, e.target.value)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Taxa de conversão dos vendedores
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pct(sellerConversion)}</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            vendas ÷ reuniões = {num(state.salesLastYear)} ÷ {num(state.meetingsLastYear)}
          </CardContent>
        </Card>

        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Taxa de conversão do funil
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pct(funnelConversion)}</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            vendas ÷ leads = {num(state.salesLastYear)} ÷ {num(state.leadsLastYear)}
          </CardContent>
        </Card>

        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Leads necessários no topo do funil / mês
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{num(Math.ceil(leadsPerMonth))}</CardContent>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            meta anual ÷ taxa do funil ÷ 12
            {funnelConversion > 0 ? ` (${num(leadsPerMonth, 1)} leads/mês)` : ''}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
