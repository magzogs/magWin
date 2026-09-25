import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/** Reads JSON; returns null when the file does not exist or is not valid JSON. */
export async function readJson(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/** Writes JSON atomically: a crash never leaves a half-written file behind. */
export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${String(process.pid)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

export async function removeFile(path: string): Promise<void> {
  await rm(path, { force: true });
}
