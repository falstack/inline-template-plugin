const InlineChunkHtmlPlugin = require('./utils/inlinesourceplugin')
const removeInject = require('./utils/removeInject')

const InlineTemplatePlugin = (path) => {
  return  [
    new HtmlWebpackPlugin({
      filename: 'inline.html',
      templateContent: removeInject(path),
      inject: true,
      minify: {
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
      },
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, ['.js', '.css'])
  ]
}

module.exports = InlineTemplatePlugin
