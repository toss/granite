export function printErrors(errors: PromiseRejectedResult[]) {
  for (const error of errors) {
    console.error(error.reason);
  }
}
