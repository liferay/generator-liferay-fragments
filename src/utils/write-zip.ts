import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

export default function writeZip(zip: JSZip, filePath: string): Promise<void> {
  fs.mkdirSync(filePath.substring(0, filePath.lastIndexOf(path.sep)), {
    recursive: true,
  });

  return new Promise((resolve) =>
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(filePath))
      .on('finish', () => {
        resolve();
      })
  );
}
