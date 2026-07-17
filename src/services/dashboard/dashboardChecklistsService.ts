import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface DashboardChecklistUser {
  id: string;
  name: string;
  email?: string;
}

export interface DashboardChecklistItem {
  id: string;
  title: string;
  position: number;
  dashboard_checklist_id?: string;
  completed?: boolean;
  checklist_id?: string;
  checklist_title?: string;
}

export interface DashboardChecklist {
  id: string;
  title: string;
  active: boolean;
  created_by_id: string;
  assignee_ids: string[];
  assignees: DashboardChecklistUser[];
  items: DashboardChecklistItem[];
  created_at?: string;
  updated_at?: string;
}

export interface TodayDashboardChecklistResponse {
  date: string;
  items: DashboardChecklistItem[];
}

export interface DashboardChecklistPayload {
  title: string;
  active?: boolean;
  assignee_ids: string[];
  items: Array<{ id?: string; title: string; position?: number; _destroy?: boolean }>;
}

class DashboardChecklistsService {
  async list(): Promise<DashboardChecklist[]> {
    const response = await api.get('/dashboard_checklists');
    return extractData<DashboardChecklist[]>(response) as unknown as DashboardChecklist[];
  }

  async create(payload: DashboardChecklistPayload): Promise<DashboardChecklist> {
    const response = await api.post('/dashboard_checklists', { dashboard_checklist: payload });
    return extractData<DashboardChecklist>(response) as unknown as DashboardChecklist;
  }

  async update(id: string, payload: Partial<DashboardChecklistPayload>): Promise<DashboardChecklist> {
    const response = await api.patch(`/dashboard_checklists/${id}`, { dashboard_checklist: payload });
    return extractData<DashboardChecklist>(response) as unknown as DashboardChecklist;
  }

  async destroy(id: string): Promise<void> {
    await api.delete(`/dashboard_checklists/${id}`);
  }

  async today(): Promise<TodayDashboardChecklistResponse> {
    const response = await api.get('/dashboard_checklists/today');
    return extractData<TodayDashboardChecklistResponse>(response) as unknown as TodayDashboardChecklistResponse;
  }

  async toggleItem(itemId: string): Promise<DashboardChecklistItem> {
    const response = await api.post(`/dashboard_checklists/items/${itemId}/toggle`);
    return extractData<DashboardChecklistItem>(response) as unknown as DashboardChecklistItem;
  }
}

export const dashboardChecklistsService = new DashboardChecklistsService();
