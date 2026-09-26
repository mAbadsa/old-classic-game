import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSaveDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  saveState?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  playTime?: number;

  @IsOptional()
  @IsString()
  screenshot?: string;
}
