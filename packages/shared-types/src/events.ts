export type AgUIEventType = 
  | 'generic'
  | 'state.update'
  | 'message.create'
  | 'tool.call'
  | 'tool.result'
  | 'error'
  | 'completion'
  | 'workflow.start'
  | 'workflow.complete'
  | 'workflow.error'
  | 'workflow.cancelled'
  | 'human.input.request'
  | 'human.input.response'
  | 'slide.generating'
  | 'slide.generated'
  | 'slide.refining'
  | 'slide.refined'
  | 'outline.created';

export interface AgUIEvent<T = any> {
  id: string;
  type: AgUIEventType | string;
  timestamp: string;
  data: T;
  metadata?: Record<string, any>;
}