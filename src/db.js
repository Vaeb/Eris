import mongoist from 'mongoist';
import nodeUtil from 'util';
import dateformat from 'dateformat';

console.log('\n> Scheduler bot starting...');

const db = mongoist('niimp_now');

// Emitted if no db connection could be established
db.on('error', (err) => {
    console.log('> Database error:', err);
});

// Emitted if a db connection was established
db.on('connect', () => {
    console.log('> Database connected');
});

console.logCopy = console.log.bind(console);

console.log = function log(...args) {
    if (!args.length) return this.logCopy();

    const nowDate = new Date();
    // nowDate.setHours(nowDate.getHours() + 1);

    let out = nodeUtil.format(...args);

    if (out.slice(0, 2) === '> ') out = `\n${out}`;

    let outIndex = out.search(/[^\n\r]/g);
    if (outIndex === -1) outIndex = 0;

    out = out.slice(0, outIndex) + dateformat(nowDate, '| dd/mm/yyyy | HH:MM | ') + out.slice(outIndex);

    return this.logCopy(out);
};

console.log('Set up database');

export default db;
