import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {Tree, readJson} from '@nrwl/devkit';

import * as configHelper from '../config/config.helper';

import generateWorkspaceApp, {updatePackageJSONScripts} from "./generator";

jest.spyOn(configHelper, 'createConfigFileIfNonExisting').mockImplementation(() => Promise.resolve());
jest.spyOn(configHelper, 'getContexts').mockImplementation(() => Promise.resolve());

describe('app generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  describe('Config', () => {

    it('should should check if a config file exists or not', async () => {
      const schema = {
        context: 'context',
        name: 'name',
        prefix: 'prefix'
      }
      await generateWorkspaceApp(appTree, schema);
      expect(configHelper.createConfigFileIfNonExisting).toHaveBeenCalled();
    });

  });

  describe('Update package.json scripts', () => {
    it('should add serve script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`serve:${context}-${name}:app`]).toEqual(
        `nx serve --project ${projectName} -o`
      );
    });

    it('should add build script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`build:${context}-${name}`]).toEqual(
        `nx build --project ${projectName}`
      );
    });

    it('should add an analyze script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`analyze:${context}-${name}`]).toEqual(
        `nx build --project ${projectName} --stats-json && webpack-bundle-analyzer dist/apps/${context}/${name}/stats.json`
      );
    });

    it('should add a lint script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`lint:${context}-${name}`]).toEqual(
        `nx lint --project ${projectName} && nx stylelint --project ${projectName} --fix`
      );
    });

    it('should add a test script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`test:${context}-${name}`]).toEqual(
        `nx test --project ${projectName}`
      );
    });

    it('should add a e2e script', async () => {
      const name = 'awesomeApp';
      const context = 'awesomeContext';
      const projectName = `${context}-${name}`;

      await updatePackageJSONScripts(appTree, context, name);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`e2e:${context}-${name}`]).toEqual(
        `nx e2e --project ${projectName}-e2e`
      );
    });
  });

  describe('Nrwl generators', () => {

    it('should call the applicationGenerator', async () => {
      await generateWorkspaceApp(appTree, {});
      expect(true).toBeTruthy();
    });
  });
});
