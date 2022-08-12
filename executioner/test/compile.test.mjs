import test from 'ava'
import { promises as fs } from 'fs'
import cp from 'child_process'
import util from 'util'
import path, { parse } from 'path'
import { requestTypes, parseRequests, languageDirs, filesFromRequests } from './request_parser.mjs'

const exec = util.promisify(cp.exec)

// Constants
const maxMem = 256000
const maxTime = 2

const thisPath = path.resolve('.');
const repoPath = path.resolve('../');
const sampleSourceCodeDir = 'sample_source_code';

// Object of required types and expected assertions for result
const requiredTypes = {
  [requestTypes.compileSuccess]: (t, compiledPath) => {
    return t.notThrowsAsync(fs.access(compiledPath));
  },
  [requestTypes.compileError]: (t, compilePath) => {
    return t.throwsAsync(fs.access(compilePath));
  }
}

test.before('Parse requests and build container', (t) => {

  // Generate the neccessary requests from the sample source code dir
  t.context.requests = parseRequests(path.join(thisPath, 'test', sampleSourceCodeDir), undefined, Object.keys(requiredTypes))

  // Generate the tmp environment names for the request
  t.context.tmpPaths = languageDirs.reduce((langAcc, lang) => {
    langAcc[lang] = Object.keys(requiredTypes).reduce((typeAcc, type) => {
      typeAcc[type] = `/tmp/request_testing_container_compiling_with_${filesFromRequests[type]}_for_${lang}`
      return typeAcc
    }, {}) 
    return langAcc
  }, {})

  // Build the execution container
  const buildContainer = exec(
    `podman build --build-arg MAX_MEM=${maxMem} --build-arg MAX_TIME=${maxTime} . -t executioner`
  );
})

test.after.always('Cleaning up execution environment', async (t) => {
  for (const languageRequests of Object.values(t.context.tmpPaths)) {
    for (const tmpPath of Object.values(languageRequests)) {
      await fs.rmdir(tmpPath, { recursive: true });
    }
  }
})

const testCompilingMacro = test.macro(async (t, language, requestName) => {

  // Ensure requests not  ailing
  t.context.requests
    .catch((e) => {
      t.fail(e.message)
    })

  // Await requests parsing to get request
  const request = (await t.context.requests)[language][requestName];
  const tmpPath = t.context.tmpPaths[language][requestName];

  const mountPath = `${tmpPath}/mount`;
  const sourceCodePath = `${mountPath}/${request.fileName}`
  const measurerPath = `${repoPath}/tools/measurer`;

  const compiledName = 'compiled'


  // Create the tmp and mount directory
  await fs.mkdir(tmpPath);
  await fs.mkdir(mountPath);

  // Copy over the files to build the measurer and write source code
  await Promise.all([
    fs.writeFile(sourceCodePath, request.sourceCode),
    fs.copyFile(`${measurerPath}/demoter.c`, `${mountPath}/demoter.c`),
    fs.copyFile(`${measurerPath}/Makefile`, `${mountPath}/Makefile`),
  ]);

  try {
    await exec(
      `podman run -v ${mountPath}:/app/mount executioner ./compile.sh ${request.fileName} ${request.language} ${compiledName}`
    );
  } catch (e) {
  }

  await requiredTypes[requestName](t, `${mountPath}/${compiledName}`);
})

// Create tests from requests
for (const language of languageDirs) {
  for (const req of Object.keys(requiredTypes)) {
    test(`Testing the docker compiling script with ${req} for ${language}`, testCompilingMacro, language, req);
  }
}
