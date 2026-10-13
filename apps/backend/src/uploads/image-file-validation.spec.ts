import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertImageSize, imageExtensionFor, MAX_IMAGE_SIZE_BYTES } from './image-file-validation.js';

describe('image upload validation', () => {
  it('maps allowed mime types to extensions and rejects others', () => {
    expect(imageExtensionFor('image/png')).toBe('.png');
    expect(imageExtensionFor('image/jpeg')).toBe('.jpg');
    expect(imageExtensionFor('image/gif')).toBeUndefined();
  });

  it('rejects images over the size limit', () => {
    const big = { fieldname: 'cover', size: MAX_IMAGE_SIZE_BYTES + 1 } as Express.Multer.File;
    expect(() => assertImageSize(big)).toThrow(BadRequestException);
  });
});
