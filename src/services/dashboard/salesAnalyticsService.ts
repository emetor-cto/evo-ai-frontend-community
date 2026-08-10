import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export type SalesAnalyticsKind =
  | 'conversion'
  | 'commissioning'
  | 'forecast'
  | 'prospecting';

export interface SalesAnalyticsDashboard<T = Record<string, unknown>> {
  id: string;
  kind: SalesAnalyticsKind;
  year: number;
  data: T;
  live_fields?: string[];
  updated_by_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

class SalesAnalyticsService {
  async get<T = Record<string, unknown>>(
    kind: SalesAnalyticsKind,
    year: number,
  ): Promise<SalesAnalyticsDashboard<T>> {
    const response = await api.get(`/sales_analytics_dashboards/${kind}`, {
      params: { year },
    });
    return extractData<SalesAnalyticsDashboard<T>>(response);
  }

  async save<T = Record<string, unknown>>(
    kind: SalesAnalyticsKind,
    year: number,
    data: T,
  ): Promise<SalesAnalyticsDashboard<T>> {
    const response = await api.put(
      `/sales_analytics_dashboards/${kind}`,
      { sales_analytics_dashboard: { data } },
      { params: { year } },
    );
    return extractData<SalesAnalyticsDashboard<T>>(response);
  }
}

export const salesAnalyticsService = new SalesAnalyticsService();
