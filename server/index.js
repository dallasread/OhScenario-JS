var app = require('http').createServer(),
    io = require('socket.io')(app),
    webdriver = require('selenium-webdriver');

app.listen(8111);

var Generator = require('generate-js');

var App = Generator.generate(function App() {
    var _ = this;

    _.defineProperties({
        steps: []
    });
});

App.definePrototype({
    init: function init() {
        var _ = this;

        io.on('connection', function connection(socket) {
            _.socket = socket;
            _.bindEvents();
        });

        io.on('disconnect', function disconnect() {
            _.unbindEvents();
        });
    },

    unbindEvents: function unbindEvents() {
        var _ = this;

        _.socket.off();
        _.socket = null;
    },

    bindEvents: function bindEvents() {
        var _ = this;

        _.socket.on('scenario-start', function scenarioStart(data) {
            var step;

            _.socket.scenario = data;

            _.driver = new webdriver.Builder().forBrowser('firefox').build();

            for (var key in data.steps) {
                step = data.steps[key];
                _.steps.push(step);
            }

            _.run();
        });

        _.socket.on('quit', function quitDriver() {
            _.quit();
        });
    },

    quit: function quit() {
        var _ = this;

        if (_.driver) _.driver.quit();
        _.driver = null;
        _.steps.splice(0, _.steps.length);
    },

    run: function run() {
        var _ = this,
            step = _.steps.shift();

        if (!step) {
            if (_.driver) _.driver.quit();
            _.driver = null;
            _.socket.emit('scenario-finish', null, _.socket.scenario);
            return;
        }

        _.socket.emit('step-start', null, step);

        switch (step.action) {
        case 'visit':
            _.driver.get(step.target).then(function getSuccess() {
                _.stepComplete(null, step);
            }, function getError() {
                _.stepComplete('Could not visit "' + step.target + '".', step);
            });

            break;
        case 'click':
            _.findElement(step.target, function clickSuccess($el) {
                $el.click();
                _.stepComplete(null, step);
            }, function clickError() {
                _.stepComplete('Could not find "' + step.target + '".', step);
            });

            break;
        case 'fill':
            _.findElement(step.target, function fillSuccess($el) {
                $el.sendKeys(step.value);
                _.stepComplete(null, step);
            }, function fillError() {
                _.stepComplete('Could not find "' + step.target + '".', step);
            });

            break;
        case 'assert':
            _.findElement(step.target, function($el) {
                var attribute;

                switch (step.attribute) {
                case 'value':
                    attribute = $el.getAttribute('value');
                    /*falls through*/
                case 'content':
                    attribute = $el.getText();
                    attribute.then(function(value) {
                        _.compareAttribute(step, value);
                    });
                    break;
                default:
                    _.stepComplete('No attribute supplied.', step);
                }
            }, function() {
                _.stepComplete('Could not find "' + step.target + '".', step);
            });
            break;
        }
    },

    findElement: function findElement(target, success, error) {
        var _ = this,
            $el = _.driver.findElement({ css: target });

        $el.then(function() {
            success($el);
        }, error);
    },

    compareAttribute: function compareAttribute(step, value) {
        var _ = this;

        switch (step.matcher) {
        case 'is':
            if (value === step.value) {
                _.stepComplete(null, step);
            } else {
                _.stepComplete('Expected \'' + value + '\' to equal \'' + step.value + '\'.', step);
            }

            break;
        case 'is not':
            if (value !== step.value) {
                _.stepComplete(null, step);
            } else {
                _.stepComplete('Expected \'' + value + '\' to not equal \'' + step.value + '\'.', step);
            }

            break;
        case 'contains':
            if (value.indexOf(step.value) !== -1) {
                _.stepComplete(null, step);
            } else {
                _.stepComplete('Expected \'' + value + '\' to contain \'' + step.value + '\'.', step);
            }

            break;
        case 'does not contain':
            if (value.indexOf(step.value) === -1) {
                _.stepComplete(null, step);
            } else {
                _.stepComplete('Expected \'' + value + '\' to not contain \'' + step.value + '\'.', step);
            }

            break;
        default:
            _.stepComplete('Invalid matcher supplied.', step);
        }
    },

    stepComplete: function stepComplete(err, step) {
        var _ = this;

        setTimeout(function() {
            if (err || step) {
                _.socket.emit('step-finish', err, step);
            }

            if (err) {
                _.steps.splice(0, _.steps.length);
            }

            _.run();
        }, _.socket.scenario.options && _.socket.scenario.options.delay || 0);
    },
});

module.exports = App;

if (!module.parent) {
    App.create().init();
}
