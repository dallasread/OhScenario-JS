var app = require('http').createServer(),
    webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

// webdriver.logging.getLogger().setLevel(webdriver.logging.Level.ALL);
// webdriver.logging.installConsoleHandler();

var driver = new webdriver.Builder().forBrowser('firefox').build();
driver.get('http://fifa.com').then(null, function() {
    console.log('loaded');
}).thenFinally(function() {
    console.log('finally');
});
// $el = driver.findElement({ css: 'a:first' });
// $el.then(null, function (err) {
//     if (err) {
//         console.log(err.name);
//     } else {
//         $el.click();
//     }
// });
driver.quit();
