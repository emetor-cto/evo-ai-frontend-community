import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SquareKanban,
  X,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelineTasksService } from '@/services/pipelines/pipelineTasksService';
import { pipelinesService } from '@/services/pipelines';
import { usersService } from '@/services/users';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import type { Pipeline, PipelineTask } from '@/types/analytics';

type StatusFilter = 'open' | PipelineTask['status'] | 'all';
type DueFilter = 'all' | 'today' | 'week' | 'past';

const TASK_TYPES: PipelineTask['task_type'][] = [
  'call',
  'email',
  'meeting',
  'follow_up',
  'note',
  'other',
];
const PRIORITIES: PipelineTask['priority'][] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: PipelineTask['status'][] = ['pending', 'overdue', 'completed', 'cancelled'];

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  overdue: 'destructive',
  completed: 'default',
  cancelled: 'outline',
};

function contactName(task: PipelineTask): string {
  const item = task.pipeline_item as
    | {
        contact?: { name?: string };
        conversation?: { contact?: { name?: string } };
      }
    | undefined;
  return item?.contact?.name || item?.conversation?.contact?.name || '—';
}

function formatDue(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TasksPage() {
  const { t } = useLanguage('tasks');
  const { t: tp } = useLanguage('pipelines');

  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState<PipelineTask['task_type'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PipelineTask['priority'] | 'all'>('all');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [pipes, agents] = await Promise.all([
          pipelinesService.getPipelines({ per_page: 100 }),
          usersService.getUsers({ per_page: 100 }),
        ]);
        setPipelines((pipes.data as Pipeline[]) || []);
        setUsers(
          (agents.data || [])
            .map(u => ({ id: String(u.id), name: u.name || String(u.id) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(() => {
    const out: Record<string, unknown> = {
      page,
      per_page: DEFAULT_PAGE_SIZE,
      hierarchy: 'all',
    };
    if (search) out.q = search;
    if (statusFilter === 'open') out.open = true;
    else if (statusFilter !== 'all') out.status = statusFilter;
    if (typeFilter !== 'all') out.task_type = typeFilter;
    if (priorityFilter !== 'all') out.priority = priorityFilter;
    if (pipelineFilter !== 'all') out.pipeline_id = pipelineFilter;
    if (assigneeFilter !== 'all') out.assigned_to_id = assigneeFilter;
    if (dueFilter === 'today') out.due_today = true;
    if (dueFilter === 'week') out.due_this_week = true;
    if (dueFilter === 'past') out.past_due = true;
    return out;
  }, [
    page,
    search,
    statusFilter,
    typeFilter,
    priorityFilter,
    pipelineFilter,
    assigneeFilter,
    dueFilter,
  ]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pipelineTasksService.getTasks(params as never);
      setTasks(res.data ?? []);
      const pagination = res.meta?.pagination;
      setTotalPages(pagination?.total_pages ?? 1);
      setTotalCount(pagination?.total ?? res.data?.length ?? 0);
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [params, t]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const hasFilters =
    search ||
    statusFilter !== 'open' ||
    typeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    pipelineFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    dueFilter !== 'all';

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('open');
    setTypeFilter('all');
    setPriorityFilter('all');
    setPipelineFilter('all');
    setAssigneeFilter('all');
    setDueFilter('all');
    setPage(1);
  };

  const completeTask = async (task: PipelineTask) => {
    const pipelineId = task.pipeline?.id || task.pipeline_item?.pipeline_id;
    if (!pipelineId) return;
    setActingId(task.id);
    try {
      await pipelineTasksService.completeTask(String(pipelineId), task.id);
      toast.success(t('messages.completeSuccess'));
      await fetchTasks();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.completeError'));
    } finally {
      setActingId(null);
    }
  };

  const reopenTask = async (task: PipelineTask) => {
    const pipelineId = task.pipeline?.id || task.pipeline_item?.pipeline_id;
    if (!pipelineId) return;
    setActingId(task.id);
    try {
      await pipelineTasksService.reopenTask(String(pipelineId), task.id);
      toast.success(t('messages.reopenSuccess'));
      await fetchTasks();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.reopenError'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={v => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t('filters.statusOpen')}</SelectItem>
              <SelectItem value="all">{t('filters.statusAll')}</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {tp(`tasks.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={v => {
              setTypeFilter(v as PipelineTask['task_type'] | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('filters.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.typeAll')}</SelectItem>
              {TASK_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {tp(`tasks.types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={v => {
              setPriorityFilter(v as PipelineTask['priority'] | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.priorityAll')}</SelectItem>
              {PRIORITIES.map(p => (
                <SelectItem key={p} value={p}>
                  {tp(`tasks.priority.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pipelineFilter}
            onValueChange={v => {
              setPipelineFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filters.pipeline')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.pipelineAll')}</SelectItem>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={assigneeFilter}
            onValueChange={v => {
              setAssigneeFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filters.assignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.assigneeAll')}</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dueFilter}
            onValueChange={v => {
              setDueFilter(v as DueFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('filters.due')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.dueAll')}</SelectItem>
              <SelectItem value="today">{t('filters.dueToday')}</SelectItem>
              <SelectItem value="week">{t('filters.dueWeek')}</SelectItem>
              <SelectItem value="past">{t('filters.pastDue')}</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t('filters.clear')}
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t('table.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">{t('table.columns.title')}</th>
                <th className="px-3 py-2">{t('table.columns.status')}</th>
                <th className="px-3 py-2">{t('table.columns.type')}</th>
                <th className="px-3 py-2">{t('table.columns.priority')}</th>
                <th className="px-3 py-2">{t('table.columns.due')}</th>
                <th className="px-3 py-2">{t('table.columns.assignee')}</th>
                <th className="px-3 py-2">{t('table.columns.pipeline')}</th>
                <th className="px-3 py-2">{t('table.columns.contact')}</th>
                <th className="px-3 py-2 text-right">{t('table.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const pipelineId = task.pipeline?.id || task.pipeline_item?.pipeline_id;
                const isOpen = task.status === 'pending' || task.status === 'overdue';
                return (
                  <tr key={task.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium max-w-[220px] truncate">{task.title}</td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[task.status] ?? 'outline'}>
                        {tp(`tasks.status.${task.status}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{tp(`tasks.types.${task.task_type}`)}</td>
                    <td className="px-3 py-2">{tp(`tasks.priority.${task.priority}`)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDue(task.due_date)}</td>
                    <td className="px-3 py-2">{task.assigned_to?.name || '—'}</td>
                    <td className="px-3 py-2">{task.pipeline?.name || '—'}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate">{contactName(task)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {pipelineId && (
                          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <Link to={`/pipelines/${pipelineId}`} title={t('actions.openCard')}>
                              <SquareKanban className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {isOpen ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            disabled={actingId === task.id}
                            onClick={() => void completeTask(task)}
                            title={t('actions.complete')}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : task.status === 'completed' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            disabled={actingId === task.id}
                            onClick={() => void reopenTask(task)}
                            title={t('actions.reopen')}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            {t('pagination.summary', { page, totalPages, totalCount })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              {t('pagination.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
