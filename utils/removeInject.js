const fs = require('fs')
const _template = require('lodash.template')

const compileOptions = {
  escape: /{{([^{][\s\S]+?[^}])}}/g,
  interpolate: /{{{([\s\S]+?)}}}/g,
}

const voidFn = () => ''

const injectObjectDefault = {
  text: voidFn,
}

const vueMetaDefault = {
  inject: function() {
    return {
      title: injectObjectDefault,
      meta: injectObjectDefault,
      link: injectObjectDefault,
    }
  }
}

function removeInject(template) {
  const file = fs.readFileSync(template, 'utf-8')
  const convert = _template(file, compileOptions)

  return convert({
    template,
    meta: vueMetaDefault,
    renderScripts: voidFn,
    renderStyles: voidFn,
    renderState: voidFn,
  })
}

module.exports = removeInject
