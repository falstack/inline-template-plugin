const HtmlWebpackPlugin = require('html-webpack-plugin')
const InlineChunkHtmlPlugin = require('./utils/inlinesourceplugin')
const removeInject = require('./utils/removeInject')

const inlineTemplatePlugin = (path, config = {}) => {
  return  [
    new HtmlWebpackPlugin({
      filename: config.filename || 'inline.html',
      templateContent: removeInject(path),
      inject: true,
      minify: config.minify ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      } : false,
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, {
      test: ['.js', '.css'],
      replaceHttpToHttps: true,
      replaceImagePrefix: '',
      ...config
    })
  ]
}

module.exports = inlineTemplatePlugin
