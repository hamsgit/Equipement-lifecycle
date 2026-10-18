
import { Module } from '@nestjs/common';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma.service';
import { LifecycleEventsModule } from '../lifecycle-events/lifecycle-events.module';

@Module({
  imports: [LifecycleEventsModule],
  controllers: [AssetsController],
  providers: [AssetsService, PrismaService],
})
export class AssetsModule {}
