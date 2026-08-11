import { Navigate } from 'react-router-dom';
import CommissioningDashboard from '@/pages/Customer/Dashboard/sales/CommissioningDashboard';
import { isAdminRole } from '@/constants/roles';
import { useCurrentUser } from '@/utils/auth';
import SalesToolLayout from './SalesToolLayout';

export default function Commissioning() {
  const currentUser = useCurrentUser();
  const canView =
    !!currentUser?.role?.key && isAdminRole(currentUser.role.key);

  if (!canView) {
    return <Navigate to="/sales-tools" replace />;
  }

  return (
    <SalesToolLayout
      title="Comissionamento de Vendas 2.0"
      subtitle="OTE e comissão por atingimento de meta (SDR e vendedores)"
    >
      {year => <CommissioningDashboard year={year} />}
    </SalesToolLayout>
  );
}
