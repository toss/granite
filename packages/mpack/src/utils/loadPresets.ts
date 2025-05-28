import { isNotNil, omit } from 'es-toolkit';
import { mergeBuildConfigs } from './mergeBuildConfigs';
import type { BuildConfig, PresetContext, TaskConfig } from '../types';

export async function loadPresets(task: TaskConfig, context: PresetContext): Promise<TaskConfig> {
  let buildConfig = task.build;

  if (Array.isArray(task.presets) && task.presets.length > 0) {
    // 프리셋을 가장 먼저 적용하기 위해 사용자 정의 구성(task)을 가장 마지막으로 이동
    const [baseConfig, ...configs]: Partial<BuildConfig>[] = [
      ...(await Promise.all(task.presets.map(async (preset) => Promise.resolve(preset(context))))),
      task.build,
    ].filter(isNotNil);

    buildConfig = mergeBuildConfigs({ ...buildConfig, ...baseConfig }, ...configs);
  }

  return { ...omit(task, ['presets']), build: buildConfig };
}
