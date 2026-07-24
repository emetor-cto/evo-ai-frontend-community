import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@evoapi/design-system';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelineTaskTemplatesService } from '@/services/pipelines/pipelineTaskTemplatesService';
import type {
  PipelineTaskTemplate,
  PipelineTaskTemplateFormData,
} from '@/types/pipelineTaskTemplates';

const EMPTY_FORM: PipelineTaskTemplateFormData = {
  title: '',
  description: '',
  task_type: 'call',
  priority: 'medium',
  due_in_days: null,
  active: true,
};

export default function PipelineTaskTemplatesPage() {
  const { t } = useLanguage('pipelines');
  const [templates, setTemplates] = useState<PipelineTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PipelineTaskTemplate | null>(null);
  const [form, setForm] = useState<PipelineTaskTemplateFormData>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await pipelineTaskTemplatesService.list());
    } catch (error) {
      console.error(error);
      toast.error(t('taskTemplates.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (template: PipelineTaskTemplate) => {
    setEditing(template);
    setForm({
      title: template.title,
      description: template.description || '',
      task_type: template.task_type,
      priority: template.priority,
      due_in_days: template.due_in_days ?? null,
      active: template.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      if (editing) {
        await pipelineTaskTemplatesService.update(editing.id, form);
        toast.success(t('taskTemplates.updated'));
      } else {
        await pipelineTaskTemplatesService.create(form);
        toast.success(t('taskTemplates.created'));
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      toast.error(t('taskTemplates.saveError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (template: PipelineTaskTemplate) => {
    if (!window.confirm(t('taskTemplates.deleteConfirm'))) return;
    try {
      await pipelineTaskTemplatesService.remove(template.id);
      toast.success(t('taskTemplates.deleted'));
      await load();
    } catch (error) {
      console.error(error);
      toast.error(t('taskTemplates.saveError'));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('taskTemplates.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('taskTemplates.subtitle')}</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('taskTemplates.new')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('taskTemplates.loading')}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            {t('taskTemplates.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map(template => (
              <div
                key={template.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{template.title}</h3>
                    {!template.active && (
                      <span className="text-xs text-muted-foreground">
                        ({t('taskTemplates.inactive')})
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(`tasks.types.${template.task_type}`)} · {t(`tasks.priority.${template.priority}`)}
                    {template.due_in_days != null
                      ? ` · ${t('taskTemplates.dueInDays', { days: template.due_in_days })}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void remove(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('taskTemplates.edit') : t('taskTemplates.new')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('tasks.form.title')} *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('tasks.form.type')}</Label>
                <Select
                  value={form.task_type}
                  onValueChange={v =>
                    setForm({ ...form, task_type: v as PipelineTaskTemplateFormData['task_type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['call', 'email', 'meeting', 'follow_up', 'note', 'other'] as const).map(
                      type => (
                        <SelectItem key={type} value={type}>
                          {t(`tasks.types.${type}`)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('tasks.form.priority')}</Label>
                <Select
                  value={form.priority}
                  onValueChange={v =>
                    setForm({ ...form, priority: v as PipelineTaskTemplateFormData['priority'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as const).map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {t(`tasks.priority.${priority}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('taskTemplates.dueInDaysLabel')}</Label>
              <Input
                type="number"
                min={0}
                value={form.due_in_days ?? ''}
                onChange={e =>
                  setForm({
                    ...form,
                    due_in_days: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder={t('taskTemplates.dueInDaysPlaceholder')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={e => setForm({ ...form, active: e.target.checked })}
              />
              {t('taskTemplates.active')}
            </label>
            <div className="space-y-1.5">
              <Label>{t('tasks.form.description')}</Label>
              <Textarea
                rows={3}
                value={form.description ?? ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('editItem.cancel')}
            </Button>
            <Button onClick={() => void save()} disabled={busy || !form.title.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('editItem.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
