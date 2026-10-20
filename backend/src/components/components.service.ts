
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateComponentDto } from './dto/create-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Retrieve all components
  async findAll() {
    return this.prisma.component.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Retrieve a component by its database ID
  async findOne(id: string) {
    const component = await this.prisma.component.findUnique({
      where: { id },
    });

    if (!component) {
      throw new NotFoundException(
        `Component with ID '${id}' not found`,
      );
    }

    return component;
  }

  // Create a component record
  async create(data: CreateComponentDto) {
    return this.prisma.component.create({
      data: {
        serialNumber: data.serialNumber,
        partNumber: data.partNumber,
        componentType: data.componentType,
      },
    });
  }
}
