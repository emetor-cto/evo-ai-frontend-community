import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAccountUsers } from '@/hooks/useAccountUsers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import { Plus, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { PipelineItem, PipelineStage, Pipeline, PipelineTask, CreateTaskData, UpdateTaskData } from '@/types/analytics';
import { productsService } from '@/services/products/productsService';
import type { Product } from '@/types/products';
import { formatProductAmount } from '@/utils/products/formatProductPrice';
import PipelineItemCustomAttributes from './PipelineItemCustomAttributes';
import PipelineTasksList, { PipelineTasksListRef } from './tasks/PipelineTasksList';
import CreateTaskModal from './tasks/CreateTaskModal';
import EditTaskModal from './tasks/EditTaskModal';

interface Service {
  name: string;
  value: string;
  product_id?: string;
  /** Monetary commission amount (derived from value × percent / 100). */
  commission?: string;
  /** Commission percentage of the sale value (0–100). */
  commission_percent?: string;
}

function commissionAmountFrom(value: string, percent: string | undefined): string {
  const v = parseFloat(value) || 0;
  const p = parseFloat(percent || '0') || 0;
  const amount = (v * p) / 100;
  return Number.isFinite(amount) ? String(Number(amount.toFixed(6))) : '0';
}

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PipelineItem | null;
  stages: PipelineStage[];
  pipeline?: Pipeline | null;
  onSubmit: (data: {
    notes: string;
    stage_id: string;
    services: Service[];
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => void;
  loading: boolean;
}

export default function EditItemModal({
  open,
  onOpenChange,
  item,
  stages,
  pipeline,
  onSubmit,
  loading,
}: EditItemModalProps) {
  const { t } = useLanguage('pipelines');
  const { users } = useAccountUsers();
  const [notes, setNotes] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState('details');
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [openServicePopover, setOpenServicePopover] = useState<number | null>(null);

  // Task modals state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<PipelineTask | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<PipelineTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Reference to tasks list to refresh after operations
  const tasksListRef = useRef<PipelineTasksListRef>(null);

  // Update counts when ref changes
  useEffect(() => {
    const updateCounts = () => {
      if (tasksListRef.current) {
        setPendingCount(tasksListRef.current.pendingCount);
        setOverdueCount(tasksListRef.current.overdueCount);
      }
    };

    // Initial update
    updateCounts();

    // Listen for count changes
    const handleCountChange = () => updateCounts();
    window.addEventListener('tasksCountChanged', handleCountChange);

    return () => {
      window.removeEventListener('tasksCountChanged', handleCountChange);
    };
  }, []);

  // Initialize form when modal opens or item changes
  useEffect(() => {
    let cancelled = false;

    if (open && item) {
      setNotes(item.notes || '');
      setSelectedStageId(item.stage_id);
      setServices(
        (item.custom_fields?.services || []).map((s: Record<string, unknown>) => ({
          name: String(s.name ?? ''),
          value: String(s.value ?? ''),
          product_id: s.product_id != null ? String(s.product_id) : undefined,
          commission: s.commission != null ? String(s.commission) : undefined,
          commission_percent:
            s.commission_percent != null ? String(s.commission_percent) : undefined,
        })),
      );
      setCurrency(item.custom_fields?.currency || 'BRL');

      // Extract custom attributes from custom_fields (backend stores them together)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { services: _services, currency: _currency, ...customAttrs } = item.custom_fields || {};
      setCustomAttributes(customAttrs);

      // Load products catalog for the Services tab
      productsService
        .getProducts({ per_page: 500, status: 'active' })
        .then((response) => {
          if (!cancelled) setProductsCatalog((response.data as Product[]) || []);
        })
        .catch(() => {
          if (!cancelled) setProductsCatalog([]);
        });
    }

    return () => { cancelled = true; };
  }, [open, item]);

  const handleSubmit = () => {
    if (!selectedStageId) return;

    onSubmit({
      notes,
      stage_id: selectedStageId,
      services,
      currency,
      custom_attributes: customAttributes,
    });
  };

  // Service management
  const addService = () => {
    setServices([...services, { name: '', value: '' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (
    index: number,
    field: 'name' | 'value' | 'commission' | 'commission_percent',
    value: string,
  ) => {
    const updatedServices = [...services];
    const current = { ...updatedServices[index], [field]: value };

    if (field === 'value' || field === 'commission_percent') {
      current.commission = commissionAmountFrom(current.value, current.commission_percent);
    } else if (field === 'commission') {
      // Legacy manual money edit — clear percent so totals use the explicit amount.
      current.commission_percent = undefined;
    }

    updatedServices[index] = current;
    setServices(updatedServices);
  };

  const selectProduct = (index: number, product: Product) => {
    const value = String(product.default_price ?? 0);
    const percent = String(product.commission ?? 0);
    const updatedServices = [...services];
    updatedServices[index] = {
      name: product.name,
      value,
      product_id: product.id,
      commission_percent: percent,
      commission: commissionAmountFrom(value, percent),
    };
    setServices(updatedServices);
    // Selecting a product drives the card BRL total via services values.
    setCurrency(product.currency || 'BRL');
    setOpenServicePopover(null);
  };

  const calculateTotalValue = () => {
    return services.reduce((total, service) => {
      return total + (parseFloat(service.value) || 0);
    }, 0);
  };

  const calculateTotalCommission = () => {
    return services.reduce((total, service) => {
      if (service.commission_percent != null && service.commission_percent !== '') {
        return total + (parseFloat(commissionAmountFrom(service.value, service.commission_percent)) || 0);
      }
      return total + (parseFloat(service.commission || '0') || 0);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const canSubmit = selectedStageId !== null;

  if (!item) return null;

  // Get display name based on item type
  const getItemDisplayName = () => {
    if (item.type === 'contact' || !item.conversation) {
      return item.contact?.name || t('editItem.unknownUser');
    }
    return item.conversation?.contact?.name || t('editItem.unknownUser');
  };

  const getItemDisplayId = () => {
    if (item.type === 'conversation' && item.conversation) {
      return item.conversation.display_id;
    }
    return item.id;
  };

  // Task handlers
  const handleCreateTask = async (data: CreateTaskData) => {
    if (!tasksListRef.current) return;

    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.createTask(data);
      if (result) {
        setShowCreateTaskModal(false);
        // List will auto-update via the hook
      }
    } finally {
      setTaskLoading(false);
    }
  };

  const handleEditTask = async (taskId: string, data: UpdateTaskData) => {
    if (!tasksListRef.current) return;

    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.updateTask(taskId, data);
      if (result) {
        setShowEditTaskModal(false);
        setTaskToEdit(null);
        // List will auto-update via the hook
      }
    } finally {
      setTaskLoading(false);
    }
  };

  const handleEditTaskClick = (task: PipelineTask) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };

  const handleAddSubtaskClick = (parentTask: PipelineTask) => {
    setParentTaskForSubtask(parentTask);
    setShowCreateTaskModal(true);
  };

  const handleCreateTaskModalClose = () => {
    setShowCreateTaskModal(false);
    setParentTaskForSubtask(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('editItem.title')}</DialogTitle>
          <DialogDescription>{t('editItem.description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">{t('editItem.tabs.details')}</TabsTrigger>
            <TabsTrigger value="services">{t('editItem.tabs.services')}</TabsTrigger>
            <TabsTrigger value="attributes">{t('editItem.tabs.attributes')}</TabsTrigger>
            <TabsTrigger value="tasks" className="relative">
              {t('editItem.tabs.tasks')}
              {(pendingCount > 0 || overdueCount > 0) && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                  {pendingCount + overdueCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="py-4 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Item Info (read-only) */}
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <h4 className="font-medium text-foreground mb-2">
                {getItemDisplayName()}
              </h4>
              <p className="text-sm text-muted-foreground">
                #{getItemDisplayId()}
              </p>
            </div>

            {/* Current Stage */}
            <div className="grid gap-2">
              <Label>{t('editItem.currentStage')}</Label>
              <Select
                value={selectedStageId?.toString()}
                onValueChange={value => setSelectedStageId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('editItem.chooseStage')} />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Selection */}
            <div className="grid gap-2">
              <Label>{t('editItem.currency')}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">{t('editItem.currencies.brl')}</SelectItem>
                  <SelectItem value="USD">{t('editItem.currencies.usd')}</SelectItem>
                  <SelectItem value="EUR">{t('editItem.currencies.eur')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t('editItem.notes')}</Label>
              <Textarea
                placeholder={t('editItem.notesPlaceholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="py-4 space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{t('editItem.services')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('editItem.servicesDescription') || 'Gerencie os serviços associados a este item'}
                </p>
              </div>
              <Button type="button" size="sm" onClick={addService} className="h-8">
                <Plus className="w-4 h-4 mr-1" />
                {t('editItem.addService')}
              </Button>
            </div>

            {services.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
                {t('editItem.noServices')}
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div key={index} className="border border-border rounded-lg p-3">
                    <div className="flex gap-2 mb-2">
                      <Popover
                        open={openServicePopover === index}
                        onOpenChange={(isOpen) => setOpenServicePopover(isOpen ? index : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openServicePopover === index}
                            className="flex-1 justify-between font-normal"
                          >
                            <span className={service.name ? '' : 'text-muted-foreground'}>
                              {service.name || t('editItem.serviceName')}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command filter={(value, search) => {
                            const product = productsCatalog.find(p => p.id === value);
                            if (!product) return 0;
                            if (product.name.toLowerCase().includes(search.toLowerCase())) return 1;
                            return 0;
                          }}>
                            <CommandInput
                              placeholder={t('editItem.searchProduct') || 'Buscar produto...'}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <span>{t('editItem.noProductsFound') || 'Nenhum produto encontrado'}</span>
                              </CommandEmpty>
                              {productsCatalog.length > 0 && (
                                <CommandGroup heading={t('editItem.productsCatalog') || 'Produtos'}>
                                  {productsCatalog.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={product.id}
                                      onSelect={() => selectProduct(index, product)}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          service.product_id === product.id ? 'opacity-100' : 'opacity-0'
                                        }`}
                                      />
                                      <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {product.currency} {formatProductAmount(Number(product.default_price || 0))}
                                          {Number(product.commission || 0) > 0
                                            ? ` · ${t('editItem.commission') || 'Comissão'}: ${formatProductAmount(Number(product.commission))}%`
                                            : ''}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeService(index)}
                        className="px-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder={t('editItem.serviceValue')}
                        value={service.value}
                        onChange={e => updateService(index, 'value', e.target.value)}
                        step="0.01"
                        min="0"
                      />
                      <Input
                        type="number"
                        placeholder={t('editItem.commission') || 'Comissão (%)'}
                        value={service.commission_percent || ''}
                        onChange={e => updateService(index, 'commission_percent', e.target.value)}
                        step="0.01"
                        min="0"
                        max="100"
                      />
                    </div>
                    {(parseFloat(service.commission_percent || '0') > 0 ||
                      parseFloat(service.commission || '0') > 0) && (
                      <p className="text-xs text-muted-foreground">
                        {t('editItem.commissionAmountHint', {
                          currency,
                          amount: formatCurrency(
                            parseFloat(
                              service.commission_percent
                                ? commissionAmountFrom(service.value, service.commission_percent)
                                : service.commission || '0',
                            ) || 0,
                          ),
                        })}
                      </p>
                    )}
                  </div>
                ))}

                {/* Total Value Display */}
                <div className="pt-3 border-t border-border space-y-1">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-muted-foreground">{t('editItem.totalValue')}</span>
                    <span className="text-green-600 dark:text-green-400">
                      {currency} {formatCurrency(calculateTotalValue())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('editItem.totalCommission') || 'Comissão total'}</span>
                    <span className="text-muted-foreground">
                      {currency} {formatCurrency(calculateTotalCommission())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Attributes Tab */}
          <TabsContent value="attributes" className="py-4 overflow-y-auto max-h-[60vh]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">{t('editItem.customAttributes')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('editItem.attributesDescription')}
              </p>
            </div>
            <PipelineItemCustomAttributes
              attributes={customAttributes}
              onAttributesChange={setCustomAttributes}
              disabled={loading}
              pipelineId={item.pipeline_id}
              stageId={item.stage_id}
              itemId={item.id}
              pipelineCustomFields={pipeline?.custom_fields}
              stageCustomFields={stages.find(s => s.id === item.stage_id)?.custom_fields}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="py-4 overflow-y-auto max-h-[60vh]">
            {item && (
              <PipelineTasksList
                ref={tasksListRef}
                pipelineId={item.pipeline_id}
                pipelineItemId={item.id}
                onCreateClick={() => setShowCreateTaskModal(true)}
                onEditClick={handleEditTaskClick}
                onAddSubtask={handleAddSubtaskClick}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('editItem.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? t('editItem.saving') : t('editItem.save')}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Task Modals */}
      {item && (
        <>
          <CreateTaskModal
            open={showCreateTaskModal}
            onOpenChange={handleCreateTaskModalClose}
            onSubmit={handleCreateTask}
            loading={taskLoading}
            availableUsers={users}
            parentTask={parentTaskForSubtask}
          />

          <EditTaskModal
            open={showEditTaskModal}
            onOpenChange={setShowEditTaskModal}
            task={taskToEdit}
            onSubmit={handleEditTask}
            loading={taskLoading}
            availableUsers={users}
          />
        </>
      )}
    </Dialog>
  );
}
