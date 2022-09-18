import * as nrwlWorkspaceGenerators from '@nrwl/workspace/generators';
import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import * as inquirer from 'inquirer';
import {Tree} from '@nrwl/devkit';

import * as projectPrompts from '../prompts/project.prompt';
import * as typePrompts from '../prompts/type.prompt';
import * as scopePrompts from '../prompts/scope.prompt';
import * as contextPrompts from '../prompts/context.prompt';
import * as configHelper from '../config/config.helper';
import {LibraryType} from "../model/library-type";
import generateWorkspaceApp from "../app/generator";
import {ScopeType} from "../model/scope-type";
import * as applicationPrompts from "../prompts/application.prompt";
import * as generatorUtils from "../utils/generators-angular";

import move from './generator';

const mockContexts = ['foo', 'bar', 'baz'];
const mockPrefix = 'my-awesome-prefix';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => Promise.resolve(mockContexts));

jest
  .spyOn(configHelper, 'getPrefix')
  .mockImplementation(() => Promise.resolve(mockPrefix));

describe('move generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  it('should call the project prompt if no projectName was provided', async () => {
    const prefix = 'prefix';
    const context = 'domain-a';
    const appName = 'test-app';

    jest
      .spyOn(applicationPrompts, 'applicationPrompt')
      .mockReturnValue(Promise.resolve(appName));
    jest.spyOn(generatorUtils, 'angularComponentGenerator');
    jest
      .spyOn(configHelper, 'getPrefix')
      .mockReturnValue(Promise.resolve(prefix));

    jest.spyOn(contextPrompts, 'contextPrompt')
      .mockImplementation(() => Promise.resolve(context));

    jest.spyOn(projectPrompts, 'projectPrompt')
      .mockImplementation(() => Promise.resolve(`${context}-${appName}`));

    jest.spyOn(scopePrompts, 'default')
      .mockImplementation(() => Promise.resolve(ScopeType.SHARED));

    jest.spyOn(typePrompts, 'default')
      .mockImplementation(() => Promise.resolve(LibraryType.MODEL));

    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      yes: true
    }));

    jest.spyOn(nrwlWorkspaceGenerators, 'moveGenerator');

    await generateWorkspaceApp(tree, {context, name: appName});

    // TODO: this is a workaround - cna we asume that we always have an Angular.json? or is it a workspace.json?
    tree.write(
      './angular.json',
      JSON.stringify({
        "$schema": "./node_modules/nx/schemas/workspace-schema.json",
        version: 2,
        projects: {
          [`${context}-${appName}`]: `apps/${context}/${appName}`
        }
      })
    );

    await move(tree, {});

    expect(projectPrompts.projectPrompt).toHaveBeenCalledWith(tree);
  });


});
