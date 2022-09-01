import * as inquirer from 'inquirer';
import {Tree} from "@nrwl/devkit";

export const CONFIG_FILE_NAME = '.ax.config.json';

interface ConfigFile {
  contexts?: string[];
  prefix?: string;
}

export async function createConfigFileIfNonExisting(tree: Tree): Promise<void> {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const configFile: ConfigFile = configurationFileBuffer
    ? JSON.parse(configurationFileBuffer.toString())
    : null;

  if (!configFile) {
    console.log(
      `No configuraiton file found. Don't worry, we will create one for you.`
    );
  }

  let contexts;
  let prefix;

  if (!configFile?.contexts) {
    contexts = await inquirer.prompt({
      name: 'availableContexts',
      message:
        'Please enter all contexts (comma separated) you want to use in your project.',
    });
  }


  if (!configFile?.prefix) {
    prefix = await inquirer.prompt({
      name: 'companyPrefix',
      message:
        'Please enter your company prefix or company name',
    });
  }

  tree.write(
    CONFIG_FILE_NAME,
    JSON.stringify({
      contexts: contexts.availableContexts.split(','),
      prefix: prefix.companyName
    })
  );
}

export async function getPrefix(tree: Tree): Promise<string | undefined> {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  return JSON.parse(configurationFileBuffer.toString()).prefix;
}

export async function getContexts(tree: Tree) {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  return JSON.parse(configurationFileBuffer.toString()).contexts;
}

export async function getConfiguration(tree: Tree) {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  return JSON.parse(configurationFileBuffer.toString());
}

