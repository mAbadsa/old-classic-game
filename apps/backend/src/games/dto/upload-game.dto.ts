import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { EXTENSION_BY_EMULATOR } from '../rom-file.util.js';

// Text fields sent alongside the rom/cover/thumbnail files in POST /games/upload.
export class UploadGameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsIn(Object.keys(EXTENSION_BY_EMULATOR), {
    message: `emulator must be one of: ${Object.keys(EXTENSION_BY_EMULATOR).join(', ')}`,
  })
  emulator!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
