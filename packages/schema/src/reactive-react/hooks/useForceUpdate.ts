import { useCallback, useRef, useState } from 'react';

import { useLayoutEffect } from './useLayoutEffect';

const EMPTY_ARRAY: any[] = [];

export function useForceUpdate() {
  const [, setState] = useState([]);
  const firstRenderedRef = useRef(false);
  const needUpdateRef = useRef(false);
  const renderingRef = useRef(false);
  const pendingRef = useRef(false);

  useLayoutEffect(() => {
    firstRenderedRef.current = true;
    if (needUpdateRef.current) {
      setState([]);
      needUpdateRef.current = false;
    }
    return () => {
      firstRenderedRef.current = false;
    };
  }, EMPTY_ARRAY);

  // Track render cycle per-component to prevent infinite loops
  useLayoutEffect(() => {
    renderingRef.current = false;
    if (pendingRef.current) {
      pendingRef.current = false;
      setState([]);
    }
  });

  const scheduler = useCallback(() => {
    if (!firstRenderedRef.current) {
      needUpdateRef.current = true;
      return;
    }
    if (renderingRef.current) {
      // Currently rendering — defer to next tick to break potential loops
      pendingRef.current = true;
      return;
    }
    setState([]);
  }, EMPTY_ARRAY);

  // Mark component as entering render cycle
  renderingRef.current = true;

  return scheduler;
}
