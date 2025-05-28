export enum ErrorCode {
  CANNOT_USE_FILE_NAME,
  DIRECTORY_IS_NOT_EMPTY,
  USER_CANCELED,
  WORKSPACE_REQUIRED,
  INVALID_CWD_PATH,
}

export const ERROR_MESSAGES = {
  [ErrorCode.CANNOT_USE_FILE_NAME]: '파일 경로는 사용할 수 없어요.',
  [ErrorCode.DIRECTORY_IS_NOT_EMPTY]: '비어 있지 않은 디렉터리예요.',
  [ErrorCode.USER_CANCELED]: '작업이 취소되었어요',
  [ErrorCode.WORKSPACE_REQUIRED]: [
    '이미 package.json 파일이 존재하지만, 유효한 워크스페이스 환경이 아니예요.',
    '올바른 워크스페이스 경로에서 다시 시도하거나 워크스페이스 환경이 아닌 곳에서 시도해주세요.',
  ].join('\n'),
  [ErrorCode.INVALID_CWD_PATH]: '유효하지 않은 작업 디렉터리예요.',
} as const;

export const FALLBACK_MESSAGE = '예기치 못한 에러가 발생했어요';
