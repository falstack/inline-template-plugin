const { Parser } = require('acorn')
const walk = require('acorn-walk')

'use strict';

class InlineChunkHtmlPlugin {
  constructor(htmlWebpackPlugin, config) {
    this.htmlWebpackPlugin = htmlWebpackPlugin;
    this.config = config
    this.images = new Set()
  }

  getInlinedScript(publicPath, assets, tag) {
    const self = this
    if (tag.tagName !== 'script' || !(tag.attributes && tag.attributes.src)) {
      return tag;
    }
    const scriptName = publicPath
      ? tag.attributes.src.replace(publicPath, '')
      : tag.attributes.src;
    if (!this.config.test.some(test => scriptName.match(test))) {
      return tag;
    }
    const asset = assets[scriptName];
    if (asset == null) {
      return tag;
    }
    const source = asset.source()
    const results = []
    walk.ancestor(Parser.parse(source), {
      Literal(node, ancestors) {
        const val = node.value
        if (typeof val === 'string') {
          if (/\.(png|jpe?g|gif)$/.test(val)) {
            // 完整的图片URL
            if (/^https?:\/\//.test(val)) {
              // console.log('condition-1：', val)
              // self.images.add(val)
            } else {
              const parent = ancestors[ancestors.length - 2];
              let nodeUntilFunction;
              for (let i = ancestors.length - 1; i >= 0; i--) {
                if (ancestors[i].type === 'FunctionExpression') {
                  nodeUntilFunction = ancestors[i];
                  break;
                }
              }
              if (parent.type === 'BinaryExpression'
                && parent.operator === '+'
                && parent.right.type === 'Literal') {
                const left = parent.left
                const fnParams = nodeUntilFunction.params.map((item) => item.name)
                // 类似a.p这样的成员引用
                if (left.type === 'MemberExpression'
                  && left.object.name === fnParams[fnParams.length - 1]
                  && left.property.name === 'p'
                ) {
                  const start = left.object.start
                  const end = node.end
                  results.push({ start, val, end })
                }
              }
            }
          }
        }
      }
    })
    // 开始拼接链接
    let finalScript
    if (results.length) {
      let lastIndex = 0
      const jsParts = []
      results.sort((a, b) => a.start - b.start).forEach(item => {
        let fullUrl = item.val
        // 拼接链接转全链接
        if (!fullUrl.startsWith('//') && !fullUrl.startsWith('http')) {
          fullUrl = publicPath + fullUrl
        }
        // 相对协议转 https
        if (fullUrl.startsWith('//')) {
          fullUrl = 'https:' + fullUrl
        }
        // http 协议转 https
        if (this.config.replaceHttpToHttps) {
          fullUrl = fullUrl.replace('http:', 'https:')
        }
        // https 协议转私有协议
        if (this.config.replaceImagePrefix) {
          fullUrl = fullUrl.replace('https:', `${this.config.replaceImagePrefix}:`)
        }
        // console.log('condition-2：', fullUrl)

        jsParts.push(source.substring(lastIndex, item.start))
        jsParts.push('"' + fullUrl + '"')
        lastIndex = item.end

        this.images.add(fullUrl)
      })

      jsParts.push(source.substring(lastIndex))
      finalScript = jsParts.join('')
    } else {
      finalScript = source
    }

    return { tagName: 'script', innerHTML: finalScript, closeTag: true }
  }

  getInlinedStyle(publicPath, assets, tag) {
    if (tag.tagName !== 'link' || !(tag.attributes && tag.attributes.href)) {
      return tag;
    }
    const styleName = publicPath
      ? tag.attributes.href.replace(publicPath, '')
      : tag.attributes.href;
    if (!this.config.test.some(test => styleName.match(test))) {
      return tag;
    }
    const asset = assets[styleName];
    if (asset == null) {
      return tag;
    }
    let source = asset.source()
    // 相对协议转 https
    source = (source || '').replace(/url\(\/\//g, 'url(https://')
    // http 协议转 https
    if (this.config.replaceHttpToHttps) {
      source = source.replace(/url\(http:/g, 'url(https:')
    }
    // https 协议转私有协议
    if (this.config.replaceImagePrefix) {
      source = source.replace(/url\(https:/g, `url(${this.config.replaceImagePrefix}:`)
    }
    // 图片提取
    source.split('}').forEach(styleStr => {
      if (styleStr && styleStr.indexOf('url(') >= 0 && /\.(jpe?g|png|gif|webp)/.test(styleStr)) {
        const urlMatch = styleStr.match(/url\(['"]?([^"')]+)['"]?\)/i)
        if (urlMatch && urlMatch[1]) {
          // console.log('condition-4：', urlMatch[1])
          this.images.add(urlMatch[1])
        }
      }
    })
    return { tagName: 'style', innerHTML: source, closeTag: true }
  }

  apply(compiler) {
    let publicPath = compiler.options.output.publicPath || '';
    if (publicPath && !publicPath.endsWith('/')) {
      publicPath += '/';
    }

    compiler.hooks.compilation.tap('InlineChunkHtmlPlugin', compilation => {
      const scriptFunction = tag => this.getInlinedScript(publicPath, compilation.assets, tag);
      const styleFunction = tag => this.getInlinedStyle(publicPath, compilation.assets, tag);

      const hooks = this.htmlWebpackPlugin.getHooks(compilation)
      hooks.alterAssetTagGroups.tap('InlineChunkHtmlPlugin', assets => {
        assets.headTags = assets.headTags.map(scriptFunction)
        assets.headTags = assets.headTags.map(styleFunction)
        assets.bodyTags = assets.bodyTags.map(scriptFunction)
        assets.bodyTags = assets.bodyTags.map(styleFunction)
        // TODO：html 里的 loading 图怎么办？
        compilation.gsr = compilation.gsr || {}
        compilation.gsr.images = this.images
      })
    })

    // compiler.hooks.afterEmit.tap('InlineChunkHtmlPlugin', (compilation) => {
    //   console.log('afterEmit compilation')
    //   console.log(compilation.gsr)
    // })
  }
}

module.exports = InlineChunkHtmlPlugin;
