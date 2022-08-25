// Request constuctor
export function Request(id, problem, sourceCode, language) {
  this.id = id;
  this.problem = problem;
  this.sourceCode = sourceCode;
  this.language = language;
}
