import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {readJson, Tree, updateJson} from '@nrwl/devkit';

import generateWorkspaceApp from "../app/generator";
import * as configHelper from "../config/config.helper";
import validateModuleBoundaries from "./generator";

const mockContexts = ['foo', 'bar', 'baz'];
const mockPrefix = 'my-awesome-prefix';
const mockAppSuffix = 'app';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => mockContexts);

jest
  .spyOn(configHelper, 'getPrefix')
  .mockImplementation(() => mockPrefix);

jest
  .spyOn(configHelper, 'getAppSuffix')
  .mockImplementation(() => mockAppSuffix);

describe('module-boundaries-validate generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  it('should not throw an error the project tags are correct', async () => {
    const context = 'foo';
    const name = 'my-app';
    const schema = {context, name};

    await generateWorkspaceApp(appTree, schema);
    appTree.write('angular.json', JSON.stringify(readJson(appTree, 'workspace.json')));

    await expect(
      async () => (await validateModuleBoundaries(appTree, {}))()
    ).not.toThrow('Module boundaries validation failed');
  });


  it('should throw an error if the context is missing in the project tags', async () => {
    const context = 'foo';
    const name = 'my-app';
    const path = `apps/${context}/${name}`;
    const schema = {context, name};
    const wrongTags = ['type:app'];

    await generateWorkspaceApp(appTree, schema);
    appTree.write('angular.json', JSON.stringify(readJson(appTree, 'workspace.json')));

    updateJson(appTree, `${path}/project.json`, projectJson => {
      projectJson.tags = wrongTags;
      return projectJson;
    });

    await expect(
      async () => (await validateModuleBoundaries(appTree, {}))()
    ).rejects.toThrow('Module boundaries validation failed');
  });
});
