import { IsDefined } from 'class-validator';

export class UpsertSettingDto {
  /** Arbitrary JSON — stored as-is in SystemSetting.value (jsonb). */
  @IsDefined()
  value!: unknown;
}
