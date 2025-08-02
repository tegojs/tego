import { defineCollection } from '@tachybase/database';

export default defineCollection({
  name: 'applicationPlugins',
  dumpRules: 'required',
  repository: 'PluginManagerRepository',
  origin: '@tego/core',
  fields: [
    { type: 'string', name: 'name', unique: true },
    { type: 'string', name: 'packageName', unique: true },
    { type: 'string', name: 'version' },
    { type: 'boolean', name: 'enabled' },
    { type: 'boolean', name: 'installed' },
    { type: 'boolean', name: 'builtIn' },
    { type: 'json', name: 'options' },
    { type: 'boolean', name: 'subView', defaultValue: true },
  ],
});
