import path from "path"
import fs from "fs"

const createCommonModelsApiFiles = (data: {
  commonApiPath: string
}) => {
  const commonApiModelsPath = path.resolve(data.commonApiPath, "models")
  fs.mkdirSync(commonApiModelsPath)

  const commonModelPath = path.resolve(commonApiModelsPath, `ICommon.ts`)
  fs.writeFile(commonModelPath, `
  export type IStatus = 'active' | 'inactive'

  export interface ICommon {
    id: string
    createdAt: Date
    updatedAt: Date
    status: IStatus
  }
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${commonModelPath}`);
    }
  });

  const modelsIndexPath = path.resolve(commonApiModelsPath, `index.ts`)
  fs.writeFile(modelsIndexPath, `
  export * from './ICommon'
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${modelsIndexPath}`);
    }
  });



}

const createCommonUtilsApiFiles = (data: {
  commonApiPath: string
}) => {
  const utilsApiPath = path.resolve(data.commonApiPath, "utils")
  fs.mkdirSync(utilsApiPath)

  const validateCommonPath = path.resolve(utilsApiPath, `ValidateCommon.ts`)
  fs.writeFile(validateCommonPath, `
  import { ICommon } from "@/modules/common";

  export const validateCommon = (common: Partial<ICommon>): void => {
    const { id, createdAt, status, updatedAt } = common
    if (!id) throw new Error('Id is required')
    if (!createdAt) throw new Error('CreatedAt is required')
    if (!status) throw new Error('Status is required')
    if (!updatedAt) throw new Error('UpdatedAt is required')
  }
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${validateCommonPath}`);
    }
  });




  const utilsIndexPath = path.resolve(utilsApiPath, `index.ts`)
  fs.writeFile(utilsIndexPath, `
  export * from './ValidateCommon'
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${utilsIndexPath}`);
    }
  });
}

export const createCommonApiFiles = (data: {
  modulesPath: string
}) => {
  const commonApiPath = path.resolve(data.modulesPath, "common")
  fs.mkdirSync(commonApiPath)

  createCommonModelsApiFiles({
    commonApiPath: commonApiPath
  })

  createCommonUtilsApiFiles({
    commonApiPath: commonApiPath
  })

  const commonIndexPath = path.resolve(commonApiPath, `index.ts`)

  fs.writeFile(commonIndexPath, `
  export * from './models';
  export * from './utils';
  `, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log(`Code written to file: ${commonIndexPath}`);
    }
  });
}