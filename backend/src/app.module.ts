import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AssetsModule } from './assets/assets.module';
import { LifecycleEventsModule } from './lifecycle-events/lifecycle-events.module';
import { ComponentsModule } from './components/components.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [AssetsModule, LifecycleEventsModule, ComponentsModule, DocumentsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
