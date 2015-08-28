module.exports = {
    is: function is(a, b, options) {
        if (a === b) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    },
    isnt: function isnt(a, b, options) {
        if (a !== b) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    },
    or: function or(a, b, options) {
        if (a || b) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    },
    any: function any() {
        var args = [];

        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        var options = args.splice(args.length - 1)[0];
        var field = args.splice(0, 1);

        for (i = 0; i < args.length; i++) {
            if (args[i] + '' === field + '') {
                return options.fn(this);
            }
        }

        return options.inverse(this);
    },
    capitalize: function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
};
