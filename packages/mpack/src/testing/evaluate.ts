import execa from 'execa';

export async function evaluate(code: string) {
  const result = await execa(`node`, [`-p`, code]);

  return result.stdout.trim();
}
