import type { AnimationObject } from '@granite-js/native/lottie-react-native';
import { useState, useEffect } from 'react';

export function useFetchResource(
  src: string,
  onAnimationFailure?: (event: { error: string }) => void
): AnimationObject | null {
  const [jsonData, setJsonData] = useState<AnimationObject | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setJsonData(data);
        }
      })
      .catch((error) => {
        onAnimationFailure?.({ error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [src, onAnimationFailure]);

  return jsonData;
}
