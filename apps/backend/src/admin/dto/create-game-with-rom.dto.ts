import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Like CreateGameDto, but without `romPath` — this endpoint takes the ROM as
 * a multipart file instead of a pre-uploaded URL, and arrives as multipart
 * form fields (hence `@Type(() => Number)` on the numeric ones: multipart
 * fields land as strings before class-transformer coerces them).
 */
export class CreateGameWithRomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  emulator!: string;

  @IsOptional()
  @IsString()
  cover?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  releaseYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  rating?: number;
}
