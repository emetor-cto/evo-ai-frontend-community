import ConversionDashboard from '@/pages/Customer/Dashboard/sales/ConversionDashboard';
import SalesToolLayout from './SalesToolLayout';

export default function ConversionCalculator() {
  return (
    <SalesToolLayout
      title="Calculadora de Conversão"
      subtitle="Taxas do funil e leads mensais necessários para a meta"
    >
      {year => <ConversionDashboard year={year} />}
    </SalesToolLayout>
  );
}
