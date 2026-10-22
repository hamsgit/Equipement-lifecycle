
import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { LifecycleEventsService } from './lifecycle-events.service';
import { LifecycleEventsController } from './lifecycle-events.controller';

@Module({
  controllers: [LifecycleEventsController],
  providers: [LifecycleEventsService, PrismaService],
  exports: [LifecycleEventsService],
})
export class LifecycleEventsModule {}
