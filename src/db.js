import mongoist from 'mongoist';

export const dataAll = {};
export const dataGuilds = {};
export const dataMembersAll = {};
export const watchlist = [];

let dbPromiseResolve;

export const dbPromise = new Promise((resolve) => {
    dbPromiseResolve = resolve;
});

export const db = mongoist('eris');

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

export const defaultGuild = guild => ({ guildId: guild.id, guildName: guild.name, expEnabled: true });
export const defaultMember = member => ({ guildId: member.guild.id, userId: member.id, exp: 0 });

export const syncDb = (obj, collection, indexes) => {};

// export const setData = ({ collection, guild, field, value }) => {
//     if (guild) {
//         db[collection].update({ guildId: guild.id }, { [field]: value });
//     }
// };

console.log('Set up database');
