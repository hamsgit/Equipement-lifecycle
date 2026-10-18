
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { AssetsService } from './assets.service';
import { LifecycleEventsService } from '../lifecycle-events/lifecycle-events.service';

import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly lifecycleEventsService: LifecycleEventsService,
  ) {}

  // GET ALL EQUIPMENT
  @Get()
  async findAll() {
    return this.assetsService.findAll();
  }

  // GET EQUIPMENT LIFECYCLE HISTORY
  @Get(':id/lifecycle')
  async getLifecycle(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.lifecycleEventsService.findByAsset(id);
  }

  // GET EQUIPMENT BY ID
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.assetsService.findOne(id);
  }

  // CREATE EQUIPMENT
  @Post()
  async create(@Body() createAssetDto: CreateAssetDto) {
    return this.assetsService.create(createAssetDto);
  }

  // UPDATE EQUIPMENT
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, updateAssetDto);
  }
}
