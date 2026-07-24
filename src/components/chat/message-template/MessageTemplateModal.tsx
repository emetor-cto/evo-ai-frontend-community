import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@evoapi/design-system/dialog';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import GlobalMessageTemplateService from '@/services/messageTemplates/globalMessageTemplatesService';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import TemplatesPicker from './TemplatesPicker';
import TemplateParser from './TemplateParser';
import { MessageTemplate } from '@/types';

interface MessageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxId: string;
  channelType?: string;
  isWhatsAppCloud?: boolean;
  onSend: (payload: {
    message: string;
    templateParams?: {
      id: string;
      name: string;
      category: string;
      language: string;
      namespace: string;
      processed_params: Record<string, string>;
    };
  }) => void;
}

function mergeTemplates(
  inboxTemplates: MessageTemplate[],
  globalTemplates: MessageTemplate[],
): MessageTemplate[] {
  const byId = new Map<string, MessageTemplate>();
  for (const template of [...globalTemplates, ...inboxTemplates]) {
    if (!template?.id) continue;
    byId.set(template.id, template);
  }
  return Array.from(byId.values()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
  );
}

const MessageTemplateModal: React.FC<MessageTemplateModalProps> = ({
  isOpen,
  onClose,
  inboxId,
  channelType,
  isWhatsAppCloud,
  onSend,
}) => {
  const { t } = useLanguage('chat');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proccessOpenDialog, setProccessOpenDialog] = useState(false);

  // Carregar templates quando o modal abre
  useEffect(() => {
    if (!isOpen) {
      // Resetar estado quando o modal fecha
      setSelectedTemplate(null);
      setProccessOpenDialog(false);
      return;
    }

    if (!inboxId) {
      return;
    }

    // Resetar estado interno quando o modal abre
    setSelectedTemplate(null);
    setProccessOpenDialog(false);
    setIsLoading(true);

    let cancelled = false;

    const loadTemplates = async () => {
      try {
        const [inboxResponse, globalResponse] = await Promise.all([
          MessageTemplateService.getTemplates(inboxId, { per_page: 100 }).catch(() => null),
          // Global Settings templates (channel_id nil) are excluded from inbox-scoped
          // lists — merge them so Evolution/Go (and other non-Cloud) chats can pick them.
          GlobalMessageTemplateService.getTemplates({ per_page: 100 }).catch(() => null),
        ]);

        if (cancelled) return;

        const inboxTemplates = inboxResponse?.data || [];
        const globalTemplates = isWhatsAppCloud
          ? []
          : (globalResponse?.data || []).filter(template => template.active !== false);
        const templates = mergeTemplates(inboxTemplates, globalTemplates);

        if (templates.length === 0) {
          toast.info(t('messageTemplates.noTemplates'));
          onClose();
          return;
        }

        if (cancelled) return;

        setTemplates(templates);
        setProccessOpenDialog(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading templates:', error);
        toast.error(t('messageTemplates.errors.loadError'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [isOpen, inboxId, isWhatsAppCloud, t, onClose]);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
  };

  const handleResetTemplate = () => {
    setSelectedTemplate(null);
  };

  const handleSendMessage = async (payload: {
    message: string;
    templateParams: {
      id: string;
      name: string;
      category: string;
      language: string;
      namespace: string;
      processed_params: Record<string, string>;
    };
  }) => {
    try {
      setIsLoading(true);
      await onSend(payload);
      // Fechar modal após envio bem-sucedido
      setSelectedTemplate(null);
      setProccessOpenDialog(false);
      onClose();
    } catch (error) {
      console.error('[MessageTemplateModal] Error sending template message:', error);
      toast.error(t('messageTemplates.errors.sendError'));
    } finally {
      setIsLoading(false);
    }
  };

  const modalTitle = selectedTemplate
    ? t('messageTemplates.modal.templateSelectedSubtitle', {
        templateName: selectedTemplate.name,
      })
    : t('messageTemplates.modal.subtitle');

  return (
    <Dialog
      open={proccessOpenDialog}
      onOpenChange={open => {
        if (!open) {
          setProccessOpenDialog(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('messageTemplates.modal.title')}</DialogTitle>
          <DialogDescription>{modalTitle}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : selectedTemplate ? (
            <TemplateParser
              template={selectedTemplate}
              channelType={channelType}
              onSend={handleSendMessage}
              onReset={handleResetTemplate}
              loading={isLoading}
            />
          ) : (
            <TemplatesPicker
              isWhatsAppCloud={isWhatsAppCloud}
              templates={templates}
              onSelect={handleSelectTemplate}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessageTemplateModal;
