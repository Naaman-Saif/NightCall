import { BedrockModel } from '@strands-agents/sdk';

import { settings } from '../config/settings';

export function bedrockModel(modelId: string): BedrockModel {
  return new BedrockModel({ modelId, region: settings.bedrockRegion });
}
