import { Global, Module } from '@nestjs/common';

import { settings } from './settings';

export const SETTINGS = 'SETTINGS';

@Global()
@Module({
  providers: [{ provide: SETTINGS, useValue: settings }],
  exports: [SETTINGS],
})
export class SettingsModule {}
