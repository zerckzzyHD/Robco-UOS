/** Optional owner-configured, development-only lifecycle extension.
 * No module path or machine options are shipped. An absent local file is a no-op.
 * Configured code runs with the same trust as this owner's development config.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function load({
  command,
  root = path.join(__dirname, '..'),
  readFile = fs.readFileSync,
  stat = fs.statSync,
  importModule = url => import(url),
} = {}) {
  if (command !== 'serve') return null;
  let text;
  try {
    text = readFile(path.join(root, '.dev-companion.local.json'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error('Local companion settings could not be read.', { cause: error });
  }
  try {
    const config = JSON.parse(text);
    if (
      !config ||
      typeof config.module !== 'string' ||
      !path.isAbsolute(config.module) ||
      !stat(config.module).isFile() ||
      (config.options !== undefined &&
        (!config.options || typeof config.options !== 'object' || Array.isArray(config.options)))
    )
      throw new Error();
    const loaded = await importModule(pathToFileURL(config.module).href);
    if (typeof loaded.default !== 'function') throw new Error();
    const plugin = await loaded.default(config.options || {});
    if (!plugin || typeof plugin.name !== 'string' || typeof plugin.configureServer !== 'function')
      throw new Error();
    return { ...plugin, apply: 'serve' };
  } catch {
    throw new Error('Configured local companion is invalid or unavailable.');
  }
}
function bridge(command) {
  if (command !== 'serve') return null;
  let active = null;
  return {
    name: 'owner-local-development-companion',
    apply: 'serve',
    async configureServer(server) {
      active = await load({ command: 'serve' });
      if (active) return active.configureServer(server);
    },
    closeBundle() {
      if (active && typeof active.closeBundle === 'function') return active.closeBundle();
    },
  };
}
module.exports = { load, bridge };
