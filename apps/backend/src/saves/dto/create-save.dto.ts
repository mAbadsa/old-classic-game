import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSaveDto {
  @IsString()
  @MinLength(1)
  gameId!: string;

  // Base64-encoded emulator save state. Binary bytes can't travel in a JSON
  // body directly — this matches the frontend's existing convention (see
  // apps/frontend/hooks/useEmulator.ts's bytesToBase64/base64ToBytes, used
  // there for the same data going into localStorage).
  @IsString()
  @MinLength(1)
  saveState!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  slotNumber!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  playTime?: number;

  @IsOptional()
  @IsString()
  screenshot?: string;
}
