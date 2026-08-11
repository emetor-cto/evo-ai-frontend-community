import ProspectingDashboard from '@/pages/Customer/Dashboard/sales/ProspectingDashboard';
import SalesToolLayout from './SalesToolLayout';

export default function WeeklyProspecting() {
  return (
    <SalesToolLayout
      title="Prospecção Semanal"
      subtitle="Metas anuais e acompanhamento semana a semana"
    >
      {year => <ProspectingDashboard year={year} />}
    </SalesToolLayout>
  );
}
