import { defaultConfig, Visibility } from '@forge-ts/core';

const config = defaultConfig('.');

config.tsconfig = 'tsconfig.json';
config.outDir = 'docs';
config.enforce.minVisibility = Visibility.Public;
config.enforce.strict = false;
config.gen.formats = ['mdx'];
config.gen.llmsTxt = true;
config.gen.readmeSync = false;
config.gen.ssgTarget = 'mintlify';

export default config;
