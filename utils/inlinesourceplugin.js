/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

class InlineChunkHtmlPlugin {
  constructor(htmlWebpackPlugin, tests) {
    this.htmlWebpackPlugin = htmlWebpackPlugin;
    this.tests = tests;
  }

  getInlinedScript(publicPath, assets, tag) {
    if (tag.tagName !== 'script' || !(tag.attributes && tag.attributes.src)) {
      return tag;
    }
    const scriptName = publicPath
      ? tag.attributes.src.replace(publicPath, '')
      : tag.attributes.src;
    if (!this.tests.some(test => scriptName.match(test))) {
      return tag;
    }
    const asset = assets[scriptName];
    if (asset == null) {
      return tag;
    }
    return { tagName: 'script', innerHTML: asset.source(), closeTag: true }
  }

  getInlinedStyle(publicPath, assets, tag) {
    if (tag.tagName !== 'link' || !(tag.attributes && tag.attributes.href)) {
      return tag;
    }
    const styleName = publicPath
      ? tag.attributes.href.replace(publicPath, '')
      : tag.attributes.href;
    if (!this.tests.some(test => styleName.match(test))) {
      return tag;
    }
    const asset = assets[styleName];
    if (asset == null) {
      return tag;
    }
    return { tagName: 'style', innerHTML: asset.source(), closeTag: true }
  }

  apply(compiler) {
    let publicPath = compiler.options.output.publicPath || '';
    if (publicPath && !publicPath.endsWith('/')) {
      publicPath += '/';
    }

    compiler.hooks.compilation.tap('InlineChunkHtmlPlugin', compilation => {
      const scriptFunction = tag => this.getInlinedScript(publicPath, compilation.assets, tag);
      const styleFunction = tag => this.getInlinedStyle(publicPath, compilation.assets, tag);

      const hooks = this.htmlWebpackPlugin.getHooks(compilation);
      hooks.alterAssetTagGroups.tap('InlineChunkHtmlPlugin', assets => {
        assets.headTags = assets.headTags.map(scriptFunction);
        assets.headTags = assets.headTags.map(styleFunction);
        assets.bodyTags = assets.bodyTags.map(scriptFunction);
        assets.bodyTags = assets.bodyTags.map(styleFunction);
      });

      // Still emit the runtime chunk for users who do not use our generated
      // index.html file.
      // hooks.afterEmit.tap('InlineChunkHtmlPlugin', () => {
      //   Object.keys(compilation.assets).forEach(assetName => {
      //     if (this.tests.some(test => assetName.match(test))) {
      //       delete compilation.assets[assetName];
      //     }
      //   });
      // });
    });
  }
}

module.exports = InlineChunkHtmlPlugin;
