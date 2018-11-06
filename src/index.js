import cluster from 'cluster';

const maxRestarts = 99;
let numRestarts = 0;

if (cluster.isMaster) {
    cluster.fork();

    cluster.on('exit', (/* worker, code, signal */) => {
        if (++numRestarts >= maxRestarts) return;
        cluster.fork();
    });
}

if (cluster.isWorker) {
    process.on('uncaughtException', (err) => {
        console.log('Process Errored (Uncaught Exception):', err);
        console.log('Restarting...');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled Promise Rejection at:', p);
        console.log('Reason:', reason);
    });

    require('./worker');
}
