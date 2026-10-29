import { IsBoolean, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const ANNOUNCEMENT_KEY = 'announcement';

export class UpdateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  text!: string;

  @IsIn(['info', 'warning', 'success'])
  tone!: string;

  @IsBoolean()
  active!: boolean;
}
