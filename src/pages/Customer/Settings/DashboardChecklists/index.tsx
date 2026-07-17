import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckSquare, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
} from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import EmptyState from '@/components/base/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { usersService } from '@/services/users';
import {
  dashboardChecklistsService,
  type DashboardChecklist,
  type DashboardChecklistPayload,
} from '@/services/dashboard/dashboardChecklistsService';

type DraftItem = { id?: string; title: string; key: string };

const newDraftItem = (title = ''): DraftItem => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title,
});

export default function DashboardChecklistsSettings() {
  const { t } = useLanguage('dashboardChecklists');
  const [checklists, setChecklists] = useState<DashboardChecklist[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardChecklist | null>(null);
  const [deleting, setDeleting] = useState<DashboardChecklist | null>(null);

  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, usersResponse] = await Promise.all([
        dashboardChecklistsService.list(),
        usersService.getUsers({ page: 1, per_page: 200, sort: 'name', order: 'asc' }),
      ]);
      setChecklists(Array.isArray(list) ? list : []);
      setUsers(
        (usersResponse.data || []).map(user => ({
          id: user.id,
          name: user.available_name || user.name,
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setActive(true);
    setAssigneeIds([]);
    setItems([newDraftItem()]);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (checklist: DashboardChecklist) => {
    setEditing(checklist);
    setTitle(checklist.title);
    setActive(checklist.active);
    setAssigneeIds(checklist.assignee_ids || []);
    setItems(
      (checklist.items || []).length
        ? checklist.items.map(item => ({ id: item.id, title: item.title, key: item.id }))
        : [newDraftItem()],
    );
    setModalOpen(true);
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
  };

  const payload = useMemo<DashboardChecklistPayload>(
    () => ({
      title: title.trim(),
      active,
      assignee_ids: assigneeIds,
      items: items
        .map((item, index) => ({
          id: item.id,
          title: item.title.trim(),
          position: index,
        }))
        .filter(item => item.title.length > 0),
    }),
    [title, active, assigneeIds, items],
  );

  const handleSave = async () => {
    if (!payload.title) {
      toast.error(t('messages.validationTitle'));
      return;
    }
    if (!payload.items.length) {
      toast.error(t('messages.validationItems'));
      return;
    }
    if (!payload.assignee_ids.length) {
      toast.error(t('messages.validationAssignees'));
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await dashboardChecklistsService.update(editing.id, payload);
      } else {
        await dashboardChecklistsService.create(payload);
      }
      toast.success(t('messages.saved'));
      setModalOpen(false);
      resetForm();
      await load();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await dashboardChecklistsService.destroy(deleting.id);
      toast.success(t('messages.deleted'));
      setDeleteOpen(false);
      setDeleting(null);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(t('messages.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-6">
      <BaseHeader
        title={t('title')}
        subtitle={t('subtitle')}
        primaryAction={{
          label: t('create'),
          onClick: openCreate,
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('title')}...
        </div>
      ) : checklists.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('empty')}
          description={t('emptyDescription')}
          action={{
            label: t('create'),
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="grid gap-3">
          {checklists.map(checklist => (
            <Card key={checklist.id}>
              <CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{checklist.title}</h3>
                    <Badge variant={checklist.active ? 'default' : 'secondary'}>
                      {checklist.active ? t('table.active') : t('table.inactive')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {checklist.items?.length || 0} {t('table.items').toLowerCase()} ·{' '}
                    {(checklist.assignees || []).map(user => user.name).join(', ') || t('table.assignees')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(checklist)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeleting(checklist);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit') : t('create')}</DialogTitle>
            <DialogDescription>{t('subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('form.title')}</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('form.titlePlaceholder')}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>{t('form.active')}</Label>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>

            <div className="space-y-2">
              <Label>{t('form.assignees')}</Label>
              <p className="text-xs text-slate-500">{t('form.assigneesHint')}</p>
              <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={assigneeIds.includes(user.id)}
                      onCheckedChange={() => toggleAssignee(user.id)}
                    />
                    <span>{user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('form.items')}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems(prev => [...prev, newDraftItem()])}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('form.addItem')}
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.key} className="flex gap-2">
                    <Input
                      value={item.title}
                      placeholder={t('form.itemPlaceholder')}
                      onChange={e =>
                        setItems(prev =>
                          prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={items.length === 1}
                      onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete.title')}</DialogTitle>
            <DialogDescription>{t('confirmDelete.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
