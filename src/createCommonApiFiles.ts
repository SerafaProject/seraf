import path from "path"
import fs from "fs"
import { appendToModulesIndex } from "./apiModules"

const createCommonModelsApiFiles = (data: {
  commonApiPath: string
}) => {
  const commonApiModelsPath = path.resolve(data.commonApiPath, "models")
  fs.mkdirSync(commonApiModelsPath)

  const commonModelPath = path.resolve(commonApiModelsPath, `ICommon.ts`)
  fs.writeFileSync(commonModelPath, `

  export interface ICommon {
    id: string
    createdAt: Date
    updatedAt: Date
  }
  `)

  const modelsIndexPath = path.resolve(commonApiModelsPath, `index.ts`)
  fs.writeFileSync(modelsIndexPath, `
  export * from './ICommon'
  `)



}

const createCommonUtilsApiFiles = (data: {
  commonApiPath: string
}) => {
  const utilsApiPath = path.resolve(data.commonApiPath, "utils")
  fs.mkdirSync(utilsApiPath)

  const validateCommonPath = path.resolve(utilsApiPath, `ValidateCommon.ts`)
  fs.writeFileSync(validateCommonPath, `
  import { ICommon } from "../models";
  export const validateCommon = (common: Partial<ICommon>): void => {
    const { id, createdAt, updatedAt } = common
    if (!id) throw new Error('Id is required')
    if (!createdAt) throw new Error('CreatedAt is required')
    if (!updatedAt) throw new Error('UpdatedAt is required')
  }
  `)




  const utilsIndexPath = path.resolve(utilsApiPath, `index.ts`)
  fs.writeFileSync(utilsIndexPath, `
  export * from './ValidateCommon'
  `)
}

export const createCommonApiFiles = (data: {
  modulesPath: string
}) => {
  console.log("Setup Common API Files")
  const commonApiPath = path.resolve(data.modulesPath, "common")
  fs.mkdirSync(commonApiPath)

  createCommonModelsApiFiles({
    commonApiPath: commonApiPath
  })

  createCommonUtilsApiFiles({
    commonApiPath: commonApiPath
  })

  const commonIndexPath = path.resolve(commonApiPath, `index.ts`)

  fs.writeFileSync(commonIndexPath, `
  export * from './models';
  export * from './utils';
  `)
}