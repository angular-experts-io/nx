import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';


describe('module-boundaries-update generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  describe('Get grouped tags', () => {
    it('should work', () => {
      const depConstraints = [
        {
          sourceTag: 'scope:test',
          onlyDependOnLibsWithTags: [
            'scope:public',
            'scope:shared',
            'scope:test',
          ],
        },
        {
          sourceTag: 'context:foo',
          onlyDependOnLibsWithTags: ['context:foo', 'scope:public'],
        },
        {
          sourceTag: '*',
          onlyDependOnLibsWithTags: ['*'],
        },
      ];

      // TODO implement this test

      expect(true).toBe(true);
    });
  });
});
