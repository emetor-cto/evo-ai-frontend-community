import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, Checkbox } from '@evoapi/design-system';
import { useLanguage } from '@/hooks/useLanguage';
import {
  dashboardChecklistsService,
  type DashboardChecklistItem,
} from '@/services/dashboard/dashboardChecklistsService';

type ChecklistGroup = {
  id: string;
  title: string;
  items: DashboardChecklistItem[];
};

const DashboardTasksCard = () => {
  const { t } = useLanguage('customerDashboard');
  const [items, setItems] = useState<DashboardChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await dashboardChecklistsService.today();
      setItems(response?.items || []);
    } catch (error) {
      console.error('Error loading dashboard checklist:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo<ChecklistGroup[]>(() => {
    const byChecklist = new Map<string, ChecklistGroup>();

    items.forEach(item => {
      const id = item.checklist_id || item.dashboard_checklist_id || 'default';
      const title = item.checklist_title?.trim() || t('dashboard.tasks.title');
      const existing = byChecklist.get(id);
      if (existing) {
        existing.items.push(item);
        return;
      }
      byChecklist.set(id, { id, title, items: [item] });
    });

    return Array.from(byChecklist.values());
  }, [items, t]);

  const handleToggle = async (item: DashboardChecklistItem) => {
    if (togglingId) return;
    setTogglingId(item.id);
    setItems(prev =>
      prev.map(row => (row.id === item.id ? { ...row, completed: !row.completed } : row)),
    );
    try {
      const updated = await dashboardChecklistsService.toggleItem(item.id);
      setItems(prev =>
        prev.map(row => (row.id === item.id ? { ...row, completed: !!updated.completed } : row)),
      );
    } catch (error) {
      console.error(error);
      setItems(prev =>
        prev.map(row => (row.id === item.id ? { ...row, completed: item.completed } : row)),
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('dashboard.tasks.loading')}
        </CardContent>
      </Card>
    );
  }

  if (!groups.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => (
        <Card key={group.id} className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="h-4 w-4 text-slate-700" />
              <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
            </div>
            <ul className="space-y-3">
              {group.items.map(item => {
                const completed = !!item.completed;
                return (
                  <li key={item.id}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={completed}
                        disabled={togglingId === item.id}
                        onCheckedChange={() => handleToggle(item)}
                        className="mt-0.5"
                      />
                      <span className={completed ? 'text-slate-400 line-through' : 'text-slate-800'}>
                        {item.title}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardTasksCard;
