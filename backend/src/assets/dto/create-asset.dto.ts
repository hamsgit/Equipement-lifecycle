
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  assetCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assetType!: string;
}
