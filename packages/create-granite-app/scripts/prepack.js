import { updateWorkspaceProtocol } from './utils/updateWorkspaceProtocol.js';

const TEMPLATE_PATHS = ['templates/*', 'tool-templates/*'];

await updateWorkspaceProtocol(TEMPLATE_PATHS, 'auto');
