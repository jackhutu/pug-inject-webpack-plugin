var fs = require('fs')
var path = require('path')

function regexMatchAll(content, replaceContent, indentContent, type) {
  var REGEX = /(\/\/js\sinject)([\s\S]*?)(\/\/end\sinject)/ig
  if(type === 'css'){
    REGEX = /(\/\/css\sinject)([\s\S]*?)(\/\/end\sinject)/ig
  }
  //去掉原来的标记
  return content.replace(REGEX, replaceContent + '\n'+ indentContent)
  //加上原为的标记
  //return content.replace(REGEX, '$1\n' + indentContent + replaceContent + '\n'+ indentContent + '$3')
}

function makeTags(file, assets, type, hash) {
  var tags = ''
  assets.map(function (i) {
    if(type === 'js'){
      //是否有hash符都匹配
      if(i.substr(-4) !== '.map' && (i === 'js/' + file + '.' + hash + '.js' || i === 'js/' + file + '.js')){
        tags += 'script(type="text/javascript" src="' + path.normalize(i) + '")'
      }
    }else if(type === 'css'){
      if(i.substr(-4) !== '.map' && (i === 'styles/' + file + '.' + hash + '.css' || i === 'styles/' + file + '.css')){
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

PugInjectPlugin.prototype.pugInject = function (compilation) {
  var assets = Object.keys(compilation.assets)
  var hash = compilation.hash.substring(0,8)
  var content = fs.readFileSync(this.options.filePath, 'utf-8')
  var indentContent = this.indentContent
  //如果不需要注入则直接写入到output
  if(this.options.inject){
    //js注入处理
    if(this.options.injectJs && this.options.injectJs.length > 0){
      var jsLinks = [];
      //获取要注入的文件名
      this.options.injectJs.forEach(function (file) {
        //加上hash字符串
        var filename = path.basename(file,'.js')
        var jsTags = makeTags(filename,assets,'js', hash)
        if(jsTags !== ''){
          jsLinks.push(jsTags)
        }
      })
      content = regexMatchAll(content,jsLinks.join('\n' + indentContent),indentContent)
    }
    //css注入处理
    if(this.options.injectCss && this.options.injectCss.length > 0){
      var cssLinks = [];
      this.options.injectCss.forEach(function (file) {
        //配置加不加扩展名都可以
        var filename = path.basename(file,'.css')
        var cssTags = makeTags(filename,assets,'css', hash)
        if(cssTags !== ''){
          cssLinks.push(cssTags)
        }
      })
      content = regexMatchAll(content,cssLinks.join('\n' + indentContent),indentContent,'css')
    }
  }
  var dirname = path.dirname(this.options.output)
  if(!fs.existsSync(dirname)){
    //console.log(path.dirname(this.options.output) + '文件夹不存在,需要创建')
    fs.mkdirSync(dirname)
  }
  fs.writeFileSync(this.options.output, content, 'utf-8')
  //写入文件, 这种写入方式在内存中, express获取不到
  // compilation.assets[this.options.output] = {
  //   source: function() {
  //     return content;
  //   },
  //   size: function() {
  //     return content.length;
  //   }
  // }
}

/**
 * add file to watch
 */
PugInjectPlugin.prototype.addWatch = function(compilation){
  //fileDependencies,contextDependencies
  compilation.fileDependencies.push(this.options.filePath)
}

PugInjectPlugin.prototype.apply = function (compiler) {
  var _this = this
  compiler.plugin('emit', function (compilation,callback) {
    _this.pugInject(compilation)
    callback()
  })
  compiler.plugin('after-emit', function (compilation,callback) {
    _this.addWatch(compilation)
    callback()
  })  
}

module.exports = PugInjectPlugin