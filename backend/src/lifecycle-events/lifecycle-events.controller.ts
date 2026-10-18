
import {
  Body,
  Controller,
  Get,
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
  async findAll() {
    return this.lifecycleEventsService.findAll();
  }

  @Post()
  async create(
    @Body() createLifecycleEventDto: CreateLifecycleEventDto,
  ) {
    return this.lifecycleEventsService.create(
      createLifecycleEventDto,
    );
  }
}
