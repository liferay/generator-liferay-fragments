import fs from 'fs';
import JSZip from 'jszip';
import mkdirp from 'mkdirp';
import path from 'path';

export default function writeZip(zip: JSZip, filePath: string): Promise<void> {
  mkdirp.sync(filePath.substring(0, filePath.lastIndexOf(path.sep)));

  return new Promise((resolve) =>
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(filePath))
      .on('finish', () => {
        resolve();
      })
  );
}
