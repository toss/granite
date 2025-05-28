import path from 'path';
import chalk from 'chalk';
import { Command, Option } from 'clipanion';
import { compileHbc } from '../../utils/compileHbc';

export class HermesCommand extends Command {
  static paths = [[`hermes`]];

  static usage = Command.Usage({
    category: 'Hermes',
    description: '지정한 번들을 Hermes 바이트 코드로 컴파일 합니다',
    examples: [['컴파일하기', 'granite hermes --jsbundle dist/bundle.js']],
  });

  jsBundleFile = Option.String('--jsbundle', {
    required: true,
    description: 'Hermes 바이트 코드로 컴파일 할 Javascript 파일 경로 입니다',
  });

  sourcemap = Option.Boolean('--sourcemap', true, {
    description: '소스맵 파일을 생성합니다',
  });

  async execute() {
    try {
      const rootDir = process.cwd();
      const filePath = path.resolve(rootDir, this.jsBundleFile);

      const { outfile, sourcemapOutfile } = await compileHbc({ rootDir, filePath, sourcemap: this.sourcemap });

      console.log(`✅ 컴파일 완료: ${chalk.gray(outfile)}`);

      if (sourcemapOutfile) {
        console.log(`✅ 소스맵 생성 완료: ${chalk.gray(sourcemapOutfile)}`);
      }

      return 0;
    } catch (error: any) {
      console.error(error.stack);

      return 1;
    }
  }
}
