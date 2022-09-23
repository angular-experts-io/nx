import {createTreeWithEmptyWorkspace} from "@nrwl/devkit/testing";
import * as inquirer from 'inquirer';
import {Tree} from "@nrwl/devkit";

import {AVAILABLE_LIBRARY_TYPES, LibraryType} from "../model/library-type";

import typePrompt from "./type.prompt";

describe('Type prompt', () => {

  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  it('should call inquirer with the correct parameters', async () => {
    const message = 'Choose a scope';
    const expectedType = LibraryType.PATTERN;

    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      selectedType: expectedType
    }));

    const selectedType = await typePrompt(tree, message);

    expect(selectedType).toBe(expectedType);
    expect(inquirer.prompt).toHaveBeenCalledWith({
      type: 'list',
      name: 'selectedType',
      message,
      choices: AVAILABLE_LIBRARY_TYPES,
    });
  });
});
