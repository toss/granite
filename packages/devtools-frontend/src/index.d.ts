/**
 * @usage
 * ```ts
 * import frontendPath from '@react-native-bedrock/devtools-frontend';
 *
 * // eg. `/<static-path>/rn_inspector.html` 에 접근하면 devtools 페이지를 확인할 수 있습니다
 * server.serveStatic('<static-path>', frontendPath);
 * ```
 */
declare const frontendPath: string;

export default frontendPath;
