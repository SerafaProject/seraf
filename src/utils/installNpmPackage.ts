import { spawnSync } from "child_process";

export const installNpmPackage = (data: {
  projectPath: string,
  packageName: string,
  version?: string,
  dev?: boolean
}) => {
  const options = {
    cwd: data.projectPath
  };

  let packageTarget = data.packageName

  if (data.version) {
    packageTarget = `${data.packageName}@${data.version}`
  }

  const optionParams: string[] = [
    'i',
    packageTarget
  ]
  if (data.dev) {
    optionParams.push('--save-dev')
  } else {
    optionParams.push('--save')
  }


  spawnSync('npm', ['init', '-y'], options);
  spawnSync('npm', optionParams, options);
}