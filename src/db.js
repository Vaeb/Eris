import mongoist from 'mongoist';
import { promises as fs } from 'fs';
// import { promisify } from 'util';

const { readFile, writeFile } = fs;

export const dataAll = {};
export const dataGuilds = {};
export const dataMembersAll = {};
export const watchlist = [];

let dataAllResolve;

dataAll._readyPromise = new Promise((resolve) => {
    dataAllResolve = resolve;
});

dataAll.setReady = () => {
    dataAll._ready = true;
    dataAllResolve();
};

const tempTest = async () => {
    if (!dataAll._ready) await dataAll._readyPromise;
    console.log('temp test ran');
};

tempTest();

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

export const saveDump = async (obj, name, dir = './src/data/') => {
    const dump = JSON.stringify(obj);

    try {
        await writeFile(dir + name, dump);
        console.log(`Saved ${name} dump`);
        return true;
    } catch (err) {
        console.log('[ERROR_SaveDump]', err);
        return false;
    }
};

export const loadDump = async (name, dir = './src/data/') => {
    try {
        const { data } = await readFile(dir + name, 'utf8');
        if (data.length > 0) return JSON.parse(data);

        return {};
    } catch (err) {
        console.log('[ERROR_LoadDump]', err);
    }

    return {}; // return null;
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
