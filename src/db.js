import mongoist from 'mongoist';
import fs from 'fs';
import { promisify } from 'util';

const readDir = promisify(fs.readdir);

export const dataAll = {};
export const dataGuilds = {};
export const dataMembersAll = {};
export const watchlist = [];

let dbPromiseResolve;

export const dbPromise = new Promise((resolve) => {
    dbPromiseResolve = resolve;
});

export const db = mongoist('mongodb://localhost:27017/eris', { useNewUrlParser: true });

// Emitted if no db connection could be established
db.on('error', (err) => {
    console.log('> Database error:', err);
});

// Emitted if a db connection was established
// promise for on connect
db.on('connect', () => {
    console.log('Database connected');
    dbPromiseResolve(true);
});

db.runCommand({ ping: 1 });

const readyQueryPromise = async (obj, queryMethod) => {
    try {
        await queryMethod();
    } catch (err) {
        obj._error = err;
        console.log('Database query error:', obj, '|', err);
    }
    obj._ready = true;
};

export const readyQuery = (obj, queryMethod) => {
    obj._readyPromise = readyQueryPromise(obj, queryMethod);
};

export const fetchProp = (obj, guildId, defaultVal = {}) => {
    const objGuild = obj[guildId];

    if (objGuild) return objGuild;

    obj[guildId] = defaultVal;

    return obj[guildId];
};

export const saveDump = (obj, name, dir = './data/') => {
    const dump = JSON.stringify(obj);

    const stream = fs.createWriteStream(dir + name);
    stream.once('open', () => {
        stream.write(dump);
        stream.end();
        console.log(`Saved ${name} dump`);
    });
};

export const loadDump = async (name, dir = './data/') => {
    try {
        const { err } = await readDir(dir + name);
        if (err) {
            throw new Error(err);
        }
    } catch (err) {
        console.log('[ERROR_LoadDump]', err);
    }

    fs.readFile(dir + name, 'utf-8', (err, data) => {
        if (err) throw err;

        if (data.length > 0) {
            const tempObj = JSON.parse(data);
        }
    });
};

export const defaultGuild = guild => ({ guildId: guild.id, guildName: guild.name, expEnabled: true });
export const defaultMember = member => ({ guildId: member.guild.id, userId: member.id, exp: 0 });

// export const syncDb = (obj, collection, indexes) => {};

// export const setData = ({ collection, guild, field, value }) => {
//     if (guild) {
//         db[collection].update({ guildId: guild.id }, { [field]: value });
//     }
// };

console.log('Set up database');
