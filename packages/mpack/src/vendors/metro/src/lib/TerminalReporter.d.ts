import type { ReportableEvent } from './ReportableEvent';
type Terminal = any;
type TerminalReportableEvent =
  | ReportableEvent
  | {
      buildID: string;
      type: 'bundle_transform_progressed_throttled';
      transformedFileCount: number;
      totalFileCount: number;
    };

declare class TerminalReporter {
  readonly terminal: Terminal;
  constructor(terminal: Terminal);
  update(event: TerminalReportableEvent): void;
}

export default TerminalReporter;
