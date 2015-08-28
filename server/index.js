var app = require('http').createServer(),
    io = require('socket.io')(app),
    Session = require('./session');

app.listen(8111);

var Generator = require('generate-js');

var App = Generator.generate(function App() {});

App.definePrototype({
    init: function init() {
        var _ = this;

        io.on('connection', function connection(socket) {
            Session.create(socket);

            io.on('disconnect', function disconnect() {
                socket.off();
            });
        });
    }
});

module.exports = App;

if (!module.parent) {
    App.create().init();
}
