import mongoist from 'mongoist';

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

console.log('Set up database');

export default db;
