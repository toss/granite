import type { AnimationObject } from '@granite-js/native/lottie-react-native';
import { useState, useEffect } from 'react';

export function useFetchResource(src: string, onAnimationFailure?: (error: string) => void): AnimationObject | null {
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
        if (error instanceof Error) {
          onAnimationFailure?.(error.message);
        } else {
          onAnimationFailure?.('Unknown error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src, onAnimationFailure]);

  return jsonData;
}
