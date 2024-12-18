import path from "path"
import fs from 'fs'
export const createApiModule = (data: {
    projectPath: string,
    moduleName: string
}) => {
    const modulePath = path.resolve(data.projectPath, "api", "src", "modules", data.moduleName)
    fs.mkdirSync(modulePath)
    const modelsPath = path.resolve(modulePath, "models")
    fs.mkdirSync(modelsPath)
    const basicModelName = `I${data.moduleName[0].toUpperCase() + data.moduleName.slice(1, data.moduleName.length)}`
    const basicModel = `
import { ICommon } from "../../common"

export interface ${basicModelName} extends ICommon{

}
    `
    const basicModelPath = path.resolve(modelsPath,`${basicModelName}.ts`)
    fs.writeFileSync(basicModelPath, basicModel)
    const modelsIndexPath = path.resolve(modelsPath, "index.ts")
    fs.appendFileSync(modelsIndexPath, `export * from './${basicModelName}'`)
    const moduleIndexPath = path.resolve(modulePath, "index.ts")
    fs.appendFileSync(moduleIndexPath, `export * from './models'\n`)
}