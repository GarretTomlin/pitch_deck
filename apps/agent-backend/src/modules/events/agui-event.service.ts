import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AgUIEvent } from '@orb_deck/shared-types';

interface EventPayload {
  type?: string;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
@Injectable()
export class AgUIEventEmitter {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(sessionId: string, event: EventPayload): void {
    // Ensure type safety with explicit type annotations
    const aguiEvent: AgUIEvent = {
      id: crypto.randomUUID(),
      type: String(event.type ?? 'generic'),
      timestamp: new Date().toISOString(),
      data: event.data ?? {},
      metadata: event.metadata ?? {},
    };

    // Emit via WebSocket
    if (this.server) {
      const room = this.server.to(sessionId);
      room.emit('agui:event', aguiEvent);
    }

    // Also emit via EventEmitter for internal handling
    this.eventEmitter.emit(`agui.${sessionId}`, aguiEvent);
  }

  handleUserInput(sessionId: string, input: unknown): void {
    this.emit(sessionId, {
      type: 'human.input.response',
      data: input as Record<string, unknown>,
    });
  }

  joinRoom(socketId: string, sessionId: string): void {
    if (!this.server) return;

    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(sessionId);
    }
  }

  leaveRoom(socketId: string, sessionId: string): void {
    if (!this.server) return;

    const socket = this.server.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(sessionId);
    }
  }
}
