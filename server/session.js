var Generator = require('generate-js'),
    webdriver = require('selenium-webdriver');

var Session = Generator.generate(function Session(socket) {
    var _ = this;

    _.defineProperties({
        socket: socket,
        steps: []
    });

    _.socket.on('scenario-start', function scenarioStart(scenario) {
        var step, key;

        _.quit(function() {
            _.scenario = scenario;

            _.driver = new webdriver
                .Builder()
                .usingServer(_.socket.phantom.address())
                .withCapabilities({ 'browserName': 'phantomjs' })
                .build();

            for (key in _.scenario.steps) {
                step = _.scenario.steps[key];
                _.steps.push(step);
            }

            _.runNextStep();
        });
    });

    _.socket.on('quit', function quitDriver(done) {
        _.quit(function() {
            done && done();
        });
    });
});

Session.definePrototype({
    quit: function quit(done) {
        var _ = this;

        _.steps.splice(0, _.steps.length);

        if (_.driver) {
            _.driver.close().then(function() {
                _.driver = null;
                done && done();
            });
        } else {
            done && done();
        }
    },

    runNextStep: function runNextStep() {
        var _ = this,
            step = _.steps.shift();

        if (!step) {
            _.quit(function() {
                _.socket.emit('scenario-finish', null, _.scenario);
            });

            return;
        }

        _.socket.emit('step-start', null, step);

        switch (step.action) {
        case 'visit':
            _.driver.get(step.target).then(function getSuccess() {
                _.stepComplete(null, step);
            }, function getError() {
                _.stepComplete('Could not visit "' + step.target + '".', step);
            }, function getCatch() {
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
                $el.getAttribute('type').then(function(type) {
                    if (type !== 'hidden') {
                        $el.sendKeys(step.value);
                        _.stepComplete(null, step);
                    } else {
                        _.stepComplete('The target field, "' + step.target + '", is hidden.', step);
                    }
                });
            }, function fillError() {
                _.stepComplete('Could not find "' + step.target + '".', step);
            });

            break;
        case 'assert':
            _.findElement(step.target, function assertSuccess($el) {
                var attribute;

                switch (step.attribute) {
                case 'value':
                    attribute = $el.getAttribute('value');
                    /*falls through*/
                case 'content':
                    attribute = $el.getText();
                    attribute.then(function(value) {
                        _.compareAttribute(step, value);
                    }, function() {
                        _.stepComplete('Could not find "' + step.target + '".', step);
                    }).thenCatch(function() {});
                    break;
                default:
                    _.stepComplete('No attribute supplied.', step);
                }
            }, function assertError() {
                _.stepComplete('Could not find "' + step.target + '".', step);
            });
            break;
        }
    },

    findElement: function findElement(target, success, error) {
        var _ = this,
            $el = _.driver.findElement({ css: target });

        $el.then(function foundElement() {
            success($el);
        }).thenCatch(function() {
            error && error();
        });
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
                _.quit(function() {
                    _.runNextStep();
                });
            } else {
                _.runNextStep();
            }
        }, _.scenario.delay || 0);
    },
});

module.exports = Session;
