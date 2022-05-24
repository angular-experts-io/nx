import * as inquirer from 'inquirer';
import { Tree } from '@nrwl/devkit';

import { getContexts } from '../utils/context.util';

export async function contextPrompt(
  tree: Tree,
  message: string
): Promise<string> {
  const contextList = await inquirer.prompt({
    type: 'list',
    name: 'selectedContext',
    message,
    choices: getContexts(tree),
  });
  return contextList.selectedContext;
}
