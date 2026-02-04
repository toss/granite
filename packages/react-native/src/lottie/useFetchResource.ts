import type { AnimationObject } from '@granite-js/lottie';
import { useState, useEffect } from 'react';

export function useFetchResource(
  src: string,
  onAnimationFailure?: (event: { error: string }) => void
): AnimationObject | null {
  const [jsonData, setJsonData] = useState<AnimationObject | null>(null);

  useEffect(() => {
    let canceled = false;

    fetch(src)
      .then((res) => res.json())
      .then((data) => {
        if (!canceled) {
          setJsonData(data);
        }
      })
      .catch((error) => {
        onAnimationFailure?.({ error: error.message });
      });

    return () => {
      canceled = true;
    };
  }, [src, onAnimationFailure]);

  return jsonData;
}
