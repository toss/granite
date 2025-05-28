import { Command, Option } from 'clipanion';
import { build } from '../../build';
import { loadConfig } from '../../config/loadConfig';

export class BuildCommand extends Command {
  static paths = [[`build`]];

  static usage = Command.Usage({
    category: 'Build',
    description: 'Granite App 번들을 생성합니다',
    examples: [
      ['빌드하기', 'granite build'],
      ['지정된 대상만 빌드하기', 'granite build --id service-ios'],
    ],
  });

  tag = Option.String('--tag', {
    description: '구성 파일에서 지정한 태그에 해당하는 대상만 번들링 합니다',
  });

  disableCache = Option.Boolean('--disable-cache', {
    description: '캐시를 비활성화 합니다',
  });

  async execute() {
    try {
      const { tag, disableCache = false } = this;
      const config = await loadConfig();

      await build(config, {
        tag,
        cache: !disableCache,
      });
      return 0;
    } catch (error: any) {
      console.error(error);

      return 1;
    }
  }
}
