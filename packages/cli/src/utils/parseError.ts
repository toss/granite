import { ErrorCode, ERROR_MESSAGES, FALLBACK_MESSAGE } from '../errors';

export function parseError(error: unknown) {
  if (error instanceof Error) {
    return parseInquirerError(error) ?? parseExecaError(error) ?? `${FALLBACK_MESSAGE}\n\n${error.message}`;
  }

  return getErrorMessageByCode(error as ErrorCode);
}

/**
 * @see source {@link https://github.com/SBoudrias/Inquirer.js/blob/inquirer%4010.2.2/packages/core/src/lib/errors.mts}
 */
function parseInquirerError(error: Error) {
  switch (error.name) {
    case 'ExitPromptError':
      return getErrorMessageByCode(ErrorCode.USER_CANCELED);

    case 'AbortPromptError':
    case 'CancelPromptError':
    case 'ValidationError':
    case 'HookError':
      return error.message;

    default:
      return;
  }
}

function parseExecaError(error: Error) {
  if ('stderr' in error && error.stderr) {
    return `커맨드 실행 중 에러가 발생했어요\n${error.stderr}`;
  }

  return;
}

function getErrorMessageByCode(code: ErrorCode) {
  return ERROR_MESSAGES[code as ErrorCode] ?? FALLBACK_MESSAGE;
}
