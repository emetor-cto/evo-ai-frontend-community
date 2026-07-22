import { useParams } from 'react-router-dom';
import NotebookEditor from '@/components/notebook/NotebookEditor';

export default function NotebookDocumentPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <NotebookEditor documentId={id} />;
}
