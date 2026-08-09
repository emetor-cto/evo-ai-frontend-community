import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
  Badge,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@evoapi/design-system';
import {
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  CalendarClock,
  CheckSquare,
  Send,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { contactsService } from '@/services/contacts/contactsService';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import { pipelineTasksService } from '@/services/pipelines/pipelineTasksService';
import { chatService } from '@/services/chat/chatService';
import type { Contact } from '@/types/contacts';
import type { PipelineTask } from '@/types/analytics';
import type { ScheduledAction } from '@/types/automation';

export interface PipelineContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  /** Preferred conversation uuid/id when opening from a card that already has one */
  conversationUuid?: string | null;
  conversationId?: string | null;
  pipelineId?: string | null;
}

type NegotiationRow = {
  pipeline: { id: string; name: string; pipeline_type: string };
  stage: { id: string; name: string; color: string; position: number; stage_type: number };
  item: {
    id: string;
    item_id: string;
    type: string;
    entered_at: number;
    completed_at?: number | null;
    notes: string | null;
    total_value?: number;
  };
};

function formatDateTime(value?: string | number | null) {
  if (value == null || value === '') return '—';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PipelineContactModal({
  open,
  onOpenChange,
  contactId,
  conversationUuid,
  conversationId,
}: PipelineContactModalProps) {
  const { t } = useLanguage('pipelines');
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [negotiations, setNegotiations] = useState<NegotiationRow[]>([]);
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [schedules, setSchedules] = useState<ScheduledAction[]>([]);
  const [lastContactAt, setLastContactAt] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationUuid, setActiveConversationUuid] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const [contactData, pipelinesData, schedulesData, conversationsData] = await Promise.all([
        contactsService.getContact(contactId),
        contactsService.getContactPipelines(contactId),
        scheduledActionsService.listByContact(contactId).catch(() => []),
        contactsService.getContactConversations(contactId, { page: 1 }).catch(() => ({ data: [] })),
      ]);

      setContact(contactData);
      setNegotiations((pipelinesData as NegotiationRow[]) || []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);

      const conversations = (conversationsData as { data?: Array<Record<string, unknown>> })?.data ?? [];
      const sorted = [...conversations].sort((a, b) => {
        const aAt = new Date(String(a.last_activity_at || 0)).getTime();
        const bAt = new Date(String(b.last_activity_at || 0)).getTime();
        return bAt - aAt;
      });
      const latest = sorted[0];
      setLastContactAt(
        latest?.last_activity_at
          ? String(latest.last_activity_at)
          : contactData.last_activity_at
            ? String(contactData.last_activity_at)
            : null,
      );

      const preferred =
        sorted.find(c => String(c.uuid || c.id) === conversationUuid) ||
        sorted.find(c => String(c.id) === conversationId) ||
        latest;
      setActiveConversationId(preferred ? String(preferred.id) : null);
      setActiveConversationUuid(
        preferred ? String(preferred.uuid || preferred.id) : conversationUuid || null,
      );

      // Load open tasks (pending + overdue) for each negotiation.
      // Card badge uses overdue_count separately; filtering only `pending` hid those.
      const rows = (pipelinesData as NegotiationRow[]) || [];
      const limited = rows.slice(0, 12);
      const taskLists = await Promise.all(
        limited.map(async row => {
          const pid = row.pipeline.id;
          try {
            const [pendingRes, overdueRes] = await Promise.all([
              pipelineTasksService.getTasksForItem(pid, row.item.id, { status: 'pending' }),
              pipelineTasksService.getTasksForItem(pid, row.item.id, { status: 'overdue' }),
            ]);
            return [
              ...((pendingRes.data as PipelineTask[]) || []),
              ...((overdueRes.data as PipelineTask[]) || []),
            ];
          } catch {
            return [] as PipelineTask[];
          }
        }),
      );
      setTasks(taskLists.flat());
    } catch (error) {
      console.error(error);
      toast.error(t('contactModal.loadError', 'Não foi possível carregar o contato'));
    } finally {
      setLoading(false);
    }
  }, [contactId, conversationId, conversationUuid, t]);

  useEffect(() => {
    if (open && contactId) {
      setMessage('');
      void load();
    }
  }, [open, contactId, load]);

  const openConversationTab = () => {
    const target = activeConversationUuid || activeConversationId;
    if (!target) {
      toast.error(t('contactModal.noConversation', 'Este contato ainda não tem conversa'));
      return;
    }
    window.open(`/conversations/${target}`, '_blank', 'noopener,noreferrer');
  };

  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;
    if (!activeConversationId) {
      toast.error(t('contactModal.noConversation', 'Este contato ainda não tem conversa'));
      return;
    }
    setSending(true);
    try {
      await chatService.sendMessage(activeConversationId, {
        content,
        message_type: 'outgoing',
        private: false,
      });
      toast.success(t('contactModal.messageSent', 'Mensagem enviada'));
      setMessage('');
      setLastContactAt(new Date().toISOString());
    } catch (error) {
      console.error(error);
      toast.error(t('contactModal.messageError', 'Falha ao enviar mensagem'));
    } finally {
      setSending(false);
    }
  };

  const pendingSchedules = useMemo(
    () => schedules.filter(s => s.status === 'scheduled'),
    [schedules],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {contact?.name || t('contactModal.title', 'Contato')}
          </DialogTitle>
          <DialogDescription>
            {t('contactModal.subtitle', 'Histórico, lembretes e mensagem rápida')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('contactModal.loading', 'Carregando...')}
          </div>
        ) : (
          <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {contact?.phone_number && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone_number}
                </span>
              )}
              {contact?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {t('contactModal.lastContact', 'Último contato')}: {formatDateTime(lastContactAt)}
              </span>
              <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={openConversationTab}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {t('contactModal.openConversation', 'Abrir conversa')}
              </Button>
            </div>

            <Tabs defaultValue="negotiations" className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="negotiations">
                  {t('contactModal.tabs.negotiations', 'Negociações')} ({negotiations.length})
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  {t('contactModal.tabs.tasks', 'Tarefas')} ({tasks.length + pendingSchedules.length})
                </TabsTrigger>
                <TabsTrigger value="message">
                  {t('contactModal.tabs.message', 'Mensagem')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="negotiations" className="flex-1 min-h-0 overflow-hidden mt-3">
                <ScrollArea className="h-[320px] pr-3">
                  {negotiations.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {t('contactModal.emptyNegotiations', 'Nenhuma negociação encontrada')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {negotiations.map(row => (
                        <div
                          key={row.item.id}
                          className="rounded-md border border-border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{row.pipeline.name}</p>
                            <Badge variant="outline" className="shrink-0">
                              {row.stage.name}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                            <span>
                              {t('contactModal.enteredAt', 'Entrou')}: {formatDateTime(row.item.entered_at)}
                            </span>
                            {row.item.completed_at ? (
                              <span>
                                {t('contactModal.completedAt', 'Concluído')}: {formatDateTime(row.item.completed_at)}
                              </span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">
                                {t('contactModal.active', 'Em andamento')}
                              </span>
                            )}
                            {Number(row.item.total_value || 0) > 0 && (
                              <span>
                                {t('contactModal.value', 'Valor')}: R${' '}
                                {Number(row.item.total_value).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tasks" className="flex-1 min-h-0 overflow-hidden mt-3">
                <ScrollArea className="h-[320px] pr-3">
                  {tasks.length === 0 && pendingSchedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {t('contactModal.emptyTasks', 'Nenhuma tarefa ou agendamento')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <div key={task.id} className="rounded-md border border-border p-3">
                          <div className="flex items-start gap-2">
                            <CheckSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-medium truncate">{task.title}</p>
                                {task.status === 'overdue' || task.overdue ? (
                                  <Badge variant="destructive" className="shrink-0">
                                    {t('contactModal.overdue', 'Atrasada')}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {t('contactModal.due', 'Vence')}: {formatDateTime(task.due_date)}
                                {task.priority ? ` · ${task.priority}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingSchedules.map(schedule => (
                        <div key={schedule.id} className="rounded-md border border-border p-3">
                          <div className="flex items-start gap-2">
                            <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {schedule.action_type || t('contactModal.schedule', 'Agendamento')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('contactModal.scheduledFor', 'Agendado para')}:{' '}
                                {formatDateTime(schedule.scheduled_for)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="message" className="mt-3 space-y-3">
                <Textarea
                  rows={5}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t('contactModal.messagePlaceholder', 'Escreva uma mensagem para o contato...')}
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={handleSend} disabled={sending || !message.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {t('contactModal.send', 'Enviar')}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
