var { task, src, dest, series } = require('gulp');
var del = require('del');
var replace = require('gulp-string-replace');
var exec = require('child_process').exec;

task('clean-dist', () => {
    return del(['dist/**/*']);
});

task('compile', series('clean-dist', (done) => {
    exec('npm run compile', (err, stdout, stderr) => done(err))
}));

task('package', series('compile', (done) => {
    src('package.json')
        .pipe(replace('dist/index.js','index.js'))
        .pipe(replace('dist/index.d.ts','index.d.ts'))
        .pipe(dest('dist/'));

    done();
}));


task('package-src', series('package', (done) => {
    src('src/**/*.ts')
        .pipe(dest('dist/'));

    done();
}));


