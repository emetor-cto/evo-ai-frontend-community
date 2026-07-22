import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import type { Block } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { Button, Input } from '@evoapi/design-system';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useDarkMode } from '@/hooks/useDarkMode';
import { teamNotesService } from '@/services/notebook';
import type { TeamDocument } from '@/types/notebook';

interface NotebookEditorProps {
  documentId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function DocumentBody({
  documentId,
  initialContent,
  onSaveState,
}: {
  documentId: string;
  initialContent: Block[];
  onSaveState: (state: SaveState) => void;
}) {
  const { t } = useLanguage('notebook');
  const { theme } = useDarkMode();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      try {
        const result = await teamNotesService.uploadAttachment(documentId, file);
        return result.url || result.file_url;
      } catch (error) {
        console.error(error);
        toast.error(t('toasts.uploadFailed'));
        throw error;
      }
    },
    [documentId, t],
  );

  const editor = useCreateBlockNote({
    initialContent: initialContent.length > 0 ? initialContent : undefined,
    uploadFile,
  });

  const persistContent = useCallback(async () => {
    onSaveState('saving');
    try {
      await teamNotesService.updateDocument(documentId, {
        content_json: editor.document as unknown as unknown[],
      });
      onSaveState('saved');
    } catch (error) {
      console.error(error);
      onSaveState('error');
      toast.error(t('editor.saveFailed'));
    }
  }, [documentId, editor, onSaveState, t]);

  const scheduleContentSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistContent();
    }, 900);
  }, [persistContent]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return <BlockNoteView editor={editor} theme={theme} onChange={scheduleContentSave} />;
}

export default function NotebookEditor({ documentId }: NotebookEditorProps) {
  const { t } = useLanguage('notebook');
  const navigate = useNavigate();
  const [document, setDocument] = useState<TeamDocument | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await teamNotesService.getDocument(documentId);
        if (cancelled) return;
        setDocument(data);
        setTitle(data.title || '');
      } catch (error) {
        console.error(error);
        toast.error(t('editor.saveFailed'));
        navigate('/notebook');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [documentId, navigate, t]);

  const persistTitle = useCallback(
    async (nextTitle: string) => {
      setSaveState('saving');
      try {
        const updated = await teamNotesService.updateDocument(documentId, {
          title: nextTitle.trim() || t('documents.untitled'),
        });
        setDocument(updated);
        setSaveState('saved');
      } catch (error) {
        console.error(error);
        setSaveState('error');
        toast.error(t('editor.saveFailed'));
      }
    },
    [documentId, t],
  );

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      void persistTitle(value);
    }, 700);
  };

  const saveLabel = useMemo(() => {
    if (saveState === 'saving') return t('editor.saving');
    if (saveState === 'saved') return t('editor.saved');
    if (saveState === 'error') return t('editor.saveFailed');
    return '';
  }, [saveState, t]);

  const initialContent = useMemo(() => {
    if (!document || !Array.isArray(document.content_json)) return [] as Block[];
    return document.content_json as Block[];
  }, [document]);

  if (loading || !document) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t('editor.loading')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/notebook')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('editor.back')}
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">{saveLabel}</div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-8">
        <Input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder={t('editor.titlePlaceholder')}
          className="mb-6 border-0 bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
        />
        <DocumentBody
          key={document.id}
          documentId={document.id}
          initialContent={initialContent}
          onSaveState={setSaveState}
        />
      </div>
    </div>
  );
}
