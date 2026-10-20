
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
} from '@nestjs/common';

import { ComponentsService } from './components.service';
import { CreateComponentDto } from './dto/create-component.dto';

@Controller('components')
export class ComponentsController {
  constructor(
    private readonly componentsService: ComponentsService,
  ) {}

  // Get all components
  @Get()
  findAll() {
    return this.componentsService.findAll();
  }

  // Get a component by ID
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.componentsService.findOne(id);
  }

  // Create a component
  @Post()
  create(@Body() dto: CreateComponentDto) {
    return this.componentsService.create(dto);
  }
}
