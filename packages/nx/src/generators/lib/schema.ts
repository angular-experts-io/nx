import { LibraryType } from '../model/library-type';
import { ScopeType } from '../model/scope-type';

export interface LibGeneratorOptions {
  prefix?: string;
  name?: string;
  context?: string;
  scopeType?: ScopeType;
  scopeAppSpecific?: string;
  type?: LibraryType;
}
