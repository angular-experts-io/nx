import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {readJson, Tree} from '@nrwl/devkit';

import * as inquirer from 'inquirer';

import {createConfigFileIfNonExisting, getAppSuffix, getContexts, getPrefix} from './config.helper';
import {CONFIG_FILE_NAME} from './config.helper';

describe('Config helper', () => {
  let tree: Tree;

  beforeEach(() => {
    inquirer.prompt = jest.fn();
    tree = createTreeWithEmptyWorkspace();
  });

  it('should create a new AX file with default values if no values are provided', async () => {
    inquirer.prompt.mockImplementation(() => Promise.resolve({}));

    await createConfigFileIfNonExisting(tree);

    const configFile = readJson(tree, CONFIG_FILE_NAME);
    expect(['sales', 'supply', 'production']).toEqual(configFile.contexts);
    expect('my-app').toEqual(configFile.prefix);
    expect('app').toEqual(configFile.appSuffix);
  });

  it('should create a new AX file with contexts, prefix and appSuffix if no config file exists yet', async () => {
    const expectedContexts = ['foo', 'bar', 'baz'];
    const expectedPrefix = 'my-awesome-company';
    const expectedAppSuffix = 'app';

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

      if (config.name === 'suffix') {
        return Promise.resolve({
          suffix: expectedAppSuffix,
        });
      }
    });

    await createConfigFileIfNonExisting(tree);

    const configFile = readJson(tree, CONFIG_FILE_NAME);
    expect(expectedContexts).toEqual(configFile.contexts);
    expect(expectedPrefix).toEqual(configFile.prefix);
    expect(expectedAppSuffix).toEqual(configFile.appSuffix);
  });

  describe('Getters', () => {

    it('should read the config file, return the prefix and not print a warning', async () => {
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
      jest.spyOn(console, 'warn');

      const prefix = getPrefix(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(prefix).toBe(expectedPrefix);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should read the config file, return the contexts and not print a warning', async () => {
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
      jest.spyOn(console, 'warn');

      const contexts = getContexts(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(contexts).toEqual(expectedContexts);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should read the config file, return the appSuffix and not print a warning', async () => {
      const expectedAppSuffix = 'my-app';
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              appSuffix: expectedAppSuffix,
            })
          )
        ),
      } as unknown as Tree;
      jest.spyOn(console, 'warn');

      const appSuffix = getAppSuffix(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(appSuffix).toEqual(expectedAppSuffix);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should read the config file, return the default prefix and print a warning', async () => {
      const expectedPrefix = 'my-app';
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              prefix: undefined,
            })
          )
        ),
      } as unknown as Tree;
      jest.spyOn(console, 'warn');

      const prefix = getPrefix(mockTree);
      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(prefix).toBe(expectedPrefix);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should read the config file, return the default contexts and print a warning', async () => {
      const expectedContexts = ['sales', 'supply', 'production'];
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              contexts: undefined,
            })
          )
        ),
      } as unknown as Tree;
      jest.spyOn(console, 'warn');

      const contexts = getContexts(mockTree);

      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(contexts).toEqual(expectedContexts);
      expect(console.warn).toHaveBeenCalled();
    });

    it('should read the config file, return the default appSuffix and print a warning', async () => {
      const expectedAppSuffix = 'app';
      const mockTree = {
        read: jest.fn().mockReturnValue(
          Buffer.from(
            JSON.stringify({
              appSuffix: undefined,
            })
          )
        ),
      } as unknown as Tree;
      jest.spyOn(console, 'warn');

      const appSuffix = getAppSuffix(mockTree);

      expect(mockTree.read).toHaveBeenCalledWith(CONFIG_FILE_NAME);
      expect(appSuffix).toEqual(expectedAppSuffix);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
