'use strict'

var fs = require('fs')
var path = require('path')
var _ = require('lodash')

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
  if(options && typeof(options) === 'object' && options.filePath && options.outputFilePath){
    this.options = Object.assign({indent:['spaces',2]},options)
    this.indentContent = getIndentContent(this.options.indent)
  }else{
    throw new TypeError('缺少必要的参数.')
  }
}

PugInjectPlugin.prototype.pugInject = function (compilation,compiler) {
  var assets = Object.keys(compilation.assets)
  var hash = compilation.hash.substring(0,8)
  var content = fs.readFileSync(this.options.filePath, 'utf-8')
  var indentContent = this.indentContent
  //images
  this.extractImages(content,compilation)
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
  var dirname = path.dirname(this.options.outputFilePath)
  if(!fs.existsSync(dirname)){
    //console.log(path.dirname(this.options.output) + '文件夹不存在,需要创建')
    fs.mkdirSync(dirname)
  }
  fs.writeFileSync(this.options.outputFilePath, content, 'utf-8')
}
/**
 * extract images
 */
PugInjectPlugin.prototype.extractImages = function(content,compilation){
  var _this = this
  //匹配图片
  var REGX = /img\(.*?src=("|')(.+?)("|').*\)/ig
  var httpREGX = /^(https|http|ftp|rtsp|mms)/i
  var imageREGX = /(jpe?g|gif|png)$/i
  var result
  _this.images = []
  while ((result = REGX.exec(content)) != null)  {
    var imageSrc = result[2]
    if(imageREGX.test(imageSrc) && !httpREGX.test(imageSrc)){
      _this.images.push(imageSrc)
      var originSrcUrl = path.resolve(this.options.filePath.split('views')[0], imageSrc)
      //var outputSrcUrl = path.resolve(this.options.output, imageSrc)
      _this.addToAssets(originSrcUrl,imageSrc,compilation)
    }
  }
}
/**
 * add to assets
 */
PugInjectPlugin.prototype.addToAssets = function(originFile,outputFile,compilation){
  var stat = fs.statSync(originFile)
  if(stat.isFile()){
    compilation.assets[outputFile] = {
      source: function() {
        return fs.readFileSync(originFile)
      },
      size: function() {
        return stat.size
      }
    }
  }
}
/**
 * write file
 */
PugInjectPlugin.prototype.copyFile = function(originFile,targetFile){
  fs.readFile(originFile,function(err,content){
    fs.writeFile(targetFile,content,function(err){
      //console.log(err)
    })
  })
}
/**
 * add file to watch
 */
PugInjectPlugin.prototype.addWatch = function(filePath,compilation){
  //fileDependencies,contextDependencies
  if (_.includes(compilation.fileDependencies, filePath)) {
    //console.log('文件已经加入 fileDependencies')
  } else {
    //console.log('add to fileDependencies' + filePath)
    compilation.fileDependencies.push(filePath)
  }
  if (_.includes(compilation.contextDependencies, filePath)) {
    //console.log('文件已经加入 contextDependencies')
  } else {
    //console.log('add to contextDependencies' + filePath)
    compilation.contextDependencies.push(filePath)
  }  
}

PugInjectPlugin.prototype.apply = function (compiler) {
  var _this = this
  var globalRef = {
    context: compiler.options.context,
    output: compiler.options.output.path,
  }
  if (globalRef.output === '/' &&
    compiler.options.devServer &&
    compiler.options.devServer.outputPath) {
    globalRef.output = compiler.options.devServer.outputPath
  }
  _this.options = Object.assign(globalRef,_this.options)

  // compiler.plugin('make', function (compilation,callback) {
  //   if(_this.options.favicon){
  //     var filepath = path.resolve(_this.options.context, _this.options.favicon)
  //     var filename = path.basename(filepath)
  //     var outputPath = path.resolve(_this.options.output, filename)
  //     //console.log(filepath + ' ' + outputPath)
  //     if(!fs.existsSync(outputPath)){
  //       //console.log('开始复制 ' + filepath + ' 到 ' + outputPath)
  //       _this.copyFile(filepath,outputPath)
  //     }
  //   }
  //   callback()
  // })   

  compiler.plugin('emit', function (compilation,callback) {
    _this.pugInject(compilation,compiler)
    //add favicon
    if(_this.options.favicon){
      var filepath = path.resolve(_this.options.context, _this.options.favicon)
      var filename = path.basename(filepath)
      _this.addToAssets(filepath,filename,compilation)
    }    
    callback()
  })
  compiler.plugin('after-emit', function (compilation,callback) {
    _this.addWatch(_this.options.filePath,compilation)    
    _.forEach(_this.images, (file) => {
      if(file){
        _this.addWatch(file,compilation)
      }
    })
    callback()
  })  
}

module.exports = PugInjectPlugin