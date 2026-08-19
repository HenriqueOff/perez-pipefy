export type GlobalRole = 'admin' | 'member';

export type PipelineRole = 'owner' | 'manager' | 'editor' | 'viewer';

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select';

export type CardHistoryEventType =
  | 'created'
  | 'moved'
  | 'field_updated'
  | 'assigned'
  | 'comment_added'
  | 'attachment_added';

export type AutomationTriggerType = 'card_created_in_phase' | 'card_moved_to_phase' | 'field_updated';

export type AutomationActionType = 'move_to_phase' | 'assign_user' | 'add_label' | 'remove_label';

export type NotificationType =
  | 'card_assigned'
  | 'comment_added'
  | 'card_moved'
  | 'sla_breached'
  | 'mentioned';

export type IntegrationProvider = 'imoview';

export type SyncDirection = 'import' | 'export';

export type SyncStatus = 'success' | 'error';
