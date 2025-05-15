import { AgUIEvent, AgUIEventType } from "@orb_deck/shared-types";

export class AgUIEventBuilder {
  static create<T = any>(
    type: AgUIEventType,
    data: T,
    metadata?: Record<string, any>
  ): AgUIEvent<T> {
    return {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
      metadata: metadata || {}
    };
  }

  static stateUpdate(data: any) {
    return this.create('state.update', data);
  }

  static messageCreate(role: string, content: string) {
    return this.create('message.create', { role, content });
  }

  static toolCall(tool: string, args: any) {
    return this.create('tool.call', { tool, args });
  }

  static toolResult(tool: string, result: any) {
    return this.create('tool.result', { tool, result });
  }

  static error(error: Error | string) {
    return this.create('error', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}