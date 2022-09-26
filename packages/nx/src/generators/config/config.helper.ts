import * as inquirer from 'inquirer';
import {Tree} from "@nrwl/devkit";

export const CONFIG_FILE_NAME = '.ax.config.json';

interface ConfigFile {
  contexts?: string[];
  prefix?: string;
  appSuffix?: string;
}

const DEFAULT_CONFIG_OPTIONS: ConfigFile = {
  contexts: ['sales', 'supply', 'production'],
  prefix: 'my-app',
  appSuffix: 'app'
}


export async function createConfigFileIfNonExisting(tree: Tree): Promise<void> {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const configFile: ConfigFile = configurationFileBuffer
    ? JSON.parse(configurationFileBuffer.toString())
    : null;

  if(configFile?.contexts?.length > 0 && configFile.prefix && configFile.appSuffix) {
    return;
  }

  if (!configFile) {
    console.log(
      `No configuraiton file found. Don't worry, we will create one for you.`
    );
  }

  let contexts;
  let prefix;
  let appSuffix;

  if (!configFile?.contexts) {
    contexts = await inquirer.prompt({
      name: 'availableContexts',
      message:
        `Please enter all contexts (comma separated) you want to use in your project.
        (default: ${DEFAULT_CONFIG_OPTIONS.contexts.join(', ')})`,
    });
  }


  if (!configFile?.prefix) {
    prefix = await inquirer.prompt({
      name: 'companyPrefix',
      message:
        `Please enter your company prefix or company name. (default: ${DEFAULT_CONFIG_OPTIONS.prefix})`,
    });
  }

  if (!configFile?.appSuffix) {
    appSuffix = await inquirer.prompt({
      name: 'suffix',
      message:
        `Please enter a suffix for generated applications. (default: ${DEFAULT_CONFIG_OPTIONS.appSuffix})`,
    });
  }

  tree.write(
    CONFIG_FILE_NAME,
    JSON.stringify({
    contexts: contexts.availableContexts ? contexts.availableContexts.split(',') : DEFAULT_CONFIG_OPTIONS.contexts,
      prefix: prefix.companyPrefix || DEFAULT_CONFIG_OPTIONS.prefix,
      appSuffix: appSuffix.suffix || DEFAULT_CONFIG_OPTIONS.appSuffix
    })
  );
}

export function getPrefix(tree: Tree): string | undefined {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const prefixFromConfigFile = JSON.parse(configurationFileBuffer.toString()).prefix;
  if (!prefixFromConfigFile) {
    printWarningMessageForMissingConfigProperty('prefix', DEFAULT_CONFIG_OPTIONS.prefix);
  }
  return prefixFromConfigFile || DEFAULT_CONFIG_OPTIONS.prefix;
}

export function getContexts(tree: Tree): string[] | undefined {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const contextFromConfigFile = JSON.parse(configurationFileBuffer.toString()).contexts;
  if (!contextFromConfigFile) {
    printWarningMessageForMissingConfigProperty('contexts', `[${DEFAULT_CONFIG_OPTIONS.contexts.join(', ')}]`);
  }
  return contextFromConfigFile || DEFAULT_CONFIG_OPTIONS.contexts;
}

export function getAppSuffix(tree: Tree): string | undefined {
  const configurationFileBuffer = tree.read(CONFIG_FILE_NAME);
  const appSuffixFromConfigFile = JSON.parse(configurationFileBuffer.toString()).appSuffix;
  if (!appSuffixFromConfigFile) {
    printWarningMessageForMissingConfigProperty('appSuffix', DEFAULT_CONFIG_OPTIONS.appSuffix);
  }
  return appSuffixFromConfigFile || DEFAULT_CONFIG_OPTIONS.appSuffix;
}

function printWarningMessageForMissingConfigProperty(propertyName: string, defaultValue: string) {
  console.warn(`No value for ${propertyName} was found in ${CONFIG_FILE_NAME}.
    Using default ${propertyName}: ${defaultValue},
    feel free to adjust the ${propertyName} property it in ${CONFIG_FILE_NAME}.`);
}
