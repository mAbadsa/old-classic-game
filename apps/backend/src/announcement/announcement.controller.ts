import { Controller, Get } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { ANNOUNCEMENT_KEY } from '../admin/dto/update-announcement.dto.js';

export interface Announcement {
  text: string;
  tone: string;
  active: boolean;
}

// Public: the site banner every visitor sees. `announcement` is null when nothing is active.
@Controller('announcement')
export class AnnouncementController {
  @Get()
  async get(): Promise<{ announcement: Announcement | null }> {
    const setting = await db.orm.public.SystemSetting.first({ key: ANNOUNCEMENT_KEY });
    const value = setting?.value as Announcement | undefined;
    return { announcement: value?.active && value.text ? value : null };
  }
}
