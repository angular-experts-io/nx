import { Tree } from '@nrwl/devkit';
import * as inquirer from 'inquirer';

export const CONFIG_FILE_NAME = '.ax.config.json';

interface ConfigFile {
  contexts?: string[];
}

export async function createConfigFileIfNonExisting(tree: Tree) {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const configFile: ConfigFile = configurationFileBuffer
    ? JSON.parse(configurationFileBuffer.toString())
    : null;

  if (!configFile) {
    console.log(
      `No configuraiton file found. Don't worry, we will create one for you.`
    );
  }

  if (!configFile || !configFile.contexts) {
    const contexts = await inquirer.prompt({
      name: 'availableContexts',
      message:
        'Please enter all contexts (comma separated) you want to use in your project.',
    });
    console.log('Contexts', contexts);
    tree.write(
      CONFIG_FILE_NAME,
      JSON.stringify({ contexts: contexts.availableContexts.split(',') })
    );
  }
}

export async function getContexts(tree: Tree) {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  return JSON.parse(configurationFileBuffer.toString()).contexts;
}

export async function getConfiguration(tree: Tree) {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  return JSON.parse(configurationFileBuffer.toString());
}
