
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateLifecycleEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  eventType!: string;

  @ValidateIf((o) => o.componentId == null)
  @IsUUID('4')
  assetId?: string;

  @ValidateIf((o) => o.assetId == null)
  @IsUUID('4')
  componentId?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
