const fsp = require('fs').promises
const fs = require('fs')
const camelcase = require('camelcase')
const { promisify } = require('util')
const rimraf = promisify(require('rimraf'))
const svgr = require('@svgr/core').default
const babel = require('@babel/core')
const { compile: compileVue } = require('@vue/compiler-dom')
const { dirname } = require('path')
const path = require('path')

let transform = {
  react: async (svg, componentName, format) => {
    let component = await svgr(svg, { ref: true }, { componentName })
    let { code } = await babel.transformAsync(component, {
      plugins: [[require('@babel/plugin-transform-react-jsx'), { useBuiltIns: true }]],
    })

    if (format === 'esm') {
      return code
    }

    return code
      .replace('import * as React from "react"', 'const React = require("react")')
      .replace('export default', 'module.exports =')
  }
}

function getAllFiles(dirPath, arrayyOfFiles) {
  let files = fs.readdirSync(dirPath)
  var arrayOfFiles = arrayOfFiles || []

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
      //console.log(file)
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file))
      //console.log(arrayOfFiles)
    }
  })

  return arrayOfFiles
}

function getAllPaths(basePath) {
  return fs.readdirSync(basePath).filter((file) => {
    return fs.statSync(basePath + '/' + file).isDirectory()
  })
}

async function getIcons(style) {
  let files = await fsp.readdir(`./optimized/icons/${style}`)
  return Promise.all(
    files.map(async (file) => ({
      svg: await fsp.readFile(`./optimized/icons/${style}/${file}`, 'utf8'),
      componentName: `${camelcase(file.replace(/\.svg$/, ''), {
        pascalCase: true,
      })}Icon`,
    }))
  )
}

function exportAll(icons, format, includeExtension = true) {
  return icons
    .map(({ componentName }) => {
      let extension = includeExtension ? '.js' : ''
      if (format === 'esm') {
        return `export { default as ${componentName} } from './${componentName}${extension}'`
      }
      return `module.exports.${componentName} = require("./${componentName}${extension}")`
    })
    .join('\n')
}

async function ensureWrite(file, text) {
  await fsp.mkdir(dirname(file), { recursive: true })
  await fsp.writeFile(file, text, 'utf8')
}

async function ensureWriteJson(file, json) {
  await ensureWrite(file, JSON.stringify(json, null, 2))
}

async function buildIcons(package, style, format) {
  let outDir = `./${package}/${style}`
  if (format === 'esm') {
    outDir += '/esm'
  }

  let icons = await getIcons(style)

  await Promise.all(
    icons.flatMap(async ({ componentName, svg }) => {
      let content = await transform[package](svg, componentName, format)
      let types =
        package === 'react'
          ? `import * as React from 'react';\ndeclare function ${componentName}(props: React.ComponentProps<'svg'>): JSX.Element;\nexport default ${componentName};\n`
          : `import type { FunctionalComponent, HTMLAttributes, VNodeProps } from 'vue';\ndeclare const ${componentName}: FunctionalComponent<HTMLAttributes & VNodeProps>;\nexport default ${componentName};\n`

      return [
        ensureWrite(`${outDir}/${componentName}.js`, content),
        ...(types ? [ensureWrite(`${outDir}/${componentName}.d.ts`, types)] : []),
      ]
    })
  )

  await ensureWrite(`${outDir}/index.js`, exportAll(icons, format))

  await ensureWrite(`${outDir}/index.d.ts`, exportAll(icons, 'esm', false))
}

async function main(package) {
  const cjsPackageJson = { module: './esm/index.js', sideEffects: false }
  const esmPackageJson = { type: 'module', sideEffects: false }

  console.log(`Building ${package} package...`)

  await Promise.all([rimraf(`./${package}/icons/*`)])

  await Promise.all([
    buildIcons(package, 'editor', 'esm'),
    buildIcons(package, 'editor', 'cjs'),
    ensureWriteJson(`./${package}/icons/editor/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/editor/esm/package.json`, esmPackageJson),

    buildIcons(package, 'education', 'esm'),
    buildIcons(package, 'education', 'cjs'),
    ensureWriteJson(`./${package}/icons/education/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/education/esm/package.json`, esmPackageJson),

    buildIcons(package, 'files', 'esm'),
    buildIcons(package, 'files', 'cjs'),
    ensureWriteJson(`./${package}/icons/files/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/files/esm/package.json`, esmPackageJson),

    buildIcons(package, 'finance', 'esm'),
    buildIcons(package, 'finance', 'cjs'),
    ensureWriteJson(`./${package}/icons/finance/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/finance/esm/package.json`, esmPackageJson),

    buildIcons(package, 'general', 'esm'),
    buildIcons(package, 'general', 'cjs'),
    ensureWriteJson(`./${package}/icons/general/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/general/esm/package.json`, esmPackageJson),

    buildIcons(package, 'images', 'esm'),
    buildIcons(package, 'images', 'cjs'),
    ensureWriteJson(`./${package}/icons/images/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/images/esm/package.json`, esmPackageJson),

    buildIcons(package, 'layout', 'esm'),
    buildIcons(package, 'layout', 'cjs'),
    ensureWriteJson(`./${package}/icons/layout/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/layout/esm/package.json`, esmPackageJson),

    buildIcons(package, 'maps', 'esm'),
    buildIcons(package, 'maps', 'cjs'),
    ensureWriteJson(`./${package}/icons/maps/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/maps/esm/package.json`, esmPackageJson),

    buildIcons(package, 'media', 'esm'),
    buildIcons(package, 'media', 'cjs'),
    ensureWriteJson(`./${package}/icons/media/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/media/esm/package.json`, esmPackageJson),

    buildIcons(package, 'security', 'esm'),
    buildIcons(package, 'security', 'cjs'),
    ensureWriteJson(`./${package}/icons/security/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/security/esm/package.json`, esmPackageJson),

    buildIcons(package, 'shapes', 'esm'),
    buildIcons(package, 'shapes', 'cjs'),
    ensureWriteJson(`./${package}/icons/shapes/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/shapes/esm/package.json`, esmPackageJson),

    buildIcons(package, 'time', 'esm'),
    buildIcons(package, 'time', 'cjs'),
    ensureWriteJson(`./${package}/icons/time/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/time/esm/package.json`, esmPackageJson),

    buildIcons(package, 'users', 'esm'),
    buildIcons(package, 'users', 'cjs'),
    ensureWriteJson(`./${package}/icons/users/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/users/esm/package.json`, esmPackageJson),

    buildIcons(package, 'weather', 'esm'),
    buildIcons(package, 'weather', 'cjs'),
    ensureWriteJson(`./${package}/icons/weather/package.json`, cjsPackageJson),
    ensureWriteJson(`./${package}/icons/weather/esm/package.json`, esmPackageJson),
  ])

  return console.log(`Finished building ${package} package.`)
}

let [package] = process.argv.slice(2)

if (!package) {
  throw new Error('Please specify a package')
}

main(package)
