import { promises as fs, readFileSync } from 'fs';
import path from 'path';

const supportedLanguagesFile = 'supported-languages.json';

export async function getSupportedLanguages(repoPath, problemDir = 'problems') {
  // Read the language file and parse json
  const languagesPath = path.join(repoPath, problemDir, supportedLanguagesFile);
  const languages = await fs
    .readFile(languagesPath)
    .catch((e) => {
      throw `Could not find language file at ${languagesPath}`;
    })
    .then((data) => data.toString())
    .then((data) => JSON.parse(data))
    .catch((e) => {
      throw `Failed to parse json in languages file at ${languagesPath}`;
    });

  return languages;
}

// Useful in cases like the test files, which requires tests to be declared synchronously
export function getSupportedLanguagesSync(repoPath, problemDir = 'problems') {
  // Read the language file and parse json
  const languagesPath = path.join(repoPath, problemDir, supportedLanguagesFile);
  try {
    const languages = JSON.parse(readFileSync(languagesPath).toString());
    return languages;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw `Failed to parse json in languages file at ${languagesPath}`;
    } else {
      // Unfortunately there is no easy way to detect fs exceptions, but it's most likely this one
      throw `Could not find language file at ${languagesPath}`;
    }
  }
}

// Just so I don't mess it up from repititon
export function getSourceCodeFileName(baseName, supportedLanguages, language) {
  return `${baseName}.${supportedLanguages[language].extension}`;
}
