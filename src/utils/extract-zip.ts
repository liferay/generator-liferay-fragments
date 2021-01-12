import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

export const extractZip = async (
  zip: JSZip,
  destinationPath: string
): Promise<void> => {
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  } else if (!fs.statSync(destinationPath).isDirectory()) {
    throw new Error(`${destinationPath} exists and is not a directory`);
  }

  const files = Object.entries(zip.files).filter(([, data]) => !data.dir);

  for (const [key, data] of files) {
    const filePath = path.resolve(destinationPath, key);
    const directoryPath = path.dirname(filePath);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    fs.writeFileSync(filePath, await data.async('nodebuffer'));
  }
};
