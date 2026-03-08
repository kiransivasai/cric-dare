/**
 * Maps a raw numeric value to one of the creator's bracket options.
 * Supports formats: "< 250", "250–299", "400+"
 */
export function matchBracket(actualValue, options) {
  for (const option of options) {
    const trimmed = option.trim();

    if (trimmed.startsWith("<")) {
      const max = parseInt(trimmed.replace("<", "").trim());
      if (actualValue < max) return option;
    } else if (trimmed.endsWith("+")) {
      const min = parseInt(trimmed.replace("+", "").trim());
      if (actualValue >= min) return option;
    } else if (trimmed.includes("–")) {
      const [min, max] = trimmed.split("–").map((s) => parseInt(s.trim()));
      if (actualValue >= min && actualValue <= max) return option;
    }
  }
  return null;
}

/**
 * Score a single participant's picks against actual results.
 * Returns a number 0–5.
 */
export function scorePicks(answers, actualResults, questions) {
  let correct = 0;
  answers.forEach(({ questionId, pick }) => {
    if (pick === actualResults[questionId]) {
      correct++;
    }
  });
  return correct;
}
