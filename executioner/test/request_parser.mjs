import path from 'path'
import { promises as fs } from 'fs'
import { Request } from '../request.mjs'

// TODO: Read possible langauge specs and complain if not all langauges included in source code path

// Exported enum of possible requests
export const requestTypes = Object.freeze({
  compileError: 'compileError',
  compileSuccess: 'compileSuccess',
  testAccepted: 'testAccepted',
  testWrong: 'testWrong',
  testError: 'testError',
  testMle: 'testMle',
  testTle: 'testTle',
})

export const languageDirs = Object.freeze([
  'gcc@11.3'
])

// Specifying the file names for each request type
const requestFiles = Object.freeze({
  compile_error: requestTypes.compileError,
  compile_success: requestTypes.compileSuccess,
  test_accepted: requestTypes.testAccepted,
  test_wrong: requestTypes.testWrong,
  test_error: requestTypes.testError,
  test_mle: requestTypes.testMle,
  test_tle: requestTypes.testTle,
})

// Reverse requestFiles objects to get file names from requestType
export const filesFromRequests = Object.fromEntries(Object.entries(requestFiles).map(([key, value]) => [value, key]));

// Returns a promise for a collection of requests generated from the passed directory
// The problem argument is the problem for which the source code solves
// Each sub directory is treated as a supported language
export async function parseRequests(sourceCodeDir, problem, requiredTypes) {

  // If undefined, assume all request types required
  if (requiredTypes === undefined) {
    requiredTypes = requestTypes;
  }

  // Check that passes directory exists
  await fs.access(sourceCodeDir)
    .catch(() => {
      throw new Error(`Could not find ${sourceCodeDir} directory`)
    })

  return (await Promise.all(languageDirs.map(async (language) => {

    // Reading the files in the language dir and iterating through them Each
    // read file is placed into a request and returned as a { type, request }
    // object, and then the array of objects is mapped to a single 
    // [type]: [request] object
    const languagePath = path.join(sourceCodeDir, language)
    const files = await fs.readdir(languagePath)
      .catch(() => {
        throw new Error(`Could not find ${language} language directory`)
      })

    const requests = (await Promise.all(files.map(async (file) => {

        // Reading the file, parsing the name, and adding to object
        const name = path.parse(file).name
        const requestType = requestFiles[name] 
        if (requestType === undefined) {
          throw new Error(`${name} is not an expected request type filename`)
        }  else if (!requiredTypes.includes(requestType)) {
          return;
        }
        const readContent = fs.readFile(path.join(languagePath, file)).then((buffer) => buffer.toString())

        return { 
          type: requestType, 
          request: new Request(`testing_${language}_${name}`, problem, file, await readContent, language)
        };
      })))
      .reduce((acc, red) => {
        // Skip if empty
        if (red === undefined) {
          return  acc
        }

        acc[red.type] = red.request
        return acc
      }, {})

    // Identify missing request types by comparing arrays
    const foundTypes = Object.keys(requests);
    const missingTypes = requiredTypes
      .filter((type) => !foundTypes.includes(type))

    // Ensure all request type files included
    console.log(missingTypes)
    if (missingTypes.length > 0) {
      const missingTypesString = missingTypes
        .reduce((acc, red, i) => {
          // If one element, return element
          if (missingTypes.length == 1) {
            return filesFromRequests[red]
          }

          // Parses array of strings into string split by ',' and 'and'
          acc += filesFromRequests[red]
          if (i === missingTypes.length - 2) {
            acc += ' and '
          } else if (i < missingTypes.length - 2) {
            acc += ', '
          }
          return acc
      }, '')

      throw new Error(`${language} directory is missing ${missingTypesString} files`)
    }

    // Return object of language and requests
    return {
      language,
      requests,
    }
  })))
  .reduce((acc, red) => {
    acc[red.language] = red.requests
    return acc
  }, {})
}
