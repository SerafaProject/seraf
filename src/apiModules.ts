import path from "path"
import fs from 'fs'
import { createCommonApiFiles } from "./createCommonApiFiles"

export const createApiModulesFiles = (data: {
  srcPath: string
}) => {
  //Create Modules Folder
  const modulesPath = path.resolve(data.srcPath, "modules")
  fs.mkdirSync(modulesPath)

  //Create Common Module Files
  createCommonApiFiles({
    modulesPath: modulesPath
  })
}


export const appendToModulesIndex = (data: {
  modulesPath: string,
  value: string
}) => {
  const dotenvPath = path.resolve(data.modulesPath, 'index.ts');
  fs.appendFileSync(dotenvPath, data.value);
}