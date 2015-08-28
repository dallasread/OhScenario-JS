var browserify = require('browserify'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    stringify = require('stringify');

gulp.task('js', function() {
    var b = browserify({
        entries: './client/index.js'
    }).transform(stringify({
        extensions: ['.hbs']
        // minify: false
    }));

    return b.bundle()
        .pipe(source('../OhScenario.com/assets/js/run.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./'));
});

gulp.task('watch', ['default'], function(){
    gulp.watch(['./client/**/*'], ['js']);
});

gulp.task('default', ['js']);
