import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@evoapi/design-system';
import {
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { teamNotesService } from '@/services/notebook';
import type { TeamDocument, TeamFolder } from '@/types/notebook';

function flattenFolders(folders: TeamFolder[], depth = 0): Array<TeamFolder & { depth: number }> {
  return folders.flatMap(folder => [
    { ...folder, depth },
    ...flattenFolders(folder.children || [], depth + 1),
  ]);
}

export default function NotebookPage() {
  const { t } = useLanguage('notebook');
  const navigate = useNavigate();
  const [folders, setFolders] = useState<TeamFolder[]>([]);
  const [documents, setDocuments] = useState<TeamDocument[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<TeamFolder | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFolders = useCallback(async () => {
    const tree = await teamNotesService.getFolderTree();
    setFolders(tree);
  }, []);

  const loadDocuments = useCallback(async () => {
    const response = await teamNotesService.getDocuments({
      // Empty string keeps folder_id in the query so the API scopes to root.
      folder_id: search ? undefined : (selectedFolderId ?? ''),
      q: search || undefined,
      pageSize: 100,
    });
    setDocuments((response.data as TeamDocument[]) || []);
  }, [search, selectedFolderId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadFolders(), loadDocuments()]);
    } catch (error) {
      console.error(error);
      toast.error(t('editor.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadDocuments, loadFolders, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderDialogOpen(true);
  };

  const openRenameFolder = (folder: TeamFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const saveFolder = async () => {
    if (!folderName.trim()) return;
    setBusy(true);
    try {
      if (editingFolder) {
        await teamNotesService.updateFolder(editingFolder.id, { name: folderName.trim() });
        toast.success(t('toasts.folderUpdated'));
      } else {
        await teamNotesService.createFolder({
          name: folderName.trim(),
          parent_id: selectedFolderId,
        });
        toast.success(t('toasts.folderCreated'));
      }
      setFolderDialogOpen(false);
      await loadFolders();
    } catch (error) {
      console.error(error);
      toast.error(t('editor.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = async (folder: TeamFolder) => {
    if (!window.confirm(t('folders.deleteConfirm'))) return;
    try {
      await teamNotesService.deleteFolder(folder.id);
      toast.success(t('toasts.folderDeleted'));
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('editor.saveFailed'));
    }
  };

  const createDocument = async () => {
    setBusy(true);
    try {
      const doc = await teamNotesService.createDocument({
        title: t('documents.untitled'),
        folder_id: selectedFolderId,
        content_json: [],
      });
      toast.success(t('toasts.documentCreated'));
      navigate(`/notebook/${doc.id}`);
    } catch (error) {
      console.error(error);
      toast.error(t('editor.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const deleteDocument = async (doc: TeamDocument) => {
    if (!window.confirm(t('documents.deleteConfirm'))) return;
    try {
      await teamNotesService.deleteDocument(doc.id);
      toast.success(t('toasts.documentDeleted'));
      await loadDocuments();
    } catch (error) {
      console.error(error);
      toast.error(t('editor.saveFailed'));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openCreateFolder} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              {t('folders.new')}
            </Button>
            <Button onClick={createDocument} disabled={busy} className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              {t('documents.new')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-72 shrink-0 border-r bg-card/40 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('folders.title')}
          </div>
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
              selectedFolderId === null ? 'bg-accent' : 'hover:bg-accent/60'
            }`}
          >
            <Folder className="h-4 w-4" />
            {t('folders.root')}
          </button>
          {flatFolders.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">{t('folders.empty')}</p>
          ) : (
            flatFolders.map(folder => (
              <div key={folder.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(folder.id)}
                  style={{ paddingLeft: `${8 + folder.depth * 12}px` }}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm ${
                    selectedFolderId === folder.id ? 'bg-accent' : 'hover:bg-accent/60'
                  }`}
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <button
                  type="button"
                  className="rounded p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                  onClick={() => openRenameFolder(folder)}
                  title={t('folders.rename')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                  onClick={() => void deleteFolder(folder)}
                  title={t('folders.delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </aside>

        <main className="min-w-0 flex-1 p-6">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('editor.loading')}
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              {t('documents.empty')}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="group rounded-lg border bg-card p-4 transition hover:border-primary/40"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => navigate(`/notebook/${doc.id}`)}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="truncate font-medium">{doc.title}</h3>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {doc.preview || doc.content_text || '—'}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {t('documents.updated', {
                        date: new Date(doc.updated_at).toLocaleString(),
                      })}
                    </p>
                  </button>
                  <div className="mt-3 flex justify-end opacity-0 transition group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-destructive"
                      onClick={() => void deleteDocument(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('documents.delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? t('folders.rename') : t('folders.new')}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            placeholder={t('folders.namePlaceholder')}
            onKeyDown={e => {
              if (e.key === 'Enter') void saveFolder();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => void saveFolder()} disabled={busy || !folderName.trim()}>
              {editingFolder ? t('actions.save') : t('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
