import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { build } from 'esbuild'

// 插件标识必须与 package.json 的包名一致，模块加载器据此关联浏览器产物。
const PLUGIN_ID = 'dsh-emotion-pet'
// 所有构建产物集中写入 lib，便于 Harness 安装和 npm 打包。
const OUTPUT_DIR = resolve('lib')

const cssPlugin = {
  name: 'emotion-pet-css',
  setup(buildApi) {
    buildApi.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const css = await readFile(path, 'utf8')
      const tagId = `${PLUGIN_ID}/${basename(path)}`
      return {
        loader: 'js',
        contents: [
          `const css = ${JSON.stringify(css)};`,
          `const tagId = ${JSON.stringify(tagId)};`,
          "if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {",
          "  const tag = document.createElement('style');",
          `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
          '  tag.dataset.pluginCss = tagId;',
          '  tag.textContent = css;',
          '  document.head.appendChild(tag);',
          '}',
          'export default css;',
        ].join('\n'),
      }
    })
  },
}

await mkdir(OUTPUT_DIR, { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  legalComments: 'inline',
})

const clientBuild = await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  legalComments: 'inline',
  plugins: [cssPlugin],
})

const bundledClient = clientBuild.outputFiles[0]
if (bundledClient === undefined) throw new Error('浏览器插件构建未生成 JavaScript 产物')

const wrappedClient = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(PLUGIN_ID)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${bundledClient.text.split('\n').map(line => line === '' ? '' : `    ${line}`).join('\n')}
    return module.exports;
  }
});
`

await writeFile(resolve(OUTPUT_DIR, 'client.js'), wrappedClient, 'utf8')
