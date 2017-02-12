var fs = require('fs')
var path = require('path')

function regexMatchAll(content, replaceContent, indentContent, type) {
  var REGEX = /(\/\/js\sinject)([\s\S]*?)(\/\/end\sinject)/ig
  if(type === 'css'){
    REGEX = /(\/\/css\sinject)([\s\S]*?)(\/\/end\sinject)/ig
  }
  return content.replace(REGEX, '$1\n' + indentContent + replaceContent + '\n'+ indentContent + '$3')
}

function makeTags(file, assets, type) {
  var tags = ''
  assets.map(function (i) {
    if(i.substr(-4) !== '.map' && i.indexOf(file) !== -1){
      if(type === 'js'){
        tags += 'script(type="text/javascript" src="' + path.normalize(i) + '")'
      }else if(type === 'css'){
        tags += 'link(rel="stylesheet", href="' + path.normalize(i) + '")'
      }
    }
  })
  return tags
}

function getIndentContent(indent){
  var content = ''
  var indentContent = " "
  if(indent[0] === 'tab'){
    indentContent = '\t'
  }
  for(var i = 0; i < indent[1]; i++){
    content += indentContent
  }
  return content
}

function PugInjectPlugin(options) {
  if(options && typeof(options) === 'object' && options.filePath && options.output){
    this.options = Object.assign({indent:['spaces',2]},options)
    this.indentContent = getIndentContent(this.options.indent)
  }else{
    throw new TypeError('缺少必要的参数.')
  }
}

PugInjectPlugin.prototype.pugInject = function (assets) {
  var content = fs.readFileSync(this.options.filePath, 'utf-8')
  var indentContent = this.indentContent
  //如果不需要注入则直接写入到output
  if(!this.options.inject){
    fs.writeFileSync(this.options.output, content, 'utf-8')
  }else{
    //js注入处理
    if(this.options.injectJs && this.options.injectJs.length > 0){
      var jsLinks = [];
      this.options.injectJs.forEach(function (file) {
        var filename = path.basename(file,'.js') + '.js';
        jsLinks.push(makeTags(filename,assets,'js'))
      })
      content = regexMatchAll(content,jsLinks.join('\n' + indentContent),indentContent)
    }
    //css注入处理
    if(this.options.injectCss && this.options.injectCss.length > 0){
      var cssLinks = [];
      this.options.injectCss.forEach(function (file) {
        //配置加不加扩展名都可以
        var filename = path.basename(file,'.css') + '.css';
        cssLinks.push(makeTags(filename,assets,'css'))
      })
      content = regexMatchAll(content,cssLinks.join('\n' + indentContent),indentContent,'css')
    }
    fs.writeFileSync(this.options.output, content, 'utf-8')
  }
}

PugInjectPlugin.prototype.apply = function (compiler) {
  var _this = this
  compiler.plugin('emit', function (compilation,callback) {
    _this.pugInject(Object.keys(compilation.assets))
    callback()
  })
}

module.exports = PugInjectPlugin