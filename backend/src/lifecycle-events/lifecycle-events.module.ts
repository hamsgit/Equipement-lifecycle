
import { Module } from '@nestjs/common';
import { LifecycleEventsService } from './lifecycle-events.service';
import { PrismaService } from '../prisma.service';
import { LifecycleEventsController } from './lifecycle-events.controller';

@Module({
  providers: [
    LifecycleEventsService,
    PrismaService,
  ],
  exports: [LifecycleEventsService],
  controllers: [LifecycleEventsController],
})
export class LifecycleEventsModule {}
