
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';

import {
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import {
  FindingsService,
  REVIEW_STATUSES,
} from './findings.service';

class ReviewFindingDto {
  @IsString()
  @IsNotEmpty()
  reviewerName!: string;

  @IsIn(REVIEW_STATUSES)
  status!: (typeof REVIEW_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  comment!: string;
}

@Controller('findings')
export class FindingsController {
  constructor(
    private readonly service: FindingsService,
  ) {}

  @Get()
  findAll(
    @Query('ruleCode') ruleCode?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('componentId') componentId?: string,
  ) {
    return this.service.findAll({
      ruleCode,
      severity,
      status,
      assetId,
      componentId,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id/review')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReviewFindingDto,
  ) {
    return this.service.review(id, input);
  }
}
