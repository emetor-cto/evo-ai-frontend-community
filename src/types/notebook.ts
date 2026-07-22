export interface TeamFolder {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  children?: TeamFolder[];
}

export interface TeamDocumentAttachment {
  id: string;
  file_type?: string;
  file_url?: string;
  download_url?: string;
  thumb_url?: string;
  extension?: string;
  fallback_title?: string;
}

export interface TeamDocument {
  id: string;
  title: string;
  folder_id: string | null;
  position: number;
  content_json?: unknown[];
  content_text?: string;
  preview?: string;
  created_by_id: string;
  updated_by_id?: string | null;
  created_at: string;
  updated_at: string;
  attachments?: TeamDocumentAttachment[];
}

export interface TeamDocumentListParams {
  folder_id?: string | null;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TeamDocumentUploadResult {
  id: string;
  url: string;
  file_url: string;
  download_url?: string;
  thumb_url?: string;
  file_type?: string;
  filename?: string;
}
