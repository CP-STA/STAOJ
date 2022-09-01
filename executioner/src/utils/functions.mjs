import { promises as fs, readFileSync } from 'fs';
import cp from 'child_process';
import path from 'path';
import { promisify } from 'util';

const exec = promisify(cp.exec);

// Maybe move this to a globals file
const supportedLanguagesFile = 'supported-languages.json';

export async function getSupportedLanguages(repoPath, problemDir = 'problems') {
  // Read the language file and parse json
  const languagesPath = path.join(repoPath, problemDir, supportedLanguagesFile);
  const languages = await fs
    .readFile(languagesPath)
    .catch((e) => {
      throw new Error(`Could not find language file at ${languagesPath}`);
    })
    .then((data) => data.toString())
    .then((data) => JSON.parse(data))
    .catch((e) => {
      throw new Error(
        `Failed to parse json in languages file at ${languagesPath}`
      );
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
      throw new Error(
        `Failed to parse json in languages file at ${languagesPath}`
      );
    } else {
      // Unfortunately there is no easy way to detect fs exceptions, but it's most likely this one
      throw new Error(`Could not find language file at ${languagesPath}`);
    }
  }
}

// Just so I don't mess it up from repititon
export function getSourceCodeFileName(baseName, supportedLanguages, language) {
  return `${baseName}.${supportedLanguages[language].extension}`;
}

// Check that the container image is built
// Otherwise the error messages are quite unhelpful
export async function isContainerImageBuilt(name) {
  const command = `podman image exists ${name}`;
  try {
    await exec(command);
    return true;
  } catch (e) {
    if (e.code === 1) {
      return false;
    } else if (e.code === 127) {
      throw new Error('Podman is not installed or in the path');
    } else {
      throw new Error(`Something went wrong calling '${command}'`);
    }
  }
}

// Get the number of containers in podman, too many will lead to errors
export async function getContainerCount() {
  const command = `podman ps -a | wc -l`;
  try {
    return parseInt((await exec(command)).stdout);
  } catch (e) {
    if (e.code === 127) {
      throw new Error('Podman is not installed or in the path');
    } else {
      throw new Error(`Something went wrong calling '${command}'`);
    }
  }
}

export async function removeContainer(name) {
  const command = `podman container rm ${name}`;
  try {
    await exec(command);
  } catch (e) {
    if (e.code === 1) {
      throw new Error(`No such podman container '${name}' found`);
    } else if (e.code === 127) {
      throw new Error('Podman is not installed or in the path');
    } else {
      throw new Error(`Something went wrong calling '${command}'`);
    }
  }
}
