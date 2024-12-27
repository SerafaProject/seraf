#! /usr/bin/env node

import { Command } from 'commander'
import path from 'path'
import figlet from 'figlet'
import prompts from 'prompts'
import { initSerafProject } from './initSerafProject';
import { createApiModule } from './createApiModule';
import { buildApiModule } from './buildApiModule';
import z from 'zod'
import OpenAI from 'openai';
import fs from 'fs'
import { zodResponseFormat } from "openai/helpers/zod";
import { createUseCase } from './createUseCase';
import { processFiles } from './tsHelper';

const program = new Command();

program
  .name('seraf')
  .description('CLI to build and scaffold javascript applications')
  .version('0.8.0');

program.command('init')
  .description('Initiate a SerafProject')
  // .option('--first', 'display just the first substring')
  // .option('-s, --separator <char>', 'separator character', ',')
  .action(async () => {

    const projectSettings = await prompts([
      {
        type: 'text',
        name: 'projectName',
        message: 'Project Name',
      },
      {
        type: 'number',
        name: 'serverPort',
        message: 'API Server port'
      },
      {
        type: 'text',
        name: 'dbName',
        message: 'Db Name',
      },
      {
        type: 'text',
        name: 'dbHost',
        message: 'Db Host',
      },
      {
        type: 'text',
        name: 'dbPort',
        message: 'Db Port',
      },
      {
        type: 'text',
        name: 'dbUser',
        message: 'Db User',
      },
      {
        type: 'text',
        name: 'dbPassword',
        message: 'Db Password',
      },
    ]);
    initSerafProject({
      config: {
        api: {
          apiType: 'express',
          serverPort: projectSettings.serverPort
        },
        db: {
          dbName: projectSettings.dbName,
          dbType: "mongodb",
          host: projectSettings.dbHost,
          password: projectSettings.dbPassword,
          port: projectSettings.dbPort,
          user: projectSettings.dbUser
        },
        projectName: projectSettings.projectName,
      },
      path: path.resolve(process.cwd(), "")
    })
  });
program.command('create')
  .description('Creates a SerafProject component')
  // .option('--first', 'display just the first substring')
  // .option('-s, --separator <char>', 'separator character', ',')
  // .argument('<moduleName>', 'moduleName')

  .action(async () => {
    const createOption = await prompts(
      {
        type: 'select',
        name: 'createOption',
        message: 'Choose an option',
        choices: [
          { title: 'Module', value: 'module' },
          { title: 'Module Build', value: 'moduleBuild' },
          { title: 'Use Case', value: "useCase" }
        ],
      }
    );

    const currentPath = path.resolve(process.cwd(), "")
    if (createOption.createOption === 'module') {
      const moduleSettings = await prompts([
        {
          type: 'text',
          name: 'moduleName',
          message: 'Module Name',
        }
      ]);

      createApiModule({
        projectPath: currentPath,
        moduleName: moduleSettings.moduleName
      })
      processFiles()

    } else if (createOption.createOption === 'moduleBuild') {
      const moduleName = await prompts(
        {
          type: 'text',
          name: 'moduleName',
          message: 'Module Name',
        }
      );
      const modulePath = path.resolve(currentPath, "api", "src", "modules", moduleName.moduleName)

      buildApiModule({
        path: modulePath,
        moduleName: moduleName.moduleName
      })
      processFiles()
    } else if (createOption.createOption === 'useCase') {
      const createUseCaseOptions = await prompts(
        [
          {
            type: 'text',
            name: 'moduleName',
            message: 'Module Name',
          },
          {
            type: "text",
            name: "useCaseName",
            message: "Use Case Name"
          },
          {
            type: "text",
            name: "requestUrl",
            message: "Request Url"
          },
          {
            type: "text",
            name: "method",
            message: "Method: Get/Post/Put/Delete"
          },
          
        ]
      );
      const modulePath = path.resolve(currentPath, "api", "src", "modules", createUseCaseOptions.moduleName)

      createUseCase({
        modulePath,
        moduleName: createUseCaseOptions.moduleName,
        useCaseName: createUseCaseOptions.useCaseName,
        method: createUseCaseOptions.method,
        url: createUseCaseOptions.requestUrl
      })
    }
  })




// Zod schema simplificado para ApiEndpoint, todos os campos são strings

const EntitySchema = z.object({
  modelProps: z.array(z.object({
    key: z.string(),
    type: z.string(),
    optional: z.boolean()
  })),
  entityName: z.string(),
  findAllQueryKeysOptions: z.array(z.string())
});


const ExtraUseCaseSchema = z.object({
  entityName: z.string(),
  useCaseName: z.string(),
  useCaseFileString: z.string(),
  responseFileString: z.string(),
  requestFIleString: z.string(),
  controllerFileString: z.string(),
  setupControllerFIleString: z.string(),
  routeConfigFileString: z.string(),
  swaggerSchemaFileString: z.string()
});


const BuildProjectSchema = z.object({
  entities: z.array(EntitySchema),
  extraUseCases: z.array(ExtraUseCaseSchema)
});


const createProjectScaffold = async (data: {
  prompt: string
}): Promise<{
  models: {
    modelFileString: string,
    findAllQueryKeysOptions: string[]
  }[],
  extraUseCases: {
    moduleName: string,
    useCaseFileString: string,
    responseFileString: string,
    requestFIleString: string,
    swaggerPartsStirngFIle: string
  }[]
}> => {

  try {
    const instructions = `
### **Instruções para Modelagem e Especificação do Sistema**

Você é um agente responsável por modelar sistemas, criando as **entidades** e os **casos de uso** necessários para garantir que o sistema seja funcional. O sistema já tem as funcionalidades **CRUD** implementadas e, portanto, você não precisa criar casos de uso para **Create**, **Read**, **Update**, ou **Delete**. Sua tarefa é modelar as entidades, definir as propriedades e criar os casos de uso **extra**, além dos casos CRUD já definidos. O código deve ser escalável e bem estruturado.  

### **1. Especificação das Entidades (EntitySchema)**

As **entidades** devem ser definidas conforme o seguinte formato. Cada **entidade** precisa ter as suas **propriedades** e, se necessário, as **chaves** para filtragem nos repositórios.

**Formato Esperado (EntitySchema):**
\`\`\`typescript
const EntitySchema = z.object({
  modelProps: z.array(z.object({
    key: z.string(),
    type: z.string(),
    optional: z.boolean()
  })),
  entityName: z.string(),
  findAllQueryKeysOptions: z.array(z.string())
});
\`\`\`

**Exemplo de Entidade (User):**
\`\`\`typescript
const userSchema = {
  modelProps: [
    { key: "id", type: "string", optional: false },
    { key: "createdAt", type: "Date", optional: false },
    { key: "updatedAt", type: "Date", optional: false },
    { key: "email", type: "string", optional: false },
    { key: "roles", type: "string[]", optional: false },
    { key: "isActive", type: "boolean", optional: true }
  ],
  entityName: "user",
  findAllQueryKeysOptions: ["email", "isActive"]
};
\`\`\`

### **2. Definição dos Casos de Uso Adicionais (ExtraUseCaseSchema)**

Os **casos de uso adicionais** (que não envolvem operações CRUD) devem ser definidos. Estes casos de uso são essenciais para a lógica de negócio do sistema.

**Formato Esperado (ExtraUseCaseSchema):**
\`\`\`typescript
const ExtraUseCaseSchema = z.object({
  entityName: z.string(),
  useCaseName: z.string(),
  useCaseFileString: z.string(),
  responseFileString: z.string(),
  requestFIleString: z.string(),
  controllerFileString: z.string(),
  setupControllerFIleString: z.string(),
  routeConfigFileString: z.string(),
  swaggerSchemaFileString: z.string()
});
\`\`\`

**Exemplo de Caso de Uso Adicional (Fetch Users by Role):**
\`\`\`typescript
const fetchUsersByRoleUseCase = {
  entityName: "user",
  useCaseName: "fetch-users-by-role",
  useCaseFileString: \`
export class FetchUsersByRoleUseCase {
  private readonly userRepository: IUserRepository;

  constructor(data: { userRepository: IUserRepository }) {
    this.userRepository = data.userRepository;
  }

  async execute(input: { role: string }): Promise<IUser[]> {
    return await this.userRepository.findAll({
      limit: 100,
      offset: 0,
      filter: { roles: [input.role] }
    });
  }
}\`,
  responseFileString: \`
export interface FetchUsersByRoleResponse {
  users: IUser[];
}\`,
  requestFIleString: \`
export interface FetchUsersByRoleRequest {
  role: string;
}\`,
  controllerFileString: \`
import { Request, Response } from "express";
export class FetchUsersByRoleController {
  private readonly fetchUsersByRoleUseCase: FetchUsersByRoleUseCase;

  constructor(data: { fetchUsersByRoleUseCase: FetchUsersByRoleUseCase }) {
    this.fetchUsersByRoleUseCase = data.fetchUsersByRoleUseCase;
  }

  async handle(request: Request, response: Response): Promise<any> {
    try {
      const { role } = request.query;
      const result = await this.fetchUsersByRoleUseCase.execute({ role });
      return response.status(200).json(result);
    } catch (error: any) {
      return response.status(400).json({ message: error.message || "Unexpected error." });
    }
  }
}\`,
  setupControllerFIleString: \`
export const setupFetchUsersByRoleController = () => {
  const fetchUsersByRoleUseCase = new FetchUsersByRoleUseCase({
    userRepository: new UserRepository(),
  });
  const controller = new FetchUsersByRoleController({
    fetchUsersByRoleUseCase,
  });
  return { fetchUsersByRoleController: controller };
}\`,
  routeConfigFileString: \`
router.get("/fetch-users-by-role", (req: Request, res: Response) => {
  const { fetchUsersByRoleController } = setupFetchUsersByRoleController();
  fetchUsersByRoleController.handle(req, res);
});\`,
  swaggerSchemaFileString: \`
/**
 * @swagger
 * /fetch-users-by-role:
 *   get:
 *     summary: Fetch users by role
 *     parameters:
 *       - name: role
 *         in: query
 *         description: Role to filter users
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
\`
};
\`\`\`

### **3. Configuração Completa do Projeto (BuildProjectSchema)**

A configuração do **projeto completo** deve incluir todas as **entidades** e **casos de uso adicionais**.

**Formato Esperado (BuildProjectSchema):**
\`\`\`typescript
const BuildProjectSchema = z.object({
  entities: z.array(EntitySchema),
  extraUseCases: z.array(ExtraUseCaseSchema)
});
\`\`\`

**Exemplo de Configuração Completa do Projeto:**
\`\`\`typescript
const buildProject = {
  entities: [userSchema],
  extraUseCases: [fetchUsersByRoleUseCase]
};
\`\`\`

---

### **Regras e Convenções de Implementação**

- **Entidades:**  
  As entidades devem sempre incluir as propriedades da interface \`ICommon\`, como \`id\`, \`createdAt\`, e \`updatedAt\`.  
  - Nome da entidade deve ter a primeira letra em **minúscula** (e.g., \`user\`).
  - A propriedade \`findAllQueryKeysOptions\` deve incluir apenas atributos da entidade (e.g., \`email\`, \`isActive\`).
  
- **Casos de Uso:**  
  - O nome do **caso de uso** deve seguir o formato de **kebab-case** (e.g., \`fetch-users-by-role\`).
  - Não é necessário implementar **CRUD** (Create, Read, Update, Delete), pois essas funcionalidades já estão implementadas.
  - Cada **caso de uso** precisa de arquivos para o **use case**, **request**, **response**, **controller**, **setupController**, **configuração de rota**, e **swagger**.

- **Controller e Setup:**
  - Cada **controller** deve ter um arquivo de configuração de rota.
  - O **setupController** deve configurar os **repositórios** necessários e vincular os casos de uso.

- **Swagger:**  
  - O **Swagger** deve ser configurado para cada caso de uso, descrevendo a URL, os parâmetros e os formatos de resposta.

---

### **Conclusão**

A partir dessas instruções e exemplos, você terá todas as ferramentas para **modelar as entidades**, definir os **casos de uso adicionais** e gerar a configuração completa do projeto. **A arquitetura do sistema está pronta para ser implementada conforme as regras e os exemplos fornecidos.**
`;


    const client = new OpenAI({
      apiKey: ``
    });
    const chatCompletion = await client.chat.completions.create({
      response_format: zodResponseFormat(BuildProjectSchema, "BuildProjectSchema"),
      max_completion_tokens: 9000,
      messages: [
        {
          role: 'system', content: instructions
        },
        {
          role: 'user', content: data.prompt
        },
      ],
      model: 'gpt-4o',
    });





    const parsedResponse = JSON.parse(chatCompletion.choices[0].message.content ?? '')
    fs.writeFileSync('response.json', JSON.stringify(JSON.parse(chatCompletion.choices[0].message.content ?? '')))

    const currentPath = path.resolve(process.cwd(), "")


    for (let i = 0; i < parsedResponse.entities.length; i++) {
      const entity = parsedResponse.entities[i]
      const modulePath = path.resolve(currentPath, "api", "src", "modules", entity.entityName)

      createApiModule({
        projectPath: currentPath,
        moduleName: entity.entityName
      })

      editModel({
        moduleName: entity.entityName,
        path: path.resolve(currentPath, "api", "src", "modules"),
        props: entity.modelProps
      })
      buildApiModule({
        moduleName: entity.entityName,
        path: modulePath,
        findAllQueryKeysOptions: entity.findAllQueryKeysOptions
      })
    }

    for (let i = 0; i < parsedResponse.extraUseCases.length; i++) {
      const useCase = parsedResponse.extraUseCases[i]
      // createUseCase({
      //   moduleName: useCase.entityName,
      //   modulePath: path.resolve(currentPath, "api", "src", "modules"),
      //   requestFileStirng: useCase.requestFIleString,
      //   responseFIleString: useCase.responseFileString,
      //   useCaseFileString: useCase.useCaseFileString,
      //   useCaseName: useCase.useCaseName,
      //   controllerFileStirng: useCase.controllerFileString,
      //   setupControllerFIleString: useCase.setupControllerFIleString,
      //   routeConfigFileString: useCase.routeConfigFileString
      // })

    }

    const SwaggerJson = z.object({
      swaggerParts: z.string()
    })
    const swaggetIndex = path.resolve(currentPath, "api", "swagger.json")
    const swaggerAtual = fs.readFileSync(swaggetIndex).toString()
    const getSwaggerCOnfig = await client.chat.completions.create({
      response_format: zodResponseFormat(SwaggerJson, "SwaggerJson"),
      max_completion_tokens: 9000,
      messages: [
        {
          role: 'system', content: `
          você é um agente que atualiza o swagger sempre com base no Swagger atual
          nunca deve mudar os que ja existem apenas adicionar oque foi solicitado
          ${swaggerAtual}

          veja os conceitos da mensagem do usuario que atualize o swagger ja existente, lembrando que nao deve alterar os endpoints existentes
          leve em consideracao os conceitos do swagger em cada alemento

          deve retornar sempre um swagger novo inteiro, convervando os requests ja existentes
          voce vai retornar um swagger.json, certifique que nao esta quebrado
          fechar as {} tomar cuidado com strings etc

          vefifique se esta faltando } no final do arquivo
          `
        },
        {
          role: 'user', content: `${JSON.stringify(parsedResponse)}`
        },
      ],
      model: 'gpt-4o',
    });

    const FixedJson = z.object({
      fixedJson: z.string()
    })

    const parsedSwagger = JSON.parse(getSwaggerCOnfig.choices[0].message.content ?? '')


    const jsonFixed = await client.chat.completions.create({
      response_format: zodResponseFormat(FixedJson, "FixedJson"),
      max_completion_tokens: 9000,
      messages: [
        {
          role: 'system', content: `
          vocè é um fixer de json, concerta erros de formatacao {} faltando e tudo que for necessario para o json estar no formato correto
          retorna sempre o json concertado
          `
        },
        {
          role: 'user', content: `${JSON.stringify(parsedSwagger.swaggerParts)}`
        },
      ],
      model: 'gpt-4o',
    });
    const parsedFIxedJSON = JSON.parse(jsonFixed.choices[0].message.content ?? '')

    fs.writeFileSync(swaggetIndex, parsedFIxedJSON.fixedJson)

    processFiles()


    return {
      models: parsedResponse.models,
      extraUseCases: parsedResponse.extraUseCases
    }
  } catch (err) {
    throw err
  }

}


const editModel = (data: {
  path: string,
  moduleName: string
  props: {
    key: string,
    type: string,
    optional: boolean
  }[]
}) => {
  console.log(data.props)
  const basicModelName = `${data.moduleName[0].toUpperCase() + data.moduleName.slice(1, data.moduleName.length)}`

  const modelPath = path.resolve(data.path, data.moduleName, "models", `I${basicModelName}.ts`)
  let model = fs.readFileSync(modelPath).toString()
  const index = model.lastIndexOf('}');
  // Remove a última ocorrência de '}'
  model = model.substring(0, index) + model.substring(index + 1);

  for (let i = 0; i < data.props.length; i++) {
    const prop = data.props[i]
    if (prop.key !== 'createdAt' && prop.key !== "updatedAt" && prop.key !== "id")
      model += `\n ${prop.key}${prop.optional ? '?' : ''}: ${prop.type}`
  }

  model += "\n}"
  Request
  fs.writeFileSync(modelPath, model)
}

program.command('llm-tool')
  .description('Initiate a SerafProject')
  // .option('--first', 'display just the first substring')
  // .option('-s, --separator <char>', 'separator character', ',')
  // .argument('<moduleName>', 'moduleName')

  .action(async () => {

    const createOption = await prompts(
      {
        type: 'select',
        name: 'createOption',
        message: 'Prompt',
        choices: [
          { title: 'Create project Scaffold', value: 'prjScaffold' }
        ],
      }
    );

    if (createOption.createOption === 'prjScaffold') {
      const promptResponse = await prompts([
        {
          type: 'text',
          name: 'value',
          message: 'Prompt example create a library system',
        },
      ])
      const currentPath = path.resolve(process.cwd(), "")


      const file = fs.readFileSync(path.resolve(currentPath, promptResponse.value))
      createProjectScaffold({
        prompt: file.toString()
      })
    }
  })

program.parse();