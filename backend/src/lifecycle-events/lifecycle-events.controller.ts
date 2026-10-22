
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { LifecycleEventsService } from './lifecycle-events.service';
import { CreateLifecycleEventDto } from './dto/create-lifecycle-event.dto';

@Controller('lifecycle-events')
export class LifecycleEventsController {
  constructor(
    private readonly lifecycleEventsService: LifecycleEventsService,
  ) {}

  @Get()
  findAll() {
    return this.lifecycleEventsService.findAll();
  }

  @Get('asset/:assetId')
  findByAsset(
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.lifecycleEventsService.findByAsset(assetId);
  }

  @Get('component/:componentId')
  findByComponent(
    @Param('componentId', ParseUUIDPipe) componentId: string,
  ) {
    return this.lifecycleEventsService.findByComponent(
      componentId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lifecycleEventsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLifecycleEventDto) {
    return this.lifecycleEventsService.create(dto);
  }

  @Post('reconstruct/:documentId')
  reconstruct(
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.lifecycleEventsService.reconstructFromDocument(
      documentId,
    );
  }
}
