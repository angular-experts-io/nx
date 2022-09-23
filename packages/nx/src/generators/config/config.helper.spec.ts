import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {readJson, Tree} from '@nrwl/devkit';

import * as inquirer from 'inquirer';

import {createConfigFileIfNonExisting, getContexts, getPrefix} from './config.helper';
import {CONFIG_FILE_NAME} from './config.helper';

describe('Config helper', () => {
  let tree: Tree;

  beforeEach(() => {
    inquirer.prompt = jest.fn();
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create a new AX file with the context and the prefix if no config file exists yet', async () => {
    const expectedContexts = ['foo', 'bar', 'baz'];
    const expectedPrefix = 'my-awesome-company';

    inquirer.prompt.mockImplementation((config) => {
      if (config.name === 'availableContexts') {
        return Promise.resolve({
          availableContexts: expectedContexts.join(','),
        });
      }

      if (config.name === 'companyPrefix') {
        return Promise.resolve({
          companyPrefix: expectedPrefix,
        });
      }
    });

    await createConfigFileIfNonExisting(tree);

    const configFile = readJson(tree, CONFIG_FILE_NAME);
    expect(expectedContexts).toEqual(configFile.contexts);
    expect(expectedPrefix).toEqual(configFile.prefix);
  });

  describe('Getters', () => {

    it('should read the config file and return the prefix', async () => {
      const expectedPrefix = 'my-awesome-prefix';
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              prefix: expectedPrefix,
            })
          )
        ),
      } as unknown as Tree;

      const prefix = await getPrefix(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(prefix).toBe(expectedPrefix);
    });

    it('should read the config file and return the contexts', async () => {
      const expectedContexts = ['foo', 'bar'];
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              contexts: expectedContexts,
            })
          )
        ),
      } as unknown as Tree;

      const prefix = await getContexts(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(prefix).toEqual(expectedContexts);
    });

    it('should read the config file and return the contexts', async () => {
      const expectedContexts = ['foo', 'bar'];
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              contexts: expectedContexts,
            })
          )
        ),
      } as unknown as Tree;

      const prefix = await getContexts(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(prefix).toEqual(expectedContexts);
    });

  });
});
