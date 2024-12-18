import path from "path"
import ts from "typescript";
import fs from 'fs'

export const buildApiModule = (data: {
  path: string,
  moduleName: string
}) => {
  const basicModelName = `${data.moduleName[0].toUpperCase() + data.moduleName.slice(1, data.moduleName.length)}`
  const modelPath = path.resolve(data.path, "models", `I${basicModelName}.ts`)
  const sourceFile = ts.createSourceFile(
    modelPath,
    ts.sys.readFile(modelPath) || "",
    ts.ScriptTarget.Latest,
    true
  );
  let keyValueArray: { key: string; value: string; isOptional: boolean }[] = [];

  // Visitando cada nó do AST
  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === `I${basicModelName}`) {
      node.members.forEach((member) => {
        if (ts.isPropertySignature(member) && member.type) {
          const key = (member.name as ts.Identifier).text;
          const value = member.type.getText(sourceFile);
          const isOptional = !!member.questionToken; // Verifica se o campo é opcional
          keyValueArray.push({ key, value, isOptional });
        }
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  console.log(keyValueArray)

  const repositoriesPath = path.resolve(data.path, "repositories")
  fs.mkdirSync(repositoriesPath)
  const repositoriesIndexPath = path.resolve(repositoriesPath, "index.ts")


  const repoInterfacesPath = path.resolve(repositoriesPath, "interfaces")
  fs.mkdirSync(repoInterfacesPath)
  const repoInterfacesIndexPath = path.resolve(repoInterfacesPath, "index.ts")

  const repoImplementationsPath = path.resolve(repositoriesPath, "implementations")
  fs.mkdirSync(repoImplementationsPath)
  const repoImplementationsIndexPath = path.resolve(repoImplementationsPath, "index.ts")

  fs.appendFileSync(repositoriesIndexPath, `export * from './implementations'\n`)
  fs.appendFileSync(repositoriesIndexPath, `export * from './interfaces'\n`)


  const repoCrudInterfaceName = `I${basicModelName}Repository`
  const repoCrudInterfacePath = path.resolve(repoInterfacesPath, `${repoCrudInterfaceName}.ts`)
  const repoCrudInterface = `
import { I${basicModelName} } from "../../models"
export interface ${repoCrudInterfaceName} {
    findById(data: {
        id: string
    }): Promise<I${basicModelName} | undefined>

    findAll(data: {
        limit: number,
        offset: number,
        filter?: {
            ids?: string[]
        },
        sort?: {
            field: 'createdAt',
            order: 'asc' | 'desc'
        }
    }): Promise<I${basicModelName}[]>

    create(data: {
        ${data.moduleName}: I${basicModelName}
    }): Promise<I${basicModelName}>

    update(data: {
           ${data.moduleName}: I${basicModelName}
    }): Promise<I${basicModelName} | undefined>
}
`
  fs.appendFileSync(repoInterfacesIndexPath, `export * from './${repoCrudInterfaceName}'\n`)

  fs.writeFileSync(repoCrudInterfacePath, repoCrudInterface)

  let mongooseSchema = `
import mongoose, { Schema } from "mongoose";
import { I${basicModelName} } from "../../models";


const ${basicModelName}Schema: Schema = new Schema<I${basicModelName}>({
  id: { type: String, required: true, index: true, immutable: true},
  createdAt: { type: Date, required: true, index: true, immutable: true},
  updatedAt: { type: Date, required: true, index: true},`


  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    if (keyValue.value === 'string') {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: String, required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
    } if (keyValue.value === 'number') {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: Number, required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
    } else if (keyValue.value === 'boolean') {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: Boolean, required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
    } else if (keyValue.value === 'Date') {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: Date, required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
    } else if (keyValue.value.includes('|')) {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: String, required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
    }
  }

  mongooseSchema = mongooseSchema + ` 
}, {
  timestamps: true,
  collection: '${data.moduleName}'
})
export const ${basicModelName}Mongoose =  mongoose.model<I${basicModelName}>('${basicModelName}', ${basicModelName}Schema);
`

  const mongooseSchemaPath = path.resolve(repoImplementationsPath, `${basicModelName}Mongoose.ts`)
  fs.writeFileSync(mongooseSchemaPath, mongooseSchema)
  fs.appendFileSync(repoImplementationsIndexPath, `export * from './${basicModelName}Mongoose'\n`)

  const mongooseCrudRepository = `
import { I${basicModelName} } from "../../models"
import { ${repoCrudInterfaceName} } from "../interfaces"
import { ${basicModelName}Mongoose } from "./${basicModelName}Mongoose"


export class ${basicModelName}MongooseRepository implements ${repoCrudInterfaceName} {
  async findById(data: { id: string }): Promise<I${basicModelName} | undefined> {
    // Implement the method here
    try {
      const { id } = data
      const ${data.moduleName} = await ${basicModelName}Mongoose.findOne({
        id: id
      })
      return ${data.moduleName} ? ${data.moduleName}.toObject() : undefined
    } catch (error) {
      throw error
    }
  }

  async findAll(data: {
    limit: number, offset: number, filter?: { ids?: [] }, sort?: {
      field: 'createdAt',
      order: 'asc' | 'desc'
    }
  }): Promise<I${basicModelName}[]> {
    // Implement the method here
    try {
      let filter = {}
      let sort = {}
      if (data.filter) {
        if (data.filter.ids) {
          filter = {
            id: {
              $in: data.filter.ids
            }
          }
        }
      }

      if (data.sort) {
        sort = {
          [data.sort.field]: data.sort.order === 'asc' ? 1 : -1
        }
      }

      const { limit, offset } = data
      const ${data.moduleName}s = await ${basicModelName}Mongoose.find(filter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
      return ${data.moduleName}s.map(${data.moduleName} => ${data.moduleName}.toObject())
    } catch (error) {
      throw error
    }
  }

  async create(data: {
    ${data.moduleName}: I${basicModelName}
  }): Promise<I${basicModelName}> {
    // Implement the method here
    try {
      const { ${data.moduleName} } = data
      const created${basicModelName} = await ${basicModelName}Mongoose.create(${data.moduleName})
      return created${basicModelName}.toObject()
    } catch (error) {
      throw error
    }
  }

  async update(data: {
    ${data.moduleName}: I${basicModelName}
  }): Promise<I${basicModelName} | undefined> {
    // Implement the method here
    try {
      const { ${data.moduleName} } = data
      const updated${basicModelName} = await ${basicModelName}Mongoose.findOneAndUpdate({
        id: ${data.moduleName}.id
      }, ${data.moduleName}, {
        new: true
      })
      return updated${basicModelName} ? updated${basicModelName}.toObject() : undefined
    } catch (error) {
      throw error
    }
  }
}

`

  const mongooseRepositoryPath = path.resolve(repoImplementationsPath, `${basicModelName}MongooseRepository.ts`)
  fs.writeFileSync(mongooseRepositoryPath, mongooseCrudRepository)
  fs.appendFileSync(repoImplementationsIndexPath, `export * from './${basicModelName}MongooseRepository'\n`)

  const utilsPath = path.resolve(data.path, "utils")
  fs.mkdirSync(utilsPath)
  const utilsIndexPath = path.resolve(utilsPath, "index.ts")

  let validateUtil = `
  import { validateCommon } from "../../common"
  import { I${basicModelName}} from "../models"

  export const validate${basicModelName}= (data: Partial<I${basicModelName}>): I${basicModelName}=> {
    validateCommon({
      id: data.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    })
    \n`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    if (!keyValue.isOptional) {
      validateUtil = validateUtil + `\nif(!data.${keyValue.key}) {
        throw new Error("Required field error ${basicModelName}: ${keyValue.key}")
      }`
    }

  }
  validateUtil = validateUtil + `\n return data as I${basicModelName}
}
  `

  const validateUtilPath = path.resolve(utilsPath, `Validate${basicModelName}.ts`)
  fs.writeFileSync(validateUtilPath, validateUtil)

  const pathIndex = path.resolve(data.path, "index.ts")

  fs.appendFileSync(utilsIndexPath, `export * from './Validate${basicModelName}'\n`)
  fs.appendFileSync(pathIndex, `export * from './utils'\n`)

  const useCasesPath = path.resolve(data.path, "use-cases")
  fs.mkdirSync(useCasesPath)
  const useCasesIndexPath = path.resolve(useCasesPath, "index.ts")

  const createUseCasePath = path.resolve(useCasesPath, `create-${data.moduleName}`)
  fs.mkdirSync(createUseCasePath)
  const createUseCaseIndexPath = path.resolve(createUseCasePath, "index.ts")

  const createUseCaseTypesPath = path.resolve(createUseCasePath, "types")
  fs.mkdirSync(createUseCaseTypesPath)
  const createUseCaseTypesIndexPath = path.resolve(createUseCaseTypesPath, "index.ts")

  let createUseCaseRequestObj = `export interface IRequest {`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    createUseCaseRequestObj = createUseCaseRequestObj + `\n${keyValue.key}?: ${keyValue.value}`
  }
  createUseCaseRequestObj = createUseCaseRequestObj + ` \n}`

  const createUseCaseRequestObjPath = path.resolve(createUseCaseTypesPath, "IRequest.ts")
  fs.writeFileSync(createUseCaseRequestObjPath, createUseCaseRequestObj)
  fs.appendFileSync(createUseCaseTypesIndexPath, "export * from './IRequest' \n")

  const createUseCaseResponseObjPath = path.resolve(createUseCaseTypesPath, "IResponse.ts")

  const createUseCaseResponse = `
  import { I${basicModelName} } from "../../../models";
  export interface IResponse {
     ${data.moduleName}: I${basicModelName}
  }
  `
  fs.writeFileSync(createUseCaseResponseObjPath, createUseCaseResponse)
  fs.appendFileSync(createUseCaseTypesIndexPath, "export * from './IResponse'\n")

  const createUseCaseImplementationPath = path.resolve(createUseCasePath, "UseCase.ts")
  let createUseCaseImplementation = `
import { I${basicModelName}Repository } from "../../repositories"
import { IRequest, IResponse } from "./types"
import { v4 } from 'uuid'
import { validate${basicModelName} } from "../../utils"
import { I${basicModelName} } from "../../models"

export class Create${basicModelName}UseCase {
  private readonly ${data.moduleName}Repository: I${basicModelName}Repository
  constructor(
    data: {
      ${data.moduleName}Repository: I${basicModelName}Repository
    }
  ) {
    this.${data.moduleName}Repository = data.${data.moduleName}Repository
  }

  async execute(input: IRequest): Promise<IResponse> {
    console.log('input', input)

      const ${data.moduleName}ToSave: Partial<I${basicModelName}> = {
        id: v4(),
        updatedAt: new Date(),
        createdAt: new Date(),`

  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    createUseCaseImplementation += `\n${keyValue.key}: input.${keyValue.key},`
  }
  createUseCaseImplementation += `
    }
      const validated${basicModelName} = validate${basicModelName}(${data.moduleName}ToSave)

      const ${data.moduleName} = await this.${data.moduleName}Repository.create({
        ${data.moduleName}: validated${basicModelName}
      })

      return {
        ${data.moduleName}
      }
  }
}       
`
  fs.writeFileSync(createUseCaseImplementationPath, createUseCaseImplementation)

  const createUseCaseControllerPath = path.resolve(createUseCasePath, "Controller.ts")
  let createUseCaseController = `
  import { Request, Response } from "express"
import { Create${basicModelName}UseCase } from "./UseCase"

export class Create${basicModelName}Controller {
  private readonly create${basicModelName}: Create${basicModelName}UseCase
  constructor(data: {
    create${basicModelName}: Create${basicModelName}UseCase
  }) {
    this.create${basicModelName} = data.create${basicModelName}

  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { body } = request
      const ${data.moduleName} = await this.create${basicModelName}.execute({\n`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    createUseCaseController += `${keyValue.key}: body.${keyValue.key},\n`
  }
  createUseCaseController += `
      })
      return response.status(201).json(${data.moduleName})
    } catch (error: any) {
      return response.status(400).json({
        message: error.message || 'Unexpected error.'
      })
    }
  }
}\n`
  fs.writeFileSync(createUseCaseControllerPath, createUseCaseController)
  fs.appendFileSync(createUseCaseIndexPath, "export * from './Controller'\n")

  const createUseCaseSetupControllerPath = path.resolve(createUseCasePath, "setupController.ts")
  const createUseCaseSetupController = `
  import { ${basicModelName}MongooseRepository } from "../../repositories"
  import { Create${basicModelName}Controller } from "./Controller"
  import { Create${basicModelName}UseCase } from "./UseCase"

  export const setupCreate${basicModelName}Controller = () => {
    const useCase = new Create${basicModelName}UseCase({
      ${data.moduleName}Repository: new ${basicModelName}MongooseRepository()
    })

    const controller = new Create${basicModelName}Controller({
      create${basicModelName}: useCase
    })


    return {
      create${basicModelName}Controller: controller,
    }
  }
  `
  fs.writeFileSync(createUseCaseSetupControllerPath, createUseCaseSetupController)
  fs.appendFileSync(createUseCaseIndexPath, "export * from './setupController'\n")

  fs.appendFileSync(useCasesIndexPath, `export * from './create-${data.moduleName}'\n`)

  fs.appendFileSync(pathIndex, "export * from './use-cases'\n")

 


  const listUseCasePath = path.resolve(useCasesPath, `list-${data.moduleName}`)
  fs.mkdirSync(listUseCasePath)
  const listUseCaseIndexPath = path.resolve(listUseCasePath, "index.ts")

  const listUseCaseTypesPath = path.resolve(listUseCasePath, "types")
  fs.mkdirSync(listUseCaseTypesPath)
  const listUseCaseTypesIndexPath = path.resolve(listUseCaseTypesPath, "index.ts")

  let listUseCaseRequestObj = `
export interface IRequest {
    data?: {
    limit?: number
    offset?: number
    filter?: {
    }
  }
}
  `
  const listUseCaseRequestObjPath = path.resolve(listUseCaseTypesPath, "IRequest.ts")
  fs.writeFileSync(listUseCaseRequestObjPath, listUseCaseRequestObj)
  fs.appendFileSync(listUseCaseTypesIndexPath, "export * from './IRequest' \n")

  const listUseCaseResponseObjPath = path.resolve(listUseCaseTypesPath, "IResponse.ts")

  const listUseCaseResponse = `
import { I${basicModelName} } from "../../../models";

export interface IResponse {
  ${data.moduleName}List: I${basicModelName}[]
}
  `
  fs.writeFileSync(listUseCaseResponseObjPath, listUseCaseResponse)
  fs.appendFileSync(listUseCaseTypesIndexPath, "export * from './IResponse'\n")

  const listUseCaseImplementationPath = path.resolve(listUseCasePath, "UseCase.ts")
  let listUseCaseImplementation = `
import { I${basicModelName}Repository } from "../../repositories"
import { IRequest, IResponse } from "./types"


export class List${basicModelName}UseCase {
  private readonly ${data.moduleName}Repository: I${basicModelName}Repository
  constructor(
    data: {
      ${data.moduleName}Repository: I${basicModelName}Repository
    }
  ) {
    this.${data.moduleName}Repository = data.${data.moduleName}Repository
  }

  async execute(input: IRequest): Promise<IResponse> {
    console.log('input', input)
    console.log(input.data?.filter)
    const ${data.moduleName}List = await this.${data.moduleName}Repository.findAll({
      limit: input.data?.limit ?? 10,
      offset: input.data?.offset ?? 0,
      filter: {
      }
    })
    return {
      ${data.moduleName}List: ${data.moduleName}List
    }
  }
}
`
fs.writeFileSync(listUseCaseImplementationPath, listUseCaseImplementation)

const listUseCaseControllerPath = path.resolve(listUseCasePath, "Controller.ts")
let listUseCaseController = `
import { Request, Response } from "express"
import { List${basicModelName}UseCase } from "./UseCase"

export class List${basicModelName}Controller {
  private readonly list${basicModelName}: List${basicModelName}UseCase
  constructor(data: {
    list${basicModelName}: List${basicModelName}UseCase
  }) {
    this.list${basicModelName} = data.list${basicModelName}

  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { query } = request
      const ${data.moduleName}List = await this.list${basicModelName}.execute({
        data: query
      })
      return response.status(200).json(${data.moduleName}List)
    } catch (error: any) {
      return response.status(400).json({
        message: error.message || 'Unexpected error.'
      })
    }
  }
}
`

fs.writeFileSync(listUseCaseControllerPath, listUseCaseController)
fs.appendFileSync(listUseCaseIndexPath, "export * from './Controller'\n")

const listUseCaseSetupControllerPath = path.resolve(listUseCasePath, "setupController.ts")
const listUseCaseSetupController = `
import { ${basicModelName}MongooseRepository } from "../../repositories"
import { List${basicModelName}Controller } from "./Controller"
import { List${basicModelName}UseCase } from "./UseCase"

export const setupList${basicModelName}Controller = () => {
  const useCase = new List${basicModelName}UseCase({
    ${data.moduleName}Repository: new ${basicModelName}MongooseRepository()
  })

  const controller = new List${basicModelName}Controller({
    list${basicModelName}: useCase
  })


  return {
    list${basicModelName}Controller: controller,
  }
}
`
fs.writeFileSync(listUseCaseSetupControllerPath, listUseCaseSetupController)
fs.appendFileSync(listUseCaseIndexPath, "export * from './setupController'\n")

fs.appendFileSync(useCasesIndexPath, `export * from './list-${data.moduleName}'\n`)



const routesPath = path.resolve(data.path, "routes")
fs.mkdirSync(routesPath)
const moduleRoutesPath = path.resolve(routesPath, `${data.moduleName}ExpressRoutes.ts`)

const moduleRoutes = `
import express, { Request, Response } from 'express';
import { setupCreate${basicModelName}Controller } from '../use-cases';
import { setupListUserController } from '../use-cases';

const router = express.Router();

/* User Routes */
router.post('/',(req: Request, res: Response) => {
const { create${basicModelName}Controller } = setupCreate${basicModelName}Controller()
create${basicModelName}Controller.handle(req, res)
})

router.get('/',(req: Request, res: Response) => {
  const { list${basicModelName}Controller } = setupList${basicModelName}Controller()
  list${basicModelName}Controller.handle(req, res)
})

export { router as ${data.moduleName}ExpressRoutes }
`

fs.writeFileSync(moduleRoutesPath, moduleRoutes)

const moduleRoutesIndexPath = path.resolve(routesPath, "index.ts")
fs.appendFileSync(moduleRoutesIndexPath, `export * from './${data.moduleName}ExpressRoutes' \n`)
fs.appendFileSync(pathIndex, "export * from './routes'\n")

}




