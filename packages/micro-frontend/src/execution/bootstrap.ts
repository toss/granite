import { installAsyncBoundaries } from './asyncBoundaries';
import { getExecutionContext } from './context';
import { getExecutionSessions } from './sessions';

getExecutionSessions();
installAsyncBoundaries(getExecutionContext());
