import path from "path"
import ts from "typescript";
import fs from 'fs'

const generateSchema = (keyValueArray: any[]) => {
  let properties: { [key: string]: any } = {};
  let required: string[] = [];

  keyValueArray.forEach(({ key, value, isOptional }) => {
    if (value.includes("[]")) {
      properties[key] = { type: "array", items: { type: value.replace("[]", "") } };
    } else {
      properties[key] = { type: value };
    }
    if (!isOptional) {
      required.push(key);
    }
  });




  return {
    type: "object",
    properties,
    required,
  };
};

const addCrudToSwaggerJson = (swaggerJson: any, basicModelName: string, moduleName: string, keyValueArray: any[]) => {
  // Gerar os schemas para o CRUD
  const createRequestSchemaName = `${basicModelName}CreateRequest`;
  const updateRequestSchemaName = `${basicModelName}UpdateRequest`;
  const responseSchemaName = `${basicModelName}Response`;

  swaggerJson.components.schemas[createRequestSchemaName] = generateSchema(
    keyValueArray.filter(({ key }) => key !== "id") // Excluir "id" no Create
  );

  swaggerJson.components.schemas[updateRequestSchemaName] = generateSchema(
    keyValueArray // Permitir "id" no Update
  );

  swaggerJson.components.schemas[responseSchemaName] = generateSchema(keyValueArray);

  // Adicionar as rotas de CRUD
  swaggerJson.paths[`/${moduleName}`] = {
    post: {
      tags: [basicModelName],
      summary: `Create a new ${basicModelName}`,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${createRequestSchemaName}` },
          },
        },
      },
      responses: {
        "201": {
          description: `${basicModelName} created successfully`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${responseSchemaName}` },
            },
          },
        },
      },
    },
    get: {
      tags: [basicModelName],
      summary: `List all ${basicModelName}s`,
      responses: {
        "200": {
          description: `List of ${basicModelName}s retrieved successfully`,
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: `#/components/schemas/${responseSchemaName}` },
              },
            },
          },
        },
      },
    },
  };

  swaggerJson.paths[`/${moduleName}/{id}`] = {
    get: {
      tags: [basicModelName],
      summary: `Retrieve a specific ${basicModelName}`,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "200": {
          description: `${basicModelName} retrieved successfully`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${responseSchemaName}` },
            },
          },
        },
      },
    },
    put: {
      tags: [basicModelName],
      summary: `Update a specific ${basicModelName}`,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${updateRequestSchemaName}` },
          },
        },
      },
      responses: {
        "200": {
          description: `${basicModelName} updated successfully`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${responseSchemaName}` },
            },
          },
        },
      },
    },
    delete: {
      tags: [basicModelName],
      summary: `Delete a specific ${basicModelName}`,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        "204": {
          description: `${basicModelName} deleted successfully`,
        },
      },
    },
  };

  return swaggerJson

};

export const addCustomRequestToSwaggerJson = (data: {
  swaggerJson: any,
  path: string,
  method: "get" | "post" | "put" | "delete" | "patch",
  basicModelName: string,
  customOptions: {
    summary?: string;
    description?: string;
    requestBodySchema?: string; // Nome do schema do corpo da requisição
    responseSchema?: string; // Nome do schema da resposta
    parameters?: Array<{
      name: string;
      in: "query" | "header" | "path" | "cookie";
      required?: boolean;
      schema: { type: string };
      description?: string;
    }>;
    responses?: {
      [statusCode: string]: {
        description: string;
        schemaRef?: string; // $ref para o schema da resposta
        schema?: { type: string; properties: any };
      };
    };
  }
}
) => {
  const { swaggerJson, basicModelName, customOptions, method, path } = data
  if (!swaggerJson.paths[path]) {
    swaggerJson.paths[path] = {};
  }

  const operation = {
    tags: [basicModelName],
    summary: customOptions.summary || `Custom operation for ${basicModelName}`,
    description: customOptions.description || "",
    parameters: customOptions.parameters || [],
    requestBody: customOptions.requestBodySchema
      ? {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: `#/components/schemas/${customOptions.requestBodySchema}`,
            },
          },
        },
      }
      : undefined,
    responses: customOptions.responses
      ? Object.fromEntries(
        Object.entries(customOptions.responses).map(([statusCode, response]) => [
          statusCode,
          {
            description: response.description,
            content: response.schemaRef
              ? {
                "application/json": {
                  schema: {
                    $ref: response.schemaRef,
                  },
                },
              }
              : response.schema
                ? {
                  "application/json": {
                    schema: response.schema,
                  },
                }
                : undefined,
          },
        ])
      )
      : {},
  };

  swaggerJson.paths[path][method] = operation;

  return swaggerJson;
};



export const buildApiModule = (data: {
  path: string,
  moduleName: string,
  findAllQueryKeysOptions?: string[]
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

  const swaggerJsonPath = path.resolve(process.cwd(), "api", "swagger.json")
  let swaggerJson = JSON.parse(fs.readFileSync(swaggerJsonPath).toString())


  let newSwagger = addCrudToSwaggerJson(swaggerJson, basicModelName, data.moduleName, keyValueArray)


  fs.writeFileSync(swaggerJsonPath, JSON.stringify(newSwagger))
  // Exemplo de como adicionar ao swagger.json existente




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
  let repoCrudInterface = `
import { I${basicModelName} } from "../../models"

export interface ISort {
    field: 'createdAt',
    order: 'asc' | 'desc'
}

export interface IFilter {
  ids?: string[],\n`
  if (data.findAllQueryKeysOptions) {
    for (let i = 0; i < data.findAllQueryKeysOptions?.length; i++) {
      const queryKey = data.findAllQueryKeysOptions[i]
      if (queryKey !== 'ids') {
        const keyValue = keyValueArray.find(item => item.key === queryKey)
        repoCrudInterface += `${queryKey}?: ${keyValue?.value},\n`
      }
    }
  }
  repoCrudInterface += "\n}"

  repoCrudInterface += `

export interface ${repoCrudInterfaceName} {
    findById(data: {
        id: string
    }): Promise<I${basicModelName} | undefined>

    findAll(data: {
        limit: number,
        offset: number,
        filter?: IFilter,
        sort?: ISort
    }): Promise<I${basicModelName}[]>

    create(data: {
        ${data.moduleName}: I${basicModelName}
    }): Promise<I${basicModelName}>

    update(data: {
           ${data.moduleName}: I${basicModelName}
    }): Promise<I${basicModelName}>

    delete(data: {
      id: string
    }): Promise<void>
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
    } else if (keyValue.value === 'string[]') {
      mongooseSchema = mongooseSchema + `\n${keyValue.key}: {type: [String], required: ${!keyValue.isOptional ? 'true' : 'false'}}, `
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

  let mongooseCrudRepository = `
import { I${basicModelName} } from "../../models"
import { ${repoCrudInterfaceName}, IFilter, ISort } from "../interfaces"
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
    limit: number, offset: number, filter?: IFilter, sort?: ISort
  }): Promise<I${basicModelName}[]> {
    // Implement the method here
    try {
      let filter: any = {}
      let sort = {}
      if (data.filter) {
        const filterKeys = Object.keys(data.filter)
        for (let i = 0; i < filterKeys.length; i++) {
          const key = filterKeys[i];
          const keyValue = (data.filter as any)[key]
          if (keyValue) {
            if (Array.isArray(keyValue)) {
              filter.id = {
                $in: keyValue,
              };
            } else {
              filter[key] = keyValue;
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
  }): Promise<I${basicModelName}> {
    // Implement the method here
    try {
      const { ${data.moduleName} } = data
      const updated${basicModelName} = await ${basicModelName}Mongoose.findOneAndUpdate({
        id: ${data.moduleName}.id
      }, ${data.moduleName}, {
        new: true
      })
      if(!updated${basicModelName}) {
        throw new Error("Not found error")
      }
      return updated${basicModelName}
    } catch (error) {
      throw error
    }
  }

  async delete(data: {
    id: string
  }): Promise<void> {
    try {
      const deleted${basicModelName} = await ${basicModelName}Mongoose.deleteOne({
        id: data.id
      })
      if(deleted${basicModelName}.deletedCount === 0){
        throw new Error("${basicModelName} not found error")
      }
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
      const result = await this.create${basicModelName}.execute({\n`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    createUseCaseController += `${keyValue.key}: body.${keyValue.key},\n`
  }
  createUseCaseController += `
      })
      return response.status(201).json(result)
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
      const result = await this.list${basicModelName}.execute({
        data: query
      })
      return response.status(200).json(result)
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

  const findByIdUseCasePath = path.resolve(useCasesPath, `find-${data.moduleName}-by-id`)
  fs.mkdirSync(findByIdUseCasePath)
  const findByIdUseCaseIndexPath = path.resolve(findByIdUseCasePath, "index.ts")

  const findByIdUseCaseTypesPath = path.resolve(findByIdUseCasePath, "types")
  fs.mkdirSync(findByIdUseCaseTypesPath)
  const findByIdUseCaseTypesIndexPath = path.resolve(findByIdUseCaseTypesPath, "index.ts")

  let findByIdUseCaseRequestObj = `
  export interface IRequest {
    id: string
  }`
  const findByIdUseCaseRequestObjPath = path.resolve(findByIdUseCaseTypesPath, "IRequest.ts")
  fs.writeFileSync(findByIdUseCaseRequestObjPath, findByIdUseCaseRequestObj)
  fs.appendFileSync(findByIdUseCaseTypesIndexPath, "export * from './IRequest' \n")

  const findByIdUseCaseResponseObjPath = path.resolve(findByIdUseCaseTypesPath, "IResponse.ts")

  const findByIdUseCaseResponse = `
import { I${basicModelName} } from "../../../models";

export interface IResponse {
${data.moduleName}: I${basicModelName}
}
`
  fs.writeFileSync(findByIdUseCaseResponseObjPath, findByIdUseCaseResponse)
  fs.appendFileSync(findByIdUseCaseTypesIndexPath, "export * from './IResponse'\n")

  const findByIdUseCaseImplementationPath = path.resolve(findByIdUseCasePath, "UseCase.ts")
  let findByIdUseCaseImplementation = `

  import { I${basicModelName} } from "../../models"
  import { I${basicModelName}Repository } from "../../repositories"
  import { IRequest, IResponse } from "./types"
  
  export class Find${basicModelName}ByIdUseCase {
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
      if (!input.id)
        throw new Error("Id is a required field")
      const ${data.moduleName} = await this.${data.moduleName}Repository.findById({
        id: input.id
      })
      if(!${data.moduleName}) {
        throw new Error("Not found error")
      }
      return {
      ${data.moduleName}
    }
    }
}
  `
  fs.writeFileSync(findByIdUseCaseImplementationPath, findByIdUseCaseImplementation)

  const findByIdUseCaseControllerPath = path.resolve(findByIdUseCasePath, "Controller.ts")
  let findByIdUseCaseController = `
import { Request, Response } from "express"
import { Find${basicModelName}ByIdUseCase } from "./UseCase"

export class Find${basicModelName}ByIdController {
  private readonly find${basicModelName}ById: Find${basicModelName}ByIdUseCase
  constructor(data: {
    find${basicModelName}ById: Find${basicModelName}ByIdUseCase
  }) {
    this.find${basicModelName}ById = data.find${basicModelName}ById
  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { body, params } = request
      const result = await this.find${basicModelName}ById.execute({
          id: params.id        
      })
      return response.status(200).json(result)
    } catch (error: any) {
      return response.status(400).json({
        message: error.message || 'Unexpected error.'
      })
    }
  }
}`

  fs.writeFileSync(findByIdUseCaseControllerPath, findByIdUseCaseController)
  fs.appendFileSync(findByIdUseCaseIndexPath, "export * from './Controller'\n")

  const findByIdUseCaseSetupControllerPath = path.resolve(findByIdUseCasePath, "setupController.ts")
  const findByIdUseCaseSetupController = `
import { ${basicModelName}MongooseRepository } from "../../repositories"
import { Find${basicModelName}ByIdController } from "./Controller"
import { Find${basicModelName}ByIdUseCase } from "./UseCase"

export const setupFind${basicModelName}ByIdController = () => {
  const useCase = new Find${basicModelName}ByIdUseCase({
    ${data.moduleName}Repository: new ${basicModelName}MongooseRepository()
  })

  const controller = new Find${basicModelName}ByIdController({
    find${basicModelName}ById: useCase
  })


  return {
   find${basicModelName}ByIdController: controller,
  }
}
`

  fs.writeFileSync(findByIdUseCaseSetupControllerPath, findByIdUseCaseSetupController)
  fs.appendFileSync(findByIdUseCaseIndexPath, "export * from './setupController'\n")

  fs.appendFileSync(useCasesIndexPath, `export * from './find-${data.moduleName}-by-id'\n`)

  const updateUseCasePath = path.resolve(useCasesPath, `update-${data.moduleName}`)
  fs.mkdirSync(updateUseCasePath)
  const updateUseCaseIndexPath = path.resolve(updateUseCasePath, "index.ts")

  const updateUseCaseTypesPath = path.resolve(updateUseCasePath, "types")
  fs.mkdirSync(updateUseCaseTypesPath)
  const updateUseCaseTypesIndexPath = path.resolve(updateUseCaseTypesPath, "index.ts")

  let updateUseCaseRequestObj = `
export interface IRequest {
  id: string\n`

  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    updateUseCaseRequestObj += `${keyValue.key}?: ${keyValue.value}\n`
  }

  updateUseCaseRequestObj += `
}\n`
  const updateUseCaseRequestObjPath = path.resolve(updateUseCaseTypesPath, "IRequest.ts")
  fs.writeFileSync(updateUseCaseRequestObjPath, updateUseCaseRequestObj)
  fs.appendFileSync(updateUseCaseTypesIndexPath, "export * from './IRequest' \n")

  const updateUseCaseResponseObjPath = path.resolve(updateUseCaseTypesPath, "IResponse.ts")

  const updateUseCaseResponse = `
import { I${basicModelName} } from "../../../models";

export interface IResponse {
${data.moduleName}: I${basicModelName}
}
`
  fs.writeFileSync(updateUseCaseResponseObjPath, updateUseCaseResponse)
  fs.appendFileSync(updateUseCaseTypesIndexPath, "export * from './IResponse'\n")

  const updateUseCaseImplementationPath = path.resolve(updateUseCasePath, "UseCase.ts")
  let updateUseCaseImplementation = `

  import { I${basicModelName} } from "../../models"
  import { I${basicModelName}Repository } from "../../repositories"
  import { validate${basicModelName} } from "../../utils"
  import { IRequest, IResponse } from "./types"
  
  export class Update${basicModelName}UseCase {
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
      if (!input.id)
        throw new Error("Id is a required field")
  
      const prev${basicModelName} = await this.${data.moduleName}Repository.findById({
        id: input.id
      })
  
      if(!prev${basicModelName}){
        throw new Error("${basicModelName} not found")
      }
  
      const ${data.moduleName}ToSave: Partial<I${basicModelName}> = {
        ...prev${basicModelName},`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    updateUseCaseImplementation += `${keyValue.key}: input.${keyValue.key} ? input.${keyValue.key}: prev${basicModelName}.${keyValue.key},`
  }
  updateUseCaseImplementation += `
        updatedAt: new Date()
      }
      const validated${basicModelName} = validate${basicModelName}(${data.moduleName}ToSave)
  
      const ${data.moduleName} = await this.${data.moduleName}Repository.update({
        ${data.moduleName}: validated${basicModelName}
      })
  
      if(!${data.moduleName}){
        throw new Error("Error updating ${basicModelName}")
      }
  
      return {
        ${data.moduleName}
      }
    }
  }
  
`
  fs.writeFileSync(updateUseCaseImplementationPath, updateUseCaseImplementation)

  const updateUseCaseControllerPath = path.resolve(updateUseCasePath, "Controller.ts")
  let updateUseCaseController = `
import { Request, Response } from "express"
import { Update${basicModelName}UseCase } from "./UseCase"

export class Update${basicModelName}Controller {
  private readonly update${basicModelName}: Update${basicModelName}UseCase
  constructor(data: {
    update${basicModelName}: Update${basicModelName}UseCase
  }) {
    this.update${basicModelName} = data.update${basicModelName}

  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { body, params } = request
      const result = await this.update${basicModelName}.execute({
          id: params.id,\n`
  for (let i = 0; i < keyValueArray.length; i++) {
    const keyValue = keyValueArray[i]
    updateUseCaseController += `${keyValue.key}: body.${keyValue.key},\n`
  }
  updateUseCaseController += `          
      })
      return response.status(200).json(result)
    } catch (error: any) {
      return response.status(400).json({
        message: error.message || 'Unexpected error.'
      })
    }
  }
}`

  fs.writeFileSync(updateUseCaseControllerPath, updateUseCaseController)
  fs.appendFileSync(updateUseCaseIndexPath, "export * from './Controller'\n")

  const updateUseCaseSetupControllerPath = path.resolve(updateUseCasePath, "setupController.ts")
  const updateUseCaseSetupController = `
import { ${basicModelName}MongooseRepository } from "../../repositories"
import { Update${basicModelName}Controller } from "./Controller"
import { Update${basicModelName}UseCase } from "./UseCase"

export const setupUpdate${basicModelName}Controller = () => {
  const useCase = new Update${basicModelName}UseCase({
    ${data.moduleName}Repository: new ${basicModelName}MongooseRepository()
  })

  const controller = new Update${basicModelName}Controller({
    update${basicModelName}: useCase
  })


  return {
    update${basicModelName}Controller: controller,
  }
}
`

  fs.writeFileSync(updateUseCaseSetupControllerPath, updateUseCaseSetupController)
  fs.appendFileSync(updateUseCaseIndexPath, "export * from './setupController'\n")

  fs.appendFileSync(useCasesIndexPath, `export * from './update-${data.moduleName}'\n`)


  const deleteUseCasePath = path.resolve(useCasesPath, `delete-${data.moduleName}`)
  fs.mkdirSync(deleteUseCasePath)
  const deleteUseCaseIndexPath = path.resolve(deleteUseCasePath, "index.ts")

  const deleteUseCaseTypesPath = path.resolve(deleteUseCasePath, "types")
  fs.mkdirSync(deleteUseCaseTypesPath)
  const deleteUseCaseTypesIndexPath = path.resolve(deleteUseCaseTypesPath, "index.ts")

  let deleteUseCaseRequestObj = `
export interface IRequest {
  id: string
}`

  const deleteUseCaseRequestObjPath = path.resolve(deleteUseCaseTypesPath, "IRequest.ts")
  fs.writeFileSync(deleteUseCaseRequestObjPath, deleteUseCaseRequestObj)
  fs.appendFileSync(deleteUseCaseTypesIndexPath, "export * from './IRequest' \n")

  const deleteUseCaseResponseObjPath = path.resolve(deleteUseCaseTypesPath, "IResponse.ts")

  const deleteUseCaseResponse = `
import { I${basicModelName} } from "../../../models";

export interface IResponse {

}
`
  fs.writeFileSync(deleteUseCaseResponseObjPath, deleteUseCaseResponse)
  fs.appendFileSync(deleteUseCaseTypesIndexPath, "export * from './IResponse'\n")

  const deleteUseCaseImplementationPath = path.resolve(deleteUseCasePath, "UseCase.ts")
  let deleteUseCaseImplementation = `

  import { I${basicModelName}Repository } from "../../repositories"
  import { IRequest, IResponse } from "./types"
  
  export class Delete${basicModelName}UseCase {
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
      if (!input.id)
        throw new Error("Id is a required field")
  

  
      await this.${data.moduleName}Repository.delete({
        id: input.id
      })
  
      return {}
    }
  }
  
`
  fs.writeFileSync(deleteUseCaseImplementationPath, deleteUseCaseImplementation)

  const deleteUseCaseControllerPath = path.resolve(deleteUseCasePath, "Controller.ts")
  let deleteUseCaseController = `
import { Request, Response } from "express"
import { Delete${basicModelName}UseCase } from "./UseCase"

export class Delete${basicModelName}Controller {
  private readonly delete${basicModelName}: Delete${basicModelName}UseCase
  constructor(data: {
    delete${basicModelName}: Delete${basicModelName}UseCase
  }) {
    this.delete${basicModelName} = data.delete${basicModelName}

  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { body, params } = request
      const result = await this.delete${basicModelName}.execute({
          id: params.id
      })
      return response.status(200).json(result)
    } catch (error: any) {
      return response.status(400).json({
        message: error.message || 'Unexpected error.'
      })
    }
  }
}`

  fs.writeFileSync(deleteUseCaseControllerPath, deleteUseCaseController)
  fs.appendFileSync(deleteUseCaseIndexPath, "export * from './Controller'\n")

  const deleteUseCaseSetupControllerPath = path.resolve(deleteUseCasePath, "setupController.ts")
  const deleteUseCaseSetupController = `
import { ${basicModelName}MongooseRepository } from "../../repositories"
import { Delete${basicModelName}Controller } from "./Controller"
import { Delete${basicModelName}UseCase } from "./UseCase"

export const setupDelete${basicModelName}Controller = () => {
  const useCase = new Delete${basicModelName}UseCase({
    ${data.moduleName}Repository: new ${basicModelName}MongooseRepository()
  })

  const controller = new Delete${basicModelName}Controller({
    delete${basicModelName}: useCase
  })


  return {
    delete${basicModelName}Controller: controller,
  }
}
`

  fs.writeFileSync(deleteUseCaseSetupControllerPath, deleteUseCaseSetupController)
  fs.appendFileSync(deleteUseCaseIndexPath, "export * from './setupController'\n")

  fs.appendFileSync(useCasesIndexPath, `export * from './delete-${data.moduleName}'\n`)


  const routesPath = path.resolve(data.path, "routes")
  fs.mkdirSync(routesPath)
  const moduleRoutesPath = path.resolve(routesPath, `${data.moduleName}ExpressRoutes.ts`)

  const moduleRoutes = `
  import express, { Request, Response } from 'express';
  import { setupCreate${basicModelName}Controller,setupList${basicModelName}Controller, setupUpdate${basicModelName}Controller, setupDelete${basicModelName}Controller } from '../use-cases';
  
  const router = express.Router();
  
  /* ${basicModelName} Routes */
  router.post('/',(req: Request, res: Response) => {
  const { create${basicModelName}Controller } = setupCreate${basicModelName}Controller()
  create${basicModelName}Controller.handle(req, res)
  })
  
  router.get('/',(req: Request, res: Response) => {
    const { list${basicModelName}Controller } = setupList${basicModelName}Controller()
    list${basicModelName}Controller.handle(req, res)
  })

  router.get('/:id',(req: Request, res: Response) => {
    const { find${basicModelName}ByIdController } = setupFind${basicModelName}ByIdController()
    find${basicModelName}ByIdController.handle(req, res)
})
  
  router.put('/:id',(req: Request, res: Response) => {
    const { update${basicModelName}Controller } = setupUpdate${basicModelName}Controller()
    update${basicModelName}Controller.handle(req, res)
  })

  router.delete('/:id',(req: Request, res: Response) => {
    const { delete${basicModelName}Controller } = setupDelete${basicModelName}Controller()
    delete${basicModelName}Controller.handle(req, res)
  })
  
  
  export { router as ${data.moduleName}ExpressRoutes }
  
`

  fs.writeFileSync(moduleRoutesPath, moduleRoutes)

  const moduleRoutesIndexPath = path.resolve(routesPath, "index.ts")
  fs.appendFileSync(moduleRoutesIndexPath, `export * from './${data.moduleName}ExpressRoutes' \n`)
  fs.appendFileSync(pathIndex, "export * from './routes'\n")
  fs.appendFileSync(pathIndex, "export * from './use-cases'\n")
}




