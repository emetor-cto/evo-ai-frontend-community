export interface PipelineTaskTemplate {
  id: string;
  title: string;
  description?: string | null;
  task_type: 'call' | 'email' | 'meeting' | 'follow_up' | 'note' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_in_days?: number | null;
  active: boolean;
  position: number;
  created_by_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface PipelineTaskTemplateFormData {
  title: string;
  description?: string;
  task_type: PipelineTaskTemplate['task_type'];
  priority: PipelineTaskTemplate['priority'];
  due_in_days?: number | null;
  active?: boolean;
  position?: number;
}
