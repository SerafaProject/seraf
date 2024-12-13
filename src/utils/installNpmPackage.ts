import { spawnSync } from "child_process";
import fs from 'fs'
import path from "path";
export const installNpmPackage = (data: {
  projectPath: string,
  packageName: string,
  version: string,
  dev?: boolean
}) => {
  const options = {
    cwd: data.projectPath
  };
  spawnSync('npm', ['init', '-y'], options);
  
  const optionParams: string[] = [
    'i'
  ]
  if (data.dev) {
    optionParams.push('--save-dev')
  } else {
    optionParams.push('--save')
  }
  const packageJSONPath = path.resolve(data.projectPath, 'package.json');

  const jsonData = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));

  if(!jsonData.dependencies) {
    jsonData.dependencies = {}
  }
  if(!jsonData.devDependencies){
    jsonData.devDependencies = {}
  }

  if(data.dev) {
    jsonData.devDependencies[data.packageName] = data.version
  } else {
    jsonData.dependencies[data.packageName] = data.version
  }

  fs.writeFileSync(packageJSONPath, JSON.stringify(jsonData))
  spawnSync('npm', optionParams, options);
}