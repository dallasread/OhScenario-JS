var CustomElement = require('generate-js-custom-element'),
    Utils = require('./utils'),
    SocketIO = require('socket.io-client'),
    config = {
        templates: {
            index: require('../templates/scenario.hbs'),
            step: '{{> step}}'
        },
        partials: {
            step: require('../templates/step.hbs')
        },
        helpers: require('./handlebars'),
        interactions: {
            add: {
                event: 'click',
                target: '.editing .add-step',
                listener: function add(e, $el) {
                    var _ = this;

                    _.addStep({
                        action: 'fill',
                        target: '#email',
                        value: 'email@example.com'
                    }, true);

                    return false;
                }
            },
            remove: {
                event: 'click',
                target: '.editing .remove-step',
                listener: function add(e, $el) {
                    var _ = this;
                    _.removeStep($el.closest('.step').attr('data-id'));
                }
            },
            focus: {
                event: 'focus',
                target: '.editing select',
                listener: function focus(e, $el) {
                    $el.closest('p').addClass('hover');
                }
            },
            mouseout: {
                event: 'mouseout blur',
                target: '.editing p.has-select',
                listener: function focus(e, $el) {
                    $el.removeClass('hover');
                }
            },
            blur: {
                event: 'blur',
                target: '.editing select',
                listener: function focus(e, $el) {
                    $el.removeClass('hover');
                }
            },
            action: {
                event: 'change',
                target: '.editing .has-select select',
                listener: function act(e, $el) {
                    var _ = this,
                        step = $el.closest('.step'),
                        id = step.attr('data-id'),
                        name = $el.attr('name'),
                        selected = $el.find('option').not(function(){ return !this.selected; }),
                        textValue = selected.attr('data-value') || selected.val(),
                        select;

                    _.steps[id][name] = $el.val();

                    step = _.renderStep(id);
                    select = step.find('select[name="' + name + '"]');

                    select.closest('.has-select').find('.select-target').text(textValue);
                    select.get(0).focus();
                }
            },
            keydown: {
                event: 'keydown',
                target: '.editing [contenteditable]',
                listener: function act(e, $el) {
                    var keycode = (e.keyCode ? e.keyCode : e.which);
                    if (keycode === 13) return false;
                }
            },
            keyup: {
                event: 'keyup change blur',
                target: '.editing [contenteditable]',
                listener: function act(e, $el) {
                    var _ = this,
                        step = $el.closest('.step'),
                        id = step.attr('data-id'),
                        name = $el.attr('name');

                    _.steps[id][name] = $el.text();
                }
            },
            click: {
                event: 'click',
                target: '.editing .has-editable',
                listener: function(e, $el) {
                    $el.find('.editable').focus();
                }
            },
            run: {
                event: 'click',
                target: '.run-scenario',
                listener: function(e, $el) {
                    this.run();
                }
            },
            edit: {
                event: 'click',
                target: '.edit-scenario',
                listener: function(e, $el) {
                    this.edit();
                }
            }
        }
    };

var Scenario = CustomElement.generate(function Scenario($element, options) {
    var _ = this,
        steps = options.steps;

    delete options.steps;

    _.supercreate($element, config);
    _.defineProperties(options);

    _.url = _.$element.attr('data-run');
    _.steps = _.steps || {};
    _.delay = _.delay || 0;

    for (var key in steps) {
        steps[key].id = key;
        _.addStep(steps[key]);
    }

    _.render();
    _.$element.find('select').get(0).focus();
});

Scenario.definePrototype({
    run: function run() {
        var _ = this,
            step;

        _.$element.find('select').each(function() {
            config.interactions.action.listener.call(_, null, $(this));
        });

        _.$element.find('.scenario').attr('class', 'scenario running');
        _.$element.find('.step').attr('class', 'step waiting');
        _.$element.find('.steps .step:first-child').attr('class', 'step running');
        _.$element.find('[contenteditable]').removeAttr('contenteditable');

        console.log('Running Scenario', _.toJSON());

        if (_.socket) {
            _.socket.emit('scenario-start', _.toJSON());
            return;
        }

        _.socket = SocketIO(_.url);

        _.socket.on('disconnect', function(){
            alert('Something went wrong. The test did not complete.');
            _.socket.off();
            _.socket = null;
            _.render();
        });

        _.socket.once('connect', function() {
            _.socket.emit('scenario-start', _.toJSON());
        });

        _.socket.on('step-start', function(err, data) {
            console.log('step-start ~>', err, data);
            step = _.$element.find('.step[data-id="' + data.id + '"]');
            step.attr('class', 'step running');
        });

        _.socket.on('step-finish', function(err, data) {
            console.log('step-finish ~>', err, data);
            var scenario = _.$element.find('.scenario');

            if (scenario.hasClass('running')) {
                step = _.$element.find('.step[data-id="' + data.id + '"]');

                if (err) {
                    switch (err) {
                    case 'NoSuchElementError':
                        err = 'The element "' + data.target + '" was not found on the page.';
                        break;
                    case 'InvalidSelectorError':
                        err += ': Not sure what this one means!';
                        break;
                    }

                    step.attr('class', 'step error');
                    step.find('.error').text(err);
                } else {
                    step.attr('class', 'step success');
                }
            }
        });

        _.socket.on('scenario-finish', function(err, data) {
            console.log('scenario-finish ~>', err, data);
            var scenario = _.$element.find('.scenario');

            if (scenario.hasClass('running')) {
                scenario.attr('class', 'scenario success');
            }
        });
    },

    addStep: function addStep(step, focus) {
        var _ = this;

        step.id = step.id || Utils.UUID();

        _.steps[step.id] = step;

        var html = $(_.templates.step(step));

        _.$element.find('.steps').append( html );

        if (focus) {
            html.find('select').get(0).focus();
        }
    },

    renderStep: function renderStep(id) {
        var _ = this,
            step = _.steps[id];

        step.id = id;

        var html = $(_.templates.step(step));

        _.$element.find('.step[data-id="' + id + '"]').replaceWith( html );

        return html;
    },

    removeStep: function removeStep(id) {
        var _ = this;

        _.$element.find('.step[data-id="' + id + '"]').remove();
        delete _.steps[id];
    },

    edit: function edit() {
        var _ = this;

        _.render();

        if (_.socket) {
            _.$element.css('opacity', 0.5);

            _.socket.emit('quit', function() {
                _.$element.css('opacity', 1);
                _.render();
                _.$element.find('select').get(0).focus();
            });
        }
    },

    toJSON: function toJSON() {
        var _ = this;

        return {
            steps: _.steps,
            delay: _.delay
        };
    },
});

module.exports = Scenario;
