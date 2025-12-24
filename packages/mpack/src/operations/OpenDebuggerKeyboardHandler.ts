import { styleText } from 'util';

type Reporter = {
  update: (event: { type: string; [key: string]: unknown }) => void;
};

type PageDescription = Readonly<{
  id: string;
  title: string;
  description: string;
}>;

export default class OpenDebuggerKeyboardHandler {
  #devServerUrl: string;
  #reporter: Reporter;
  #targetsShownForSelection: ReadonlyArray<PageDescription> | null = null;

  constructor({ devServerUrl, reporter }: { devServerUrl: string; reporter: Reporter }) {
    this.#devServerUrl = devServerUrl;
    this.#reporter = reporter;
  }

  async #tryOpenDebuggerForTarget(target: PageDescription): Promise<void> {
    this.#targetsShownForSelection = null;
    this.#clearTerminalMenu();

    try {
      const fetchFn = (globalThis as { fetch?: (input: any, init?: any) => Promise<any> }).fetch;
      if (fetchFn == null) {
        throw new Error('Global fetch is not available');
      }

      await fetchFn(
        new URL(`/open-debugger?target=${encodeURIComponent(target.id)}`, this.#devServerUrl).href,
        { method: 'POST' }
      );
    } catch (error) {
      this.#log('error', 'Failed to open debugger for %s (%s): %s', target.title, target.description, 'Network error');
      if (error instanceof Error && error.cause != null) {
        this.#log('error', 'Cause: %s', error.cause);
      }
      this.#clearTerminalMenu();
    }
  }

  async handleOpenDebugger(): Promise<void> {
    this.#setTerminalMenu('Fetching available debugging targets...');
    this.#targetsShownForSelection = null;

    try {
      const fetchFn = (globalThis as { fetch?: (input: any, init?: any) => Promise<any> }).fetch;
      if (fetchFn == null) {
        throw new Error('Global fetch is not available');
      }

      const response = await fetchFn(new URL('/json/list', this.#devServerUrl).href, { method: 'POST' });
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      const targets = (await response.json()) as ReadonlyArray<PageDescription>;
      if (!Array.isArray(targets)) {
        throw new Error('Expected array.');
      }

      if (targets.length === 0) {
        this.#log('warn', 'No connected targets');
        this.#clearTerminalMenu();
      } else if (targets.length === 1) {
        const target = targets[0];
        if (target) {
          void this.#tryOpenDebuggerForTarget(target);
        } else {
          this.#clearTerminalMenu();
        }
      } else {
        this.#targetsShownForSelection = targets;

        if (targets.length > 9) {
          this.#log('warn', '10 or more debug targets available, showing the first 9.');
        }

        this.#setTerminalMenu(
          `Multiple debug targets available, please select:\n  ${targets
            .slice(0, 9)
            .map(
              ({ title }, index) => `${styleText(['white', 'inverse'], ` ${index + 1} `)} - "${title}"`
            )
            .join('\n  ')}`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.#log('error', `Failed to fetch debug targets: ${message}`);
      this.#clearTerminalMenu();
    }
  }

  maybeHandleTargetSelection(keyName: string): boolean {
    if (keyName >= '1' && keyName <= '9') {
      const targetIndex = Number(keyName) - 1;
      if (this.#targetsShownForSelection != null && targetIndex < this.#targetsShownForSelection.length) {
        const target = this.#targetsShownForSelection[targetIndex];
        if (target) {
          void this.#tryOpenDebuggerForTarget(target);
          return true;
        }
      }
    }
    return false;
  }

  dismiss() {
    this.#clearTerminalMenu();
    this.#targetsShownForSelection = null;
  }

  #log(level: 'info' | 'warn' | 'error', ...data: unknown[]): void {
    this.#reporter.update({
      type: 'unstable_server_log',
      level,
      data,
    });
  }

  #setTerminalMenu(message: string) {
    this.#reporter.update({
      type: 'unstable_server_menu_updated',
      message,
    });
  }

  #clearTerminalMenu() {
    this.#reporter.update({
      type: 'unstable_server_menu_cleared',
    });
  }
}
