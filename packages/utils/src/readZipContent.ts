import yauzl from 'yauzl';

export function readZipContent(zipPath: string, fileName: string) {
  return new Promise<string>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zipFile) => {
      if (error) {
        reject(error);
        return;
      }

      zipFile
        .on('entry', (entry) => {
          if (entry.fileName === fileName) {
            zipFile.openReadStream(entry, (error, readStream) => {
              if (error) {
                throw error;
              }

              let fileData = '';
              readStream
                .on('data', (chunk) => (fileData += chunk.toString('utf8')))
                .on('end', () => {
                  zipFile.close();
                  resolve(fileData);
                });
            });
          } else {
            zipFile.readEntry();
          }
        })
        .on('end', () => {
          zipFile.close();
          reject(new Error(`'${fileName}' not found in zip file`));
        })
        .on('error', (error) => {
          zipFile.close();
          reject(error);
        });

      zipFile.readEntry();
    });
  });
}

export function readZipEntries(zipPath: string) {
  return new Promise<Record<string, string>>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error || new Error('Failed to open zip file'));
        return;
      }

      const contents: Record<string, string> = {};
      let processing = 0;
      let finished = false;

      const maybeFinish = () => {
        if (finished && processing === 0) {
          zipFile.close();
          resolve(contents);
        }
      };

      zipFile.readEntry();

      zipFile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Ignore directories
          zipFile.readEntry();
          return;
        }

        processing++;

        zipFile.openReadStream(entry, (error, readStream) => {
          if (error || !readStream) {
            zipFile.close();
            reject(error || new Error('Failed to open read stream'));
            return;
          }

          const chunks: Buffer[] = [];
          readStream
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => {
              contents[entry.fileName] = Buffer.concat(chunks).toString('utf8');
              processing--;
              maybeFinish();
              zipFile.readEntry();
            })
            .on('error', (error) => {
              zipFile.close();
              reject(error);
            });
        });
      });

      zipFile.on('end', () => {
        finished = true;
        maybeFinish();
      });

      zipFile.on('error', (error) => {
        zipFile.close();
        reject(error);
      });
    });
  });
}
