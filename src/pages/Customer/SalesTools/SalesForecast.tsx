import ForecastDashboard from '@/pages/Customer/Dashboard/sales/ForecastDashboard';
import SalesToolLayout from './SalesToolLayout';

export default function SalesForecast() {
  return (
    <SalesToolLayout
      title="Previsibilidade de Vendas 2.0"
      subtitle="Meta × realizado mês a mês no funil"
    >
      {year => <ForecastDashboard year={year} />}
    </SalesToolLayout>
  );
}
