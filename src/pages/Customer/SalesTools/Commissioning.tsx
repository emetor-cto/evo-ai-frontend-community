import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
import { BaseHeader } from '@/components/base';
import { commissionMultiplier, money, num, pct, safeDiv, usePersistedState } from './shared';

type RoleRow = { role: string; fixed: number; variable: number };
type PersonRow = {
  name: string;
  done: number;
  goal: number;
  variableAtGoal: number;
};

type State = {
  sellerOte: RoleRow[];
  sdrOte: RoleRow[];
  coordinatorOte: RoleRow[];
  sdrPeople: PersonRow[];
  sellerPeople: PersonRow[];
};

const defaultOte = (prefix: string, fixed: number[], variable: number[]): RoleRow[] =>
  ['Júnior', 'Pleno', 'Sênior'].map((role, i) => ({
    role: `${prefix} ${role}`,
    fixed: fixed[i],
    variable: variable[i],
  }));

const defaults: State = {
  sellerOte: defaultOte('Vendedor', [2500, 4200, 6300], [2500, 2800, 2700]),
  sdrOte: defaultOte('SDR', [1300, 2100, 3080], [1300, 1400, 1320]),
  coordinatorOte: defaultOte('Coord.', [5250, 6750, 9000], [1750, 2250, 3000]),
  sdrPeople: [
    { name: 'SDR Júnior 01', done: 140, goal: 160, variableAtGoal: 1300 },
    { name: 'SDR Júnior 02', done: 164, goal: 160, variableAtGoal: 1300 },
    { name: 'SDR Pleno 01', done: 202, goal: 400, variableAtGoal: 1400 },
    { name: 'SDR Pleno 02', done: 260, goal: 360, variableAtGoal: 1400 },
    { name: 'SDR Sênior 01', done: 140, goal: 240, variableAtGoal: 1320 },
    { name: 'SDR Sênior 02', done: 290, goal: 240, variableAtGoal: 1320 },
  ],
  sellerPeople: [
    { name: 'Vendedor Júnior 01', done: 30, goal: 70, variableAtGoal: 2500 },
    { name: 'Vendedor Júnior 02', done: 62, goal: 70, variableAtGoal: 2500 },
    { name: 'Vendedor Pleno 01', done: 101, goal: 100, variableAtGoal: 2800 },
    { name: 'Vendedor Pleno 02', done: 92, goal: 100, variableAtGoal: 2800 },
    { name: 'Vendedor Sênior 01', done: 210, goal: 150, variableAtGoal: 2700 },
    { name: 'Vendedor Sênior 02', done: 161, goal: 150, variableAtGoal: 2700 },
  ],
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
              <tr key={row.role} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium">{row.role}</td>
                <td className="py-2 pr-3">
                  <Input
                    type="number"
                    value={row.fixed}
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
                    value={row.variable}
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

function VariableTable({
  title,
  metricLabel,
  people,
  onChange,
}: {
  title: string;
  metricLabel: string;
  people: PersonRow[];
  onChange: (people: PersonRow[]) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto space-y-3">
        <p className="text-sm text-muted-foreground">
          Multiplicador: ≤70% → 0,3 · 71–85% → 0,5 · 86–99% → 0,8 · 100–119% → 1,0 · ≥120% → 2,0
        </p>
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-2">Pessoa</th>
              <th className="py-2 pr-2">{metricLabel}</th>
              <th className="py-2 pr-2">Meta</th>
              <th className="py-2 pr-2">% atingida</th>
              <th className="py-2 pr-2">Valor na meta</th>
              <th className="py-2 pr-2">Multiplicador</th>
              <th className="py-2">Comissão final</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person, idx) => {
              const attainment = safeDiv(person.done, person.goal);
              const mult = commissionMultiplier(attainment);
              const commission = person.variableAtGoal * mult;
              return (
                <tr key={person.name + idx} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2">
                    <Input
                      value={person.name}
                      onChange={e => {
                        const next = [...people];
                        next[idx] = { ...person, name: e.target.value };
                        onChange(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={person.done}
                      onChange={e => {
                        const next = [...people];
                        next[idx] = { ...person, done: Number(e.target.value) || 0 };
                        onChange(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={person.goal}
                      onChange={e => {
                        const next = [...people];
                        next[idx] = { ...person, goal: Number(e.target.value) || 0 };
                        onChange(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2 font-medium">{pct(attainment)}</td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={person.variableAtGoal}
                      onChange={e => {
                        const next = [...people];
                        next[idx] = { ...person, variableAtGoal: Number(e.target.value) || 0 };
                        onChange(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-2">{num(mult, 1)}×</td>
                  <td className="py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                    {money(commission)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function Commissioning() {
  const [state, setState] = usePersistedState<State>('sales-tools:commissioning', defaults);

  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/sales-tools">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
      </Button>

      <BaseHeader
        title="Comissionamento de Vendas 2.0"
        subtitle="Modelo OTE (On Target Earning) com variável para SDR e vendedores, como na planilha."
      />

      <Tabs defaultValue="ote">
        <TabsList>
          <TabsTrigger value="ote">Modelo OTE</TabsTrigger>
          <TabsTrigger value="sdr">Variável SDR</TabsTrigger>
          <TabsTrigger value="seller">Variável Vendedor</TabsTrigger>
        </TabsList>

        <TabsContent value="ote" className="space-y-4 mt-4">
          <OteTable
            title="Vendedores"
            rows={state.sellerOte}
            onChange={sellerOte => setState(prev => ({ ...prev, sellerOte }))}
          />
          <OteTable
            title="SDR (Pré-vendas)"
            rows={state.sdrOte}
            onChange={sdrOte => setState(prev => ({ ...prev, sdrOte }))}
          />
          <OteTable
            title="Coordenadores"
            rows={state.coordinatorOte}
            onChange={coordinatorOte => setState(prev => ({ ...prev, coordinatorOte }))}
          />
        </TabsContent>

        <TabsContent value="sdr" className="mt-4">
          <VariableTable
            title="Variável do time de pré-venda"
            metricLabel="Reuniões qualificadas"
            people={state.sdrPeople}
            onChange={sdrPeople => setState(prev => ({ ...prev, sdrPeople }))}
          />
        </TabsContent>

        <TabsContent value="seller" className="mt-4">
          <VariableTable
            title="Variável do time de vendas"
            metricLabel="Vendas concluídas"
            people={state.sellerPeople}
            onChange={sellerPeople => setState(prev => ({ ...prev, sellerPeople }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
