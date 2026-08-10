import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  commissionMultiplier,
  money,
  num,
  pct,
  safeDiv,
  useSalesAnalyticsDashboard,
} from './shared';

type RoleRow = { role: string; fixed: number; variable: number };
type PersonRow = { name: string; done: number; goal: number; variable_at_goal: number };

type CommissionData = {
  seller_ote: RoleRow[];
  sdr_ote: RoleRow[];
  coordinator_ote: RoleRow[];
  sdr_people: PersonRow[];
  seller_people: PersonRow[];
};

function OteTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: RoleRow[];
  onChange: (rows: RoleRow[]) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3">Cargo</th>
              <th className="py-2 pr-3">Fixo</th>
              <th className="py-2 pr-3">Variável máx.</th>
              <th className="py-2">OTE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.role}-${idx}`} className="border-b border-border/60">
                <td className="py-2 pr-3">
                  <Input
                    value={row.role}
                    onChange={e => {
                      const next = [...rows];
                      next[idx] = { ...row, role: e.target.value };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    type="number"
                    value={row.fixed || ''}
                    placeholder="0"
                    onChange={e => {
                      const next = [...rows];
                      next[idx] = { ...row, fixed: Number(e.target.value) || 0 };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    type="number"
                    value={row.variable || ''}
                    placeholder="0"
                    onChange={e => {
                      const next = [...rows];
                      next[idx] = { ...row, variable: Number(e.target.value) || 0 };
                      onChange(next);
                    }}
                  />
                </td>
                <td className="py-2 font-semibold">{money(row.fixed + row.variable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PeopleTable({
  title,
  metricLabel,
  people,
  onChange,
  doneFromCrm = false,
}: {
  title: string;
  metricLabel: string;
  people: PersonRow[];
  onChange: (people: PersonRow[]) => void;
  doneFromCrm?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...people,
              { name: '', done: 0, goal: 0, variable_at_goal: 0 },
            ])
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto space-y-2">
        <p className="text-xs text-muted-foreground">
          Multiplicador: ≤70%→0,3 · 71–85%→0,5 · 86–99%→0,8 · 100–119%→1,0 · ≥120%→2,0
          {doneFromCrm
            ? ' · Use o mesmo nome do usuário do CRM para o realizado automático.'
            : ''}
        </p>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma pessoa cadastrada. Adicione para calcular a comissão.
          </p>
        ) : (
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 pr-2">Pessoa</th>
                <th className="py-2 pr-2">{metricLabel}</th>
                <th className="py-2 pr-2">Meta</th>
                <th className="py-2 pr-2">%</th>
                <th className="py-2 pr-2">Valor na meta</th>
                <th className="py-2 pr-2">Mult.</th>
                <th className="py-2 pr-2">Comissão</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {people.map((person, idx) => {
                const attainment = safeDiv(person.done, person.goal);
                const mult = commissionMultiplier(attainment);
                return (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-1 pr-1">
                      <Input
                        value={person.name}
                        placeholder="Nome"
                        onChange={e => {
                          const next = [...people];
                          next[idx] = { ...person, name: e.target.value };
                          onChange(next);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-1">
                      {doneFromCrm ? (
                        <div className="h-10 flex items-center font-medium">{num(person.done)}</div>
                      ) : (
                        <Input
                          type="number"
                          value={person.done || ''}
                          placeholder="0"
                          onChange={e => {
                            const next = [...people];
                            next[idx] = { ...person, done: Number(e.target.value) || 0 };
                            onChange(next);
                          }}
                        />
                      )}
                    </td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={person.goal || ''}
                        placeholder="0"
                        onChange={e => {
                          const next = [...people];
                          next[idx] = { ...person, goal: Number(e.target.value) || 0 };
                          onChange(next);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-1">{pct(attainment)}</td>
                    <td className="py-1 pr-1">
                      <Input
                        type="number"
                        value={person.variable_at_goal || ''}
                        placeholder="0"
                        onChange={e => {
                          const next = [...people];
                          next[idx] = { ...person, variable_at_goal: Number(e.target.value) || 0 };
                          onChange(next);
                        }}
                      />
                    </td>
                    <td className="py-1 pr-1">{num(mult, 1)}×</td>
                    <td className="py-1 pr-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      {money(person.variable_at_goal * mult)}
                    </td>
                    <td className="py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onChange(people.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommissioningDashboard({ year }: { year: number }) {
  const { data, setData, loading, saving, save } =
    useSalesAnalyticsDashboard<CommissionData>('commissioning', year);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  // Normalize snake_case from API if camelCase leftovers exist
  const sdrPeople = (data.sdr_people || []).map(p => ({
    name: p.name || '',
    done: Number(p.done) || 0,
    goal: Number(p.goal) || 0,
    variable_at_goal: Number((p as PersonRow).variable_at_goal ?? (p as { variableAtGoal?: number }).variableAtGoal) || 0,
  }));
  const sellerPeople = (data.seller_people || []).map(p => ({
    name: p.name || '',
    done: Number(p.done) || 0,
    goal: Number(p.goal) || 0,
    variable_at_goal: Number((p as PersonRow).variable_at_goal ?? (p as { variableAtGoal?: number }).variableAtGoal) || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Comissionamento de Vendas 2.0</h2>
          <p className="text-sm text-muted-foreground">
            OTE e metas são manuais. O realizado (reuniões/vendas) vem do CRM quando o nome bate com
            um usuário.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="ote">
        <TabsList>
          <TabsTrigger value="ote">Modelo OTE</TabsTrigger>
          <TabsTrigger value="sdr">Variável SDR</TabsTrigger>
          <TabsTrigger value="seller">Variável Vendedor</TabsTrigger>
        </TabsList>
        <TabsContent value="ote" className="space-y-4 mt-4">
          <OteTable
            title="Vendedores"
            rows={data.seller_ote || []}
            onChange={seller_ote => setData({ ...data, seller_ote })}
          />
          <OteTable
            title="SDR"
            rows={data.sdr_ote || []}
            onChange={sdr_ote => setData({ ...data, sdr_ote })}
          />
          <OteTable
            title="Coordenadores"
            rows={data.coordinator_ote || []}
            onChange={coordinator_ote => setData({ ...data, coordinator_ote })}
          />
        </TabsContent>
        <TabsContent value="sdr" className="mt-4">
          <PeopleTable
            title="Variável pré-vendas"
            metricLabel="Reuniões qualificadas"
            people={sdrPeople}
            doneFromCrm
            onChange={sdr_people => setData({ ...data, sdr_people })}
          />
        </TabsContent>
        <TabsContent value="seller" className="mt-4">
          <PeopleTable
            title="Variável vendas"
            metricLabel="Vendas concluídas"
            people={sellerPeople}
            doneFromCrm
            onChange={seller_people => setData({ ...data, seller_people })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
