import path from 'path'
import fs from 'fs'


export const useCaseRequestBlank = `
    export interface IRequest {
    
    }
`

export const useCaseResponseBlank = `
    export interface IResponse {
    
    }
`

function formatToPascalCase(input: string): string {
    return input
      .split('-')                                // Divide a string nos traços
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitaliza a primeira letra
      .join('');                                 // Junta as palavras sem separador
  }


export const useCaseBlank = (data: {
    useCaseName: string
}) => {
    return `
import { IRequest, IResponse } from "./types"

export class ${formatToPascalCase(data.useCaseName)}UseCase {
  constructor(
    data: {
    }
  ) {
  }

  async execute(input: IRequest): Promise<IResponse> {
    console.log('input', input)

    return {}

 }
}
`

}

export const useCaseControllerBlank = (data: {
    useCaseName: string,
    moduleName: string
}) => {
    return `
        import { Request, Response } from "express"
import { ${formatToPascalCase(data.useCaseName)}UseCase } from "./UseCase"

export class ${formatToPascalCase(data.useCaseName)}Controller {
  private readonly ${formatToPascalCase(data.useCaseName)}: ${formatToPascalCase(data.useCaseName)}UseCase
  constructor(data: {
    ${formatToPascalCase(data.useCaseName)}: ${formatToPascalCase(data.useCaseName)}UseCase
  }) {
    this.${formatToPascalCase(data.useCaseName)} = data.${formatToPascalCase(data.useCaseName)}

  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { body } = request
      const ${data.moduleName} = await this.${formatToPascalCase(data.useCaseName)}.execute({\n
    })
      response.status(200).json(${data.moduleName})
    } catch (error: any) {
      return response.status(500).json({
        message: error.message || 'Unexpected error.'
      })
    }
}
}
`
}

export const createUseCase = (data: {
    modulePath: string,
    moduleName: string,
    useCaseName: string,
    useCaseFileString?: string,
    requestFileStirng?: string,
    responseFIleString?: string,
    controllerFileStirng?: string,
    setupControllerFIleString?: string,
    routeConfigFileString?: string
}) => {
    const useCasesIndexPath = path.resolve(data.modulePath, "use-cases", "index.ts")

    const useCasePath = path.resolve(data.modulePath, "use-cases", data.useCaseName)
    fs.mkdirSync(useCasePath)
    const useCaseIndexPath = path.resolve(useCasePath, 'index.ts')

    const useCaseImplementationPath = path.resolve(useCasePath, "UseCase.ts")
    fs.writeFileSync(useCaseImplementationPath, data.useCaseFileString ? data.useCaseFileString : useCaseBlank({
        useCaseName: data.useCaseName
    }))

    fs.appendFileSync(useCaseIndexPath, "export * from './UseCase'\n")

    const useCaseControllerPath = path.resolve(useCasePath, "Controller.ts")
    fs.writeFileSync(useCaseControllerPath, data.controllerFileStirng ? data.controllerFileStirng : useCaseControllerBlank({
        moduleName: data.moduleName,
        useCaseName: data.useCaseName
    }))
    
    fs.appendFileSync(useCaseIndexPath, "export * from './Controller'\n")

    const useCaseTypesPath = path.resolve(useCasePath, "types")
    fs.mkdirSync(useCaseTypesPath)

    const requestPath = path.resolve(useCaseTypesPath, "IRequest.ts")
    fs.writeFileSync(requestPath, data.requestFileStirng ? data.requestFileStirng : useCaseRequestBlank)

    const responsePath = path.resolve(useCaseTypesPath, "IResponse.ts")
    fs.writeFileSync(responsePath, data.responseFIleString ? data.responseFIleString : useCaseResponseBlank)

    const typesIndexPath = path.resolve(useCaseTypesPath, "index.ts")

    fs.appendFileSync(typesIndexPath, "export * from './IRequest'\n")
    fs.appendFileSync(typesIndexPath, "export * from './IResponse'\n")


    // const setupControllerPath = path.resolve(useCasePath, "setupController.ts")
    // fs.writeFileSync(setupControllerPath, data.setupControllerFIleString ? data.setupControllerFIleString : "")
    // fs.appendFileSync(useCaseIndexPath, "export * from './setupController'\n")


    // const routesPath = path.resolve(data.modulePath, "routes", `${data.moduleName}ExpressRoutes.ts`)

    // const routes = fs.readFileSync(routesPath).toString()
    // let routesEdited = routes.replace(`export { router as ${data.moduleName}ExpressRoutes };`, `\n
    //     ${data.routeConfigFileString}\n
    //     export { router as ${data.moduleName}ExpressRoutes };`)

    // fs.writeFileSync(routesPath, routesEdited)
    fs.appendFileSync(useCasesIndexPath, `export * from './${data.useCaseName}'\n`)
}