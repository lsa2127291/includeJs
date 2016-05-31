/**
 * Created by Administrator on 2016/5/16.
 */
includejs.config({
    baseUrl:'./base',
    paths:{
        sample1:'module/sample1',
        sample2:'module/sample2',
        commonjs:'module/commonjs',
        a: 'module/a',
        c: 'module/c'
    }
});
describe('amd',function(){

    describe('use module',function(){
        it('should return module itself',function(done){
            includejs.use('sample2',function(sample1){
                should.exist(sample1);
                sample1.name.should.equal('sample2');
                done();
            });
        })
    });

    describe('use extend module',function(){
        it('should return module and parent module',function(done){
            includejs.use('sample1',function(sample1){
                should.exist(sample1);
                sample1.name.should.equal('sample1');
                sample1.parent.should.equal('sample2');
                done();
            });
        });
    });
});

describe('commonjs',function(){
    it('should return module',function(done){
        includejs.use('commonjs',function(commonjs){
            should.exist(commonjs);
            commonjs.name.should.equal('commonjs');
            commonjs.parent.name.should.equal('sample1');
            done();
        });
    });
});

describe('recurrent dependency', function () {
    it('can over', function (done) {
        includejs.use('a', function (a) {
            var over =  true;
            should.exist(over);
            done();
        })
    })
});
