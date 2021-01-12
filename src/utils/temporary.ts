import fs from 'fs';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';

interface Element {
  name: string;
  removeCallback: () => void;
}

const REMOVE_MAX_TRIES = 5;
let nextTemporaryId = 0;

export function createTemporaryDirectory(): Element {
  const name = getTemporaryName();
  fs.mkdirSync(name, { recursive: true });

  return {
    name,
    removeCallback: getRemoveCallback(name),
  };
}

export function createTemporaryFile(): Element {
  const name = getTemporaryName();
  fs.writeFileSync(name, '', 'utf-8');

  return {
    name,
    removeCallback: getRemoveCallback(name),
  };
}

function getRandomId(): string {
  return `${nextTemporaryId++}-${Math.random()
    .toString()
    .substr(2)}-${Date.now()}`;
}

function getRemoveCallback(name: string): () => void {
  let count = 0;

  const removeCallback = () => {
    rimraf(name, (error) => {
      if (error && count < REMOVE_MAX_TRIES) {
        count++;
        removeCallback();
      } else if (error) {
        console.warn(`"${name} couldn't be deleted`);
      }
    });
  };

  return removeCallback;
}

function getTemporaryName(): string {
  const name = path.resolve(
    os.tmpdir(),
    `generator-liferay-fragments-${getRandomId()}`
  );

  return fs.existsSync(name) ? getTemporaryName() : name;
}
