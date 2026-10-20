
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serialNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  partNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  componentType: string;
}
