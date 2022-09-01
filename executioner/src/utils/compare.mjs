// The default function used to compare a test result with an answer
export function compareAnswer(result, answer) {
  function cleanString(str) {
    // Trim spaces on end and start of string
    const trimmedStr = str.trim();

    // Replace mutiple spaces with one
    return trimmedStr.replace(/\s\s+/g, ' ');
  }

  return cleanString(answer) === cleanString(result);
}
