/**
 * Created by Administrator on 2016/5/7.
 */

//实现js文件的模块化加载,amd模式，加载完成一个模块就立即执行它或者加载并执行它的依赖

(function(global){
    var version = '0.1.0',
        op = Object.prototype,
        ostring = op.toString,
        slice = Array.prototype.slice,
        commentRegExp = /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/mg,//性能优化版的注释匹配正则
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^"'\s]+)["']\s*\)/g,
        doc = document,
        docCharset = doc.charset,
        head = doc.head || doc.getElementsByName('head')[0] || doc.documentElement,
        interactiveScript = null,
        gid = 0,
        currentAddingScript = null,
        curExecModName = null,
        conf = {},
        module = [],
        persistedMod = [],
        anonymousModule = null;
    function isObj(it){
        return ostring.call(it) === '[object Object]';
    }

    function isArr(it){
        return ostring.call(it) === '[object Array]';
    }

    function isFn(it){
        return ostring.call(it) === '[object Function]';
    }

    //深度对象扩展
    function extendDep(){
        var target = arguments[0] || {};
        var sources = slice.call(arguments,1);
        var srcLen = sources.length;
        for(var i = 0;i < srcLen;i++){
            var source = sources[0];
            for(var prop in source){
                var tgt = target[prop];
                var src = source[prop];
                //同时防止源对象为循环引用对象和源对象的属性引用目标对象导致无限循环
                if(src === source || src === target){
                    continue;
                }
                if(isArr(src)){
                    tgt = tgt && isArr(tgt) ? tgt : []; //属性相同时覆盖原属性
                    target[prop] = extendDep(tgt,src); //tgt不一定是引用,即可能不会改变原属性，所以需赋值
                } else if(isObj(src)){
                    tgt = tgt && isObj(tgt) ? tgt : {};
                    target[prop] = extendDep(tgt,src);
                } else if(src !== undefined){
                    target[prop] = src;
                }
            }
        }
        return target;
    }

    function getUrlById(id){
        if(!id){
            return getCurrentDir();
        }
        if(id.search(/^\./) !== -1){
            throw new Error('includejs define id' + id + 'must absolute');
        }
        return fixSuffix(getUrl(id,conf.baseUrl),'js');
    }

    //获取唯一id
    function getGid(){
        return gid++;
    }

    //获取路径
    function getUrl(path,url){
        //如果path本身是网址
        if(isUrl(path)){
            return fixUrl(path);
        }
        var rootUrl;
        rootUrl = url.match(/[^\/]*\/\/[^\/]*\//);
        if(rootUrl){
            //消除路径尾部
            url = url.slice(0,url.lastIndexOf('/') + 1);
            rootUrl = rootUrl[0];
        } else {
            rootUrl = url = url + '/';
        }
        // /开头
        if(path.search(/^\//) !== -1){
            return fixUrl(rootUrl + path);
        }
        // ../开头
        if(path.search(/^\.\.\//) !== -1){
            var httpOver = false;
            do {
                var index = url.lastIndexOf('/' , url.length - 2);
                if(index !== -1 && !httpOver){
                    path = path.slice(3);
                    url = url.slice(0,index + 1);
                    if (url[index - 1] === '/') {
                        httpOver = true; //http://...中http头是不能替换的
                    }
                } else {
                    throw new Error ('geturl error, cannot find path in url');
                }
            } while (path.search(/^\.\.\//) !== -1);
            return fixUrl(url + path);
        }
        // ./开头
        path = path.search(/^\.\//) !== -1 ? path.slice(2) : path;
        // 相对路径不作处理
        return fixUrl(url + path);
    }

    function fixSuffix(url,suffix){
        var reg = new RegExp('\\.' + suffix + '$','i');
        return url.search(reg) !== -1 ? url : url + '.' + suffix;
    }

    function replacePath(id){
        var ids = id.split('/');
        if(!(ids[0] in conf.paths)){
            return id;
        }
        ids[0] = conf.paths[ids[0]];
        return ids.join('/');
    }

    function getDepUrl(id,url){
        var pathId = replacePath(id);
        //找到path 基于baseUrl
        if(pathId !== id){
            url = conf.baseUrl;
        }
        //console.log(pathId);
        //console.log(conf.baseUrl);
        //console.log('pathid',pathId);
        //console.log('url',getUrl(pathId, url || conf.baseUrl));
        return fixSuffix(getUrl(pathId, url || conf.baseUrl), 'js');
    }

    function isUrl(url){
        return url.search(/^(http:\/\/|https:\/\/)/) !== -1;
    }

    //用a/b/c替代a//b///c
    function fixUrl(url){
        return url.replace(/([^:])\/+/g,'$1/');
    }

    //防止出现require('...')//...时将')'一起替换掉
    function commentReplace(match,singlePrefix) {
        return singlePrefix || '';
    }

    function config(option){
        if(!isObj(option)){
            return extendDep({},conf);
        }
        //处理baseUrl
        //console.log('configUrl',option.baseUrl);

        extendDep(conf,option);
        return extendDep({},conf);
    }

    function loadJs(src,success,error,option){
        var def = extendDep({
            charset:docCharset
        },option);
        var node = doc.createElement('script');
        node.src = src;
        node.id = 'include-js-+' + getGid();
        node.charset = def.charset;
        if('onload' in node){
            node.onload = success;
            node.onerror = error;
        }else {
            node.onreadystatechange = function(){
                if(/loaded | complete/.test(node.readyState)){
                    success();
                }
            };
        }
        currentAddingScript = node;
        //console.log('currentAddingScript',node);
        head.appendChild(node);
        currentAddingScript = null;
        //console.log('currentAddingScript',node);
    }

    function getCurrentDir(){
        if(currentAddingScript){
            return currentAddingScript.src;
        }
        //ie6-10获取当前正在执行的script的方法
        if(interactiveScript && interactiveScript.readyState === "interactive"){
            return interactiveScript;
        }
        var scripts = head.getElementsByTagName("script");
        var sLen = scripts.length;
        for(var i = 0;i < sLen;i++){
            var script = scripts[i];
            if(script.readyState === "interactive"){
                interactiveScript = script;
                return interactiveScript.src;
            }
        }
        return null;
    }

    function execMod(modId,callback,params){
        if(!params){
            persistedMod[modId].exports = module[modId].callback();
        }else {
            curExecModName = modId;
            var exp = module[modId].callback.apply(null,params);
            curExecModName = null;
            if(exp){
                persistedMod[modId].exports = exp;
            }
        }
        //console.log('exports', module[modId].callback.toString());
        //callback执行处，依赖文件已执行完毕，剩余依赖减一
        callback(persistedMod[modId].exports);
        execComplete(modId);
    }

    function execComplete(modId){
        for(var i = 0;i < module[modId].oncomplete.length;i++){
            //callback执行处，依赖文件已执行完毕，对应的剩余依赖减一
            module[modId].oncomplete[i](persistedMod[modId] && persistedMod[module].exports);
        }
        module[modId] = null;
    }

    function isDepCircle (mod, id) {
        var i, deps = mod.deps, depLen, depId;
        console.log('id', id);
        if (deps){
            depLen = deps.length;
            for (i = 0; i<depLen; i++) {
                depId = getDepUrl(deps[i],'');
                console.log('depId', depId);
                if (depId === id) {
                    return true;
                }
                if(isDepCircle(module[depId],id)) {
                    return true;
                }
            }
        }
        return false;
    }

    function loadMod(id,callback,option){
        //console.log(option.modId);
        if(id === 'require'){
            callback(require);
            return -1;
        }
        if(id === 'exports'){
            var exports = persistedMod[option.modId].exports = {};
            callback(exports);
            return -2;
        }
        if (id === 'module') {
            callback(persistedMod[option.modId]);
            return -3;
        }
        //得到依赖模块的文件路径
        var modId = getDepUrl(id,option.baseUrl);
        //还未载入的模块
        if(!module[modId]){
            module[modId] = {
                status: 'loading',
                oncomplete: []
            };
            //载入模块文件
            loadJs(modId,function(){
                if(anonymousModule){
                    module[modId] = anonymousModule;
                    module[modId].oncomplete = module[modId]||{};
                    anonymousModule = null;
                }
                persistedMod[modId] = {};
                if(!isFn(module[modId].callback)){
                    execMod(modId,callback);
                    return 0;
                }
                //console.log('js loaded');
                //递归使用模块
                use(module[modId].deps,function(){
                    //注意这是依赖的模块都执行完后最后执行自己的回调
                    execMod(modId,callback,slice.call(arguments,0));
                },{baseUrl:modId.slice(0,modId.lastIndexOf('/')+1),modId:modId});
                return 1;
            },function (){
                module[modId].status = 'error';
                callback();
                execComplete(modId);
            });
            return 0;
        }
        //载入错误的模块
        if(module[modId].status === 'error'){
            callback();
            return 1;
        }
        //正在载入的模块
        if(module[modId].status === 'loading'){
            //说明之前该模块已被依赖过，把依赖它的模块回调放入队列中，待加载完后一并执行
            module[modId].oncomplete.push(callback);
            return 1;
        }
        //载入完毕但尚未执行完成的模块
        if(!persistedMod[modId].exports){
            if(!isFn(module[modId].callback)){
                execMod(modId,callback);
                return 2;
            }
            if (isDepCircle(module[modId],modId)) {
                module[modId].status = 'error';
                callback(module[modId].status);
                return 1;
            }
            //递归使用模块
            use(module[modId].deps,function(){
                execMod(modId,callback,slice.call(arguments,0));
            },{baseUrl: modId});
        }
        //执行完毕的模块
        callback(persistedMod[modId].exports);
        return 4;
    }
    //获取已经执行完毕的模块
    function require(id,url){
        //console.log('curExecModName',curExecModName);
        var modId = getDepUrl(id,url || curExecModName.slice(0,curExecModName.lastIndexOf('/')+1));
        //console.log('modId',modId);
        return persistedMod[modId] && persistedMod[modId].exports;
    }

    //使用定义好的模块
    function use(deps,callback,option){
        if(arguments.length < 2){
            throw new Error('includejs.use arguments miss');
        }
        if(typeof deps === 'string'){
            deps = [deps];
        }
        if(!isArr(deps) || !isFn(callback)){
            throw new Error('includejs.use arguments type error');
        }
        if(!isObj(option)){
            option = {};
        }
        option.baseUrl = option.baseUrl || conf.baseUrl;
        if (deps.length === 0) {
            callback();
            return 2;
        }
        //console.log('useUrl',conf.baseUrl);
        var depsLen= deps.length,depsCount=depsLen;
        var params = [];
        for (var i = 0; i < depsLen;i++){
            (function(j){
                //console.log('deps',deps[i]);
                loadMod(deps[j],function(param){
                    depsCount--;
                    //console.log('depCount',depsCount);
                    params[j] = param;
                    if(depsCount === 0){
                        callback.apply(null,params);
                    }
                },option);
            }(i));
        }
        //console.log('out');
        return 3;
    }

    //定义模块
    //id(可选) 模块id
    //deps(可选) 依赖
    //callback 依赖加载完成后的回调函数
    function define(id,deps,callback){
        //参数调整
        if(typeof id !== "string"){
            callback = deps;
            deps = id;
            id = null;
        }
        if(!isArr(deps)){
            callback = deps;
            deps = [];
        }
        //支持commonjs格式function(require,exports,module)
        if(deps.length === 0 && isFn(callback) && callback.length){
            callback.toString().replace(commentRegExp,commentReplace).replace(cjsRequireRegExp,function(match,dep){
                deps.push(dep);
            });
            var arr = ['require'];
            var cLen = callback.length;
            if(cLen > 1){
                arr.push('exports');
            }
            if(cLen > 2){
                arr.push('module');
            }
            deps = arr.concat(deps);
        }
        //匿名模块以文件路径为id，拥有id的模块将接上baseUrl
        var modId = getUrlById(id);
        if(modId){
            module[modId] = module[modId] || {};
            module[modId].deps = deps;
            module[modId].callback = callback;
            module[modId].status = 'loaded';
            module[modId].oncomplete = module[modId].oncomplete || {};
        }
        else {
            anonymousModule = {};
            anonymousModule.deps = deps;
            anonymousModule.callback = callback;
            anonymousModule.status = 'loaded';
        }
        //id相同覆盖之前的模块
        return 0;
    }
    define.amd = {from: 'includeJs'};
    var includejs = {
        version: version,
        use: use,
        config: config,
        define: define,
        require: require
    };

    includejs.config({
       baseUrl:'./',
       paths: {}
    });
    global.define = define;
    global.includejs = includejs;
}(window));
