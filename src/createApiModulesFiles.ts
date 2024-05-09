import path from "path"
import fs from 'fs'
import { createCommonApiFiles } from "./createCommonApiFiles"

export const createApiModulesFiles = (data: {
  srcPath: string
}) => {
  const modulesPath = path.resolve(data.srcPath, "modules")
  fs.mkdirSync(modulesPath)
  createCommonApiFiles({
    modulesPath: modulesPath
  })
}