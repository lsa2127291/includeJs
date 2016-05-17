/**
 * Created by Administrator on 2016/5/16.
 */
module.exports = function (config) {
    config.set({
        // to run in additional browsers:
        // 1. install corresponding karma launcher
        //    http://karma-runner.github.io/0.13/config/browsers.html
        // 2. add it to the `browsers` array below.
        basePath: '',
        browsers: ['PhantomJS'],
        frameworks: ['mocha','chai'],
        files: ['../include.js','./module/*.js','./test.js'],
        preprocessors: {
            './test.js':'coverage'
        },
        reporters: ['progress','coverage'],
        // optionally, configure the reporter
        coverageReporter: {
            type : 'html',
            dir : 'coverage/'
        },
        port: 9876,
        colors: true,
        autoWatch: true,
        plugins: [
            'karma-mocha',
            'karma-chai',
            'karma-coverage',
            'karma-phantomjs-launcher'
        ]
    })
};
