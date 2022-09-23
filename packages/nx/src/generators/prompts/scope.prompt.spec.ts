import {createTreeWithEmptyWorkspace} from "@nrwl/devkit/testing";
import * as inquirer from 'inquirer';
import {Tree} from "@nrwl/devkit";

import * as scopeTypes from '../model/scope-type';
import {ScopeType} from "../model/scope-type";

import scopePrompt from "./scope.prompt";

describe('Scope prompt', () => {

  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  it('should call inquirer with the correct parameters', async () => {
    const message = 'Choose a scope';
    const expectedScope = 'foo';
    const scopes = [{
      name: 'App specific (limited to single app)',
      value: ScopeType.APP_SPECIFIC,
    },
      {
        name: `Shared context`,
        value: ScopeType.SHARED,
      }];

    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      selectedScope: expectedScope
    }));
    jest.spyOn(scopeTypes, 'getAvailableScopeTypes').mockReturnValue(scopes);

    const selectedScope = await scopePrompt(tree, message, 'shared');

    expect(selectedScope).toBe(expectedScope);
    expect(inquirer.prompt).toHaveBeenCalledWith({
      type: 'list',
      name: 'selectedScope',
      message,
      choices: scopes,
    });
  });
});
