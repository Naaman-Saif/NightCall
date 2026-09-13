import type { Logger } from '@nestjs/common';

import { captureTrafficRecipe, liveRecipeSources, type RecipeCapture } from './capture-recipe';

export function captureRecipeInBackground(log: Logger, capture: RecipeCapture): void {
  captureTrafficRecipe(capture, liveRecipeSources())
    .then((recipe) => log.log(`traffic recipe for ${capture.incidentId}: ${recipe.requests.length} requests from ${recipe.source}`))
    .catch((error: unknown) => log.error(`traffic recipe failed for ${capture.incidentId}: ${String(error)}`));
}
