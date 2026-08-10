import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@evoapi/design-system';
import { Loader2, Save } from 'lucide-react';
import { num, pct, safeDiv, useSalesAnalyticsDashboard } from './shared';

type ConversionData = {
  sales_last_year: number;
  meetings_last_year: number;
  leads_last_year: number;
  sales_goal_this_year: number;
};

const LIVE_KEYS: Array<keyof ConversionData> = [
  'sales_last_year',
  'meetings_last_year',
  'leads_last_year',
];

export default function ConversionDashboard({ year }: { year: number }) {
  const { data, setData, liveFields, loading, saving, save } =
    useSalesAnalyticsDashboard<ConversionData>('conversion', year);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const sellerConversion = safeDiv(data.sales_last_year, data.meetings_last_year);
  const funnelConversion = safeDiv(data.sales_last_year, data.leads_last_year);
  const leadsPerMonth =
    funnelConversion > 0 ? data.sales_goal_this_year / funnelConversion / 12 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Calculadora de Conversão</h2>
          <p className="text-sm text-muted-foreground">
            Vendas, reuniões e leads do ano passado vêm do CRM. Defina só a meta deste ano.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar meta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(
          [
            ['sales_last_year', 'Vendas no ano passado'],
            ['meetings_last_year', 'Reuniões no ano passado'],
            ['leads_last_year', 'Leads no ano passado'],
            ['sales_goal_this_year', 'Meta de vendas deste ano'],
          ] as const
        ).map(([key, label]) => {
          const isLive = LIVE_KEYS.includes(key) || liveFields.includes(key);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  {label}
                  {isLive ? ' · CRM' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLive ? (
                  <div className="text-2xl font-semibold h-10 flex items-center">
                    {num(data[key])}
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    value={data[key] || ''}
                    placeholder="0"
                    onChange={e =>
                      setData({
                        ...data,
                        [key]: Number(e.target.value) || 0,
                      })
                    }
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conversão dos vendedores</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pct(sellerConversion)}</CardContent>
        </Card>
        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Conversão do funil</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{pct(funnelConversion)}</CardContent>
        </Card>
        <Card className="border-sky-500/30 bg-sky-500/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Leads necessários / mês</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{num(Math.ceil(leadsPerMonth))}</CardContent>
        </Card>
      </div>
    </div>
  );
}
