import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANDIDATE_SUFFIXES = ['.js', '.jsx', '/index.js'];

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (!specifier.startsWith('.') || !context.parentURL) throw err;

    for (const suffix of CANDIDATE_SUFFIXES) {
      const candidate = `${specifier}${suffix}`;
      if (existsSync(fileURLToPath(new URL(candidate, context.parentURL)))) {
        return next(candidate, context);
      }
    }

    throw err;
  }
}
