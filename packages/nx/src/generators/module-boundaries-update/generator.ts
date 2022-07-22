import { Tree, readJson, updateJson } from '@nrwl/devkit';

import { ModuleBoundariesUpdateGeneratorOptions } from './schema';

const ENFORCE_MODULE_BOUNDARIES = '@nrwl/nx/enforce-module-boundaries';

export default async function updateModuleBoundaries(
  tree: Tree,
  schema: ModuleBoundariesUpdateGeneratorOptions
) {
  const json = await readJson(tree, '.eslintrc.json');

  const groupedTags = getGroupedTags(getDepConstraints(json));
  if (schema.context && !groupedTags?.context?.includes(schema.context)) {
    await updateJson(tree, '.eslintrc.json', (json) => {
      getDepConstraints(json).unshift({
        sourceTag: `context:${schema.context}`,
        onlyDependOnLibsWithTags: [`context:${schema.context}`, 'scope:public'],
      });
      return json;
    });
  }
  if (
    schema.scope &&
    !['public', 'shared'].includes(schema.scope) &&
    !groupedTags?.scope?.includes(schema.scope)
  ) {
    await updateJson(tree, '.eslintrc.json', (json) => {
      getDepConstraints(json).unshift({
        sourceTag: `scope:${schema.scope}`,
        onlyDependOnLibsWithTags: [
          'scope:public',
          'scope:shared',
          `scope:${schema.scope}`,
        ],
      });
      return json;
    });
  }
}

function getGroupedTags(constraints: any): any {
  return Array.from(
    new Set(
      constraints.flatMap((c) => [
        c.sourceTag,
        ...(c.onlyDependOnLibsWithTags ?? []),
      ])
    )
  ).reduce(
    (groupedByCategory, next: string) => {
      const [category, name] = next.split(':');
      groupedByCategory[category] = groupedByCategory[category] ?? [];
      if (!groupedByCategory[category].includes(name)) {
        groupedByCategory[category].push(name);
      }
      return groupedByCategory;
    },
    { context: [], scope: [], type: [] }
  );
}

function getDepConstraints(json: any) {
  return json?.overrides.find((o) => o?.rules?.[ENFORCE_MODULE_BOUNDARIES])
    ?.rules?.[ENFORCE_MODULE_BOUNDARIES]?.[1]?.depConstraints;
}
