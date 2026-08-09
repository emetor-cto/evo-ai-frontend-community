import { Link } from 'react-router-dom';
import { Calculator, Percent, Target, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';

const tools = [
  {
    title: 'Calculadora de Conversão',
    description:
      'Descubra as taxas de conversão do funil e quantos leads mensais precisa para bater a meta anual.',
    href: '/sales-tools/conversion-calculator',
    icon: Calculator,
  },
  {
    title: 'Comissionamento de Vendas 2.0',
    description:
      'Monte o OTE (fixo + variável) e calcule a comissão de SDR e vendedores por atingimento de meta.',
    href: '/sales-tools/commissioning',
    icon: Percent,
  },
  {
    title: 'Previsibilidade de Vendas 2.0',
    description:
      'Acompanhe meta × realizado mês a mês no funil (visitantes → leads → oportunidades → vendas).',
    href: '/sales-tools/sales-forecast',
    icon: Target,
  },
  {
    title: 'Prospecção Semanal',
    description:
      'Defina metas anuais, acompanhe semana a semana e mantenha a lista de leads prospectados.',
    href: '/sales-tools/weekly-prospecting',
    icon: CalendarRange,
  },
];

export default function SalesToolsHub() {
  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <BaseHeader
        title="Ferramentas Comerciais"
        subtitle="Planilhas de conversão, comissão, previsibilidade e prospecção — no CRM"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map(tool => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} to={tool.href} className="block group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </span>
                    {tool.title}
                  </CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary">Abrir ferramenta →</CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
