## pug-inject-webpack-plugin
pug模板注入依赖插件

#### 安装
```
$ npm i --save-dev pug-inject-webpack-plugin
```

#### 使用方法
```
  new PugInjectPlugin({
    indent:['spaces',2], //默认空格2, 其它选项: ['tab',1]
    filePath: name,      //模板文件路径
    output: name,        //输出目录
    inject: false,       //是否注入, 否则只是复制
    injectJs: ['commons',filename], //注入的JS文件列表,可以不带扩展名, 数组格式
    injectCss: [filename]   //注入的CSS文件列表,,可以不带扩展名, 数组格式
  })
```

- indent 模板缩进的种类和数量,可选, 默认空格2 : ['spaces', 2]
- filePath 必选
- output 必选

#### 详见Demo 
[https://github.com/jackhutu/koa2-webpack-startkit](https://github.com/jackhutu/koa2-webpack-startkit)

### License
MIT
