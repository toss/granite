import fs from 'fs';
import { transform } from 'oxc-transform';

/** The exact source placed in the deployment archive as index.js. */
export function createLambdaSource({
  sourcePath,
  bucketName,
  region,
}: {
  sourcePath: string;
  bucketName: string;
  region: string;
}) {
  const { code } = transform(sourcePath, fs.readFileSync(sourcePath, 'utf8'), {
    define: {
      _BUCKET_NAME: JSON.stringify(bucketName),
      _BUCKET_REGION: JSON.stringify(region),
    },
  });
  return code;
}
