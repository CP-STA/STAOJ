import test from 'ava';
import { isContainerImageBuilt } from '../src/utils/functions.mjs';
import { parseRequests } from './request-parser.mjs';
import { filesFromRequests, tmpRootPath } from './globals.mjs';
import { promises as fs } from 'fs';
import path from 'path';
import _ from 'lodash';

// For creating the bare minimum to emulate the executor environment
// Requires request.fileName to be set
export async function createEnvironment(request, tmpPath, repoPath) {
  const mountPath = path.join(tmpPath, 'mount');
  const measurerPath = path.join(repoPath, 'tools', 'measurer');

  // Create the tmp and mount directory
  await fs.mkdir(tmpPath);
  await fs.mkdir(mountPath);

  // Copy over the files to build the measurer and write source code
  await Promise.all([
    fs.writeFile(path.join(mountPath, request.fileName), request.sourceCode),
    fs.copyFile(
      path.join(measurerPath, 'demoter.c'),
      path.join(mountPath, 'demoter.c')
    ),
    fs.copyFile(
      path.join(measurerPath, 'Makefile'),
      path.join(mountPath, 'Makefile')
    ),
  ]);

  return mountPath;
}

// Macro to be run before tests to prepare for running container
export const prepareEnvironmentMacro = test.macro(
  async (t, requiredTypes, requiredLanguages, action) => {
    // Make sure image is built
    if (!(await isContainerImageBuilt('executioner'))) {
      throw 'Container image is not built, please run `npm install`';
    }

    // Parse requests
    t.context.requests = await parseRequests(
      undefined,
      requiredTypes,
      requiredLanguages
    ).catch((e) => {
      t.fail(e.message);
    });

    // Generate the tmp environment names for the request
    t.context.tmpPaths = requiredLanguages.reduce((langAcc, lang) => {
      langAcc[lang] = requiredTypes.reduce((typeAcc, type) => {
        typeAcc[type] = path.join(
          tmpRootPath,
          `request_testing_container_${action}_with_${filesFromRequests[type]}_for_${lang}`
        );
        return typeAcc;
      }, {});
      return langAcc;
    }, {});

    // Iterate through tmpPaths and delete tmp directories if they exist
    for (const languageRequests of Object.values(t.context.tmpPaths)) {
      for (const tmpPath of Object.values(languageRequests)) {
        await fs.rm(tmpPath, { recursive: true, force: true });
      }
    }
  }
);

// Macro to be run after container to clear tmp directories
export const cleanEnvironmentMacro = test.macro(async (t) => {
  // Iterate through tmpPaths and delete tmp directory
  if (!t.context.tmpPaths) {
    return;
  }

  for (const languageRequests of Object.values(t.context.tmpPaths)) {
    for (const tmpPath of Object.values(languageRequests)) {
      await fs.rm(tmpPath, { recursive: true, force: true });
    }
  }
});

// For checking that two arrays of messages are the same
// (Treating null to mean any value but must be included)
export const checkMessages = test.macro(async (t, expected, messages) => {
  // Iterate through messages
  for (const [s, message] of Object.entries(messages)) {
    const i = parseInt(s);
    const expectedMessage = expected[i];

    // If their state isn't the same then break from the loop
    if (
      !t.is(
        message.state,
        expectedMessage.state,
        `Message ${i + 1}: Expected ${expectedMessage.state} but got ${
          message.state
        }`
      )
    ) {
      break;
    }

    // Check that the message states are the same
    // Check that the keys are the same
    if (
      !t.deepEqual(
        Object.keys(message).sort(),
        Object.keys(expectedMessage).sort(),
        'A resulting message is missing some keys'
      )
    ) {
      // Printing the differences
      const additionalKeys = Object.keys(message).filter(
        (key) => !Object.keys(expectedMessage).includes(key)
      );
      const missingKeys = Object.keys(expectedMessage).filter(
        (key) => !Object.keys(message).includes(key)
      );
      t.log(
        `Message ${i + 1}: ${message.state} has different keys than expected:`
      );
      missingKeys.length !== 0 && t.log(` - Missing ${missingKeys}`);
      additionalKeys.length !== 0 &&
        t.log(` - Unexpectedly has ${additionalKeys}`);

      failed = true;
      return;
    }

    // Check that the neccessary values are the same
    if (
      !t.true(
        Object.entries(expectedMessage)
          .filter(([_, value]) => value !== null)
          .every((p2) =>
            _.some(Object.entries(message), (p1) => _.isEqual(p1, p2))
          ),
        "A resulting message's value was different than expected"
      )
    ) {
      // Printing the differences
      const differentEntries = Object.entries(message)
        .filter(([key, value]) => !_.isEqual(expectedMessage[key], value))
        .map(([key, value]) => [key, value, expectedMessage[key]]);
      const differentEntriesString = differentEntries.reduce(
        (str, [key, v1, v2]) =>
          v2 !== null ? str + ` {${key}: ${v2} but got ${v1}}` : str,
        ''
      );
      t.log(
        `Message ${i + 1}: ${message.state} has different values than expected:`
      );
      t.log(` -${differentEntriesString}`);

      failed = true;
      return;
    }
  }
  t.is(
    messages.length,
    expected.length,
    'The number of received messages does not match the expected number'
  );
});
