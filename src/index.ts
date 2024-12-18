#! /usr/bin/env node

import { Command } from 'commander'
import path from 'path'
import figlet from 'figlet'
import prompts from 'prompts'
import { initSerafProject } from './initSerafProject';
import { createApiModule } from './createApiModule';
import { buildApiModule } from './buildApiModule';

console.log(figlet.textSync("Seraf"));

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
program.command('module')
  .description('Initiate a SerafProject')
  // .option('--first', 'display just the first substring')
  // .option('-s, --separator <char>', 'separator character', ',')
  // .argument('<moduleName>', 'moduleName')

  .action(async () => {

    const createOption = await prompts(
      {
        type: 'select',
        name: 'createOption',
        message: 'Pick colors',
        choices: [
          { title: 'Create', value: 'create' },
          { title: 'Build', value: 'build' },
        ],
      }
    );

    const currentPath = path.resolve(process.cwd(), "")
    if (createOption.createOption === 'create') {
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
    } else if (createOption.createOption === 'build') {
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
    }
  })

program.parse();