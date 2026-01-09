import { useState } from 'react';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useOverlayId() {
  return useState(generateId)[0];
}
