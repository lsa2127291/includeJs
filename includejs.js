/**
 * Created by Administrator on 2016/5/7.
 */
//实现js文件的模块化加载,amd模式
var include,define;
(function(global){
    var version='0.1.0',
        op=Object.prototype,
        ostring=op.toString,
        commentRegExp=/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/mg,//性能优化版的注释匹配正则
        cjsRequireRegExp=/[^.]\s*require\s*\(\s*["']([^"'\s]+)["']\s*\)/g;
    function commentReplace(match,singlePrefix) {
        return singlePrefix || '';
    }
    function isArr(it){
        return ostring.call(it)==='[Object Array]';
    }
    function isFn(it){
        return ostring.call(it)==='[Object Function]';
    }
    //获取已经加载完毕的模块
    function require(){
    }
    //加载定义好的模块
    function use(){
    }
    //定义模块
    //name(可选) 模块名
    //deps(可选) 依赖
    //callback 回调函数
    function define(name,deps,callback){
        //参数调整
        if(typeof name !== "string"){
            callback=deps;
            deps=name;
            name=null;
        }
        if(!isArr(deps)){
            callback=deps;
            deps=[];
        }
        //支持commonjs格式function(require,exports,module)
        if(deps.length===0&&isFn(callback)&&callback.length){
            callback.toString().replace(commentRegExp,commentReplace).replace();
        }
    }
}(this));