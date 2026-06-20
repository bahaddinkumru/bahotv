import { SetMetadata } from '@nestjs/common';

export const IS_BAN_CHECK_SKIPPED = 'isBanCheckSkipped';
export const SkipBanCheck = () => SetMetadata(IS_BAN_CHECK_SKIPPED, true);