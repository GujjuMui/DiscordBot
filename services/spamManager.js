let running = false;

module.exports = {

    start() {
        running = true;
    },

    stop() {
        running = false;
    },

    isRunning() {
        return running;
    }

};