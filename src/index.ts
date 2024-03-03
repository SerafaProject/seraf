#! /usr/bin/env node

import { Command } from 'commander'
import path from 'path'
import figlet from 'figlet'
import prompts from 'prompts'
import { initSerafProject } from './initSerafProject';


console.log(figlet.textSync("Seraf"));

const program = new Command();

program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0');

program.command('init')
  .description('Initiate a SerafProject')
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action(async (argument, options) => {
    const projectName = await prompts({
      type: 'text',
      name: 'value',
      message: 'Project Name  ',
    });

    initSerafProject({
      config: {
        api: 'express',
        db: 'mongodb',
        projectName: projectName.value,
        path: path.resolve(process.cwd(), "")
      }
    })
    
    console.log(projectName.value)
  });

program.parse();