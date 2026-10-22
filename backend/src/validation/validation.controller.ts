
import {
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import { ValidationService } from './validation.service';

@Controller('validation')
export class ValidationController {
  constructor(
    private readonly validationService: ValidationService,
  ) {}

  // POST /validation/run
  @Post('run')
  run() {
    return this.validationService.run();
  }

  // GET /validation/findings
  @Get('findings')
  findAll(
    @Query('ruleCode') ruleCode?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('componentId') componentId?: string,
  ) {
    return this.validationService.findAll({
      ruleCode,
      severity,
      status,
      assetId,
      componentId,
    });
  }
}
