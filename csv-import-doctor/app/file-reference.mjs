/**
 * @param {{current: File | null}} fileRef
 * @param {boolean} needsDelimiterConfirmation
 */
export function releaseFileAfterAnalysis(fileRef, needsDelimiterConfirmation) {
  if (!needsDelimiterConfirmation) fileRef.current = null;
}
