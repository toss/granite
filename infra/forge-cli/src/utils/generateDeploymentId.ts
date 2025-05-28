import { v7 as uuidv7 } from 'uuid';

export function generateDeploymentId() {
  return uuidv7();
}
