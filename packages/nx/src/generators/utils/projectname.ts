import { ProjectTypes } from '../model/project-types';

export function extractName(
  projectName: string,
  applicationType: ProjectTypes
) {
  return applicationType === ProjectTypes.APP
    ? getNameSubstring(projectName, 1)
    : getNameSubstring(projectName, 3);
}

function getNameSubstring(projectName: string, index: number) {
  return projectName.substring(
    projectName.split('-', index).join('-').length + 1
  );
}
