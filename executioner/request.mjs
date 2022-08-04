// Request constuctor
export function Request(id, problem, fileName, sourceCode, language) {
  this.id = id;
  this.problem = problem;
  this.fileName = fileName;
  this.sourceCode = sourceCode;
  this.language = language;
}
