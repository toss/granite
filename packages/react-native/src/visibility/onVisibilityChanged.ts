import { GraniteBrownfieldModule } from '@granite-js/brownfield-module';
import { assertBrownfieldApi } from '../utils/standalone';

export const onVisibilityChanged: typeof GraniteBrownfieldModule.onVisibilityChanged = (listener) => {
  assertBrownfieldApi('onVisibilityChanged');
  return GraniteBrownfieldModule.onVisibilityChanged(listener);
};
