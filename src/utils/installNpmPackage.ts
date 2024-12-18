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


 
  const packageJSONPath = path.resolve(data.projectPath, 'package.json');

  const jsonData = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));

  if (!jsonData.dependencies) {
    jsonData.dependencies = {}
  }
  if (!jsonData.devDependencies) {
    jsonData.devDependencies = {}
  }

  if (data.dev) {
    jsonData.devDependencies[data.packageName] = data.version
  } else {
    jsonData.dependencies[data.packageName] = data.version
  }
  fs.writeFileSync(packageJSONPath, JSON.stringify(jsonData, null, 2))


}

export const performInstall = (data: { path: string }) => {
  const options = {
    stdio: 'inherit', // Isso redireciona a saída e os erros diretamente para o terminal
  };

  console.log("Installing dependencies...");
  const result = spawnSync('npm', ['i', '--save'], {
    cwd: data.path,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error("Error occurred while installing dependencies:", result.error.message);
  } else if (result.status !== 0) {
    console.error(`npm install failed with exit code ${result.status}`);
  } else {
    console.log("Installing dependencies - OK");
  }
};