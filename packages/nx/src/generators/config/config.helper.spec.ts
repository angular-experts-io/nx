import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree } from '@nrwl/devkit';
import * as inquirer from 'inquirer';

import {createConfigFileIfNonExisting} from "./config.helper";

import {
  CONFIG_FILE_NAME,
} from './config.helper';

describe('foo generator', () => {
  let tree: Tree;

  beforeEach(() => {
    inquirer.prompt = jest.fn();
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create a new AX file with the scopes if no file exists', async () => {
    const expectedContexts = ['foo', 'bar', 'baz'];
    inquirer.prompt.mockReturnValueOnce(
      Promise.resolve({
        availableContexts: expectedContexts.join(','),
      })
    );

    await createConfigFileIfNonExisting(tree);

    const configFile = tree.read(CONFIG_FILE_NAME);
    const contextsFromFile = JSON.parse(configFile.toString()).contexts;
    expect(expectedContexts).toEqual(contextsFromFile);
  });
});

