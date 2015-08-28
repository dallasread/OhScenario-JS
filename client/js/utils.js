function UUID() {
    var d = new Date().getTime();
    var L = UUID.chars.length;
    return UUID.sequence.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*L)%L | 0;
        d = Math.floor(d/L);
        return UUID.chars[(c === 'x' ? r : (r&0x3|0x8))];
    });
}

UUID.sequence = 'xxxxyxxxxyxxxxyxxxx';
UUID.chars = '1234567890abcdef';

module.exports = {
    UUID: UUID
};
