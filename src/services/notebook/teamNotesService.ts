import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  TeamDocument,
  TeamDocumentListParams,
  TeamDocumentUploadResult,
  TeamFolder,
} from '@/types/notebook';

class TeamNotesService {
  private readonly foldersUrl = '/team_folders';
  private readonly documentsUrl = '/team_documents';

  async getFolderTree(): Promise<TeamFolder[]> {
    const response = await api.get(this.foldersUrl, { params: { tree: true } });
    return (extractData<TeamFolder[]>(response) as TeamFolder[]) ?? [];
  }

  async createFolder(payload: {
    name: string;
    parent_id?: string | null;
    position?: number;
  }): Promise<TeamFolder> {
    const response = await api.post(this.foldersUrl, { team_folder: payload });
    return extractData<TeamFolder>(response);
  }

  async updateFolder(
    id: string,
    payload: Partial<{ name: string; parent_id: string | null; position: number }>,
  ): Promise<TeamFolder> {
    const response = await api.patch(`${this.foldersUrl}/${id}`, { team_folder: payload });
    return extractData<TeamFolder>(response);
  }

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`${this.foldersUrl}/${id}`);
  }

  async getDocuments(params?: TeamDocumentListParams) {
    const response = await api.get(this.documentsUrl, { params });
    return extractResponse<TeamDocument>(response);
  }

  async getDocument(id: string): Promise<TeamDocument> {
    const response = await api.get(`${this.documentsUrl}/${id}`);
    return extractData<TeamDocument>(response);
  }

  async createDocument(payload: {
    title?: string;
    folder_id?: string | null;
    content_json?: unknown[];
  }): Promise<TeamDocument> {
    const response = await api.post(this.documentsUrl, { team_document: payload });
    return extractData<TeamDocument>(response);
  }

  async updateDocument(
    id: string,
    payload: Partial<{
      title: string;
      folder_id: string | null;
      position: number;
      content_json: unknown[];
    }>,
  ): Promise<TeamDocument> {
    const response = await api.patch(`${this.documentsUrl}/${id}`, {
      team_document: payload,
    });
    return extractData<TeamDocument>(response);
  }

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`${this.documentsUrl}/${id}`);
  }

  async uploadAttachment(documentId: string, file: File): Promise<TeamDocumentUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`${this.documentsUrl}/${documentId}/attach`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<TeamDocumentUploadResult>(response);
  }
}

export const teamNotesService = new TeamNotesService();
export default teamNotesService;
