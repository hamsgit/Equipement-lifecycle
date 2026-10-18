
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('database-test')
  async testDatabase() {
    const assetCount = await this.prisma.asset.count();

    return {
      status: 'connected',
      database: 'PostgreSQL',
      assetCount,
    };
  }
}
