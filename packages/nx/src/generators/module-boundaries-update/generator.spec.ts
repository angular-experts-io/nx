import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {Tree, readJson} from '@nrwl/devkit';

import generateWorkspaceApp from "../app/generator";
import * as configHelper from "../config/config.helper";
import * as applicationPrompts from "../prompts/application.prompt";

import updateModuleBoundaries from "./generator";

const mockAppSuffix = 'app';
const mockPrefix = 'my-company';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(configHelper, 'getPrefix')
  .mockImplementation(() =>mockPrefix);

jest
  .spyOn(configHelper, 'getAppSuffix')
  .mockImplementation(() => mockAppSuffix);

const ENFORCE_MODULE_BOUNDARIES = '@nrwl/nx/enforce-module-boundaries';

describe('module-boundaries-update', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  it('should add new context', async () => {
    const context = 'foo';
    const appName = 'visualizer';
    const schema = {
      context
    };
    const expectedDependOnLibsTags = [`context:${context}`, 'scope:public'];
    const expectedConstraint = {
      sourceTag: `context:${context}`,
      onlyDependOnLibsWithTags: expectedDependOnLibsTags,
    }

    jest
      .spyOn(applicationPrompts, 'applicationPrompt')
      .mockReturnValue(Promise.resolve(appName));

    await generateWorkspaceApp(appTree, {context, name: appName});
    await updateModuleBoundaries(appTree, schema);

    const eslintJson = readJson(appTree, '.eslintrc.json');
    const depConstraints = eslintJson.overrides[0].rules[ENFORCE_MODULE_BOUNDARIES][1].depConstraints;

    const addedDepConstraint = depConstraints.find((c) => c.sourceTag === expectedConstraint.sourceTag);
    expect(addedDepConstraint.onlyDependOnLibsWithTags).toEqual(expectedDependOnLibsTags);
  });

  it('should add new scope', async () => {
    const context = 'foo';
    const scope = 'brand-new-scope';
    const appName = 'visualizer';
    const schema = {
      scope
    };
    const expectedDependOnLibsTags = [
      'scope:public',
      'scope:shared',
      `scope:${scope}`,
    ];
    const expectedConstraint = {
      sourceTag: `scope:${scope}`,
      onlyDependOnLibsWithTags: expectedDependOnLibsTags,
    }

    jest
      .spyOn(applicationPrompts, 'applicationPrompt')
      .mockReturnValue(Promise.resolve(appName));

    await generateWorkspaceApp(appTree, {context, name: appName});
    await updateModuleBoundaries(appTree, schema);

    const eslintJson = readJson(appTree, '.eslintrc.json');
    const depConstraints = eslintJson.overrides[0].rules[ENFORCE_MODULE_BOUNDARIES][1].depConstraints;

    const addedDepConstraint = depConstraints.find((c) => c.sourceTag === expectedConstraint.sourceTag);
    expect(addedDepConstraint.onlyDependOnLibsWithTags).toEqual(expectedDependOnLibsTags);
  });
});
