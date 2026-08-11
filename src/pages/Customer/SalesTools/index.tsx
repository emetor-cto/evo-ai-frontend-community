import { Link } from 'react-router-dom';
import { Calculator, Percent, Target, CalendarRange } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export default function SalesToolsHub() {
  const { t } = useLanguage('layout');

  const tools = [
    {
      title: t('menu.salesTools.conversion'),
      description:
        'Descubra as taxas de conversão do funil e quantos leads mensais precisa para bater a meta anual.',
      href: '/sales-tools/conversion-calculator',
      icon: Calculator,
    },
    {
      title: t('menu.salesTools.commissioning'),
      description:
        'Monte o OTE (fixo + variável) e calcule a comissão de SDR e vendedores por atingimento de meta.',
      href: '/sales-tools/commissioning',
      icon: Percent,
    },
    {
      title: t('menu.salesTools.forecast'),
      description:
        'Acompanhe meta × realizado mês a mês no funil (visitantes → leads → oportunidades → vendas).',
      href: '/sales-tools/sales-forecast',
      icon: Target,
    },
    {
      title: t('menu.salesTools.prospecting'),
      description:
        'Defina metas anuais, acompanhe semana a semana e mantenha o ritmo de prospecção.',
      href: '/sales-tools/weekly-prospecting',
      icon: CalendarRange,
    },
  ];

  return (
    <div className="h-full flex flex-col p-4 gap-6 overflow-auto">
      <BaseHeader
        title={t('menu.customer.salesTools')}
        subtitle="Conversão, comissão, previsibilidade e prospecção — com dados live do CRM"
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
