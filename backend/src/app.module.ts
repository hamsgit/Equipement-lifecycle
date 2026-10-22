
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

import { AssetsModule } from './assets/assets.module';
import { ComponentsModule } from './components/components.module';
import { DocumentsModule } from './documents/documents.module';
import { LifecycleEventsModule } from './lifecycle-events/lifecycle-events.module';
import { ValidationModule } from './validation/validation.module';
import { FindingsModule } from './findings/findings.module';

@Module({
  imports: [
    AssetsModule,
    ComponentsModule,
    DocumentsModule,
    LifecycleEventsModule,
    ValidationModule,
    FindingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
