import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readJson } from '@nrwl/devkit';

import { updatePackageJSONScripts } from './generator';

describe('app generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
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
  });
});
