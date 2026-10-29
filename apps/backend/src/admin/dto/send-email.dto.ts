import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SendEmailDto {
  @IsIn(['all', 'selected'])
  audience!: 'all' | 'selected';

  // Required when audience is "selected"; capped so one request can't fan out unboundedly.
  @ValidateIf((o: SendEmailDto) => o.audience === 'selected')
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  @Type(() => String)
  userIds?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
