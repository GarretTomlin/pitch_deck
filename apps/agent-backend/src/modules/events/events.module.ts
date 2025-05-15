import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AgUIEventEmitter } from './agui-event.service';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [AgUIEventEmitter],
  exports: [AgUIEventEmitter],
})
export class EventsModule {}
