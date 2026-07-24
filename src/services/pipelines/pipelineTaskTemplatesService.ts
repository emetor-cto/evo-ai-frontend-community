import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import type {
  PipelineTaskTemplate,
  PipelineTaskTemplateFormData,
} from '@/types/pipelineTaskTemplates';

class PipelineTaskTemplatesService {
  private readonly baseUrl = '/pipeline_task_templates';

  async list(params?: { active?: boolean }): Promise<PipelineTaskTemplate[]> {
    const response = await api.get(this.baseUrl, { params });
    return (extractData<PipelineTaskTemplate[]>(response) as PipelineTaskTemplate[]) ?? [];
  }

  async create(payload: PipelineTaskTemplateFormData): Promise<PipelineTaskTemplate> {
    const response = await api.post(this.baseUrl, { pipeline_task_template: payload });
    return extractData<PipelineTaskTemplate>(response);
  }

  async update(
    id: string,
    payload: Partial<PipelineTaskTemplateFormData>,
  ): Promise<PipelineTaskTemplate> {
    const response = await api.patch(`${this.baseUrl}/${id}`, {
      pipeline_task_template: payload,
    });
    return extractData<PipelineTaskTemplate>(response);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export const pipelineTaskTemplatesService = new PipelineTaskTemplatesService();
export default pipelineTaskTemplatesService;
