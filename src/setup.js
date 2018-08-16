import nodeUtil from 'util';
import { Client } from 'discord.js';
import dateformat from 'dateformat';

console.log('\n> Scheduler bot starting...\n');

console.logCopy = console.log.bind(console);

console.log = (...args) => {
    if (!args.length) return console.logCopy();

    const nowDate = new Date();
    // nowDate.setHours(nowDate.getHours() + 1);

    let out = nodeUtil.format(...args);

    if (out.slice(0, 2) === '> ') out = `\n${out}`;

    let outIndex = out.search(/[^\n\r]/g);
    if (outIndex === -1) outIndex = 0;

    out = out.slice(0, outIndex) + dateformat(nowDate, '| dd/mm/yyyy | HH:MM | ') + out.slice(outIndex);

    return console.logCopy(out);
};

export const client = new Client({
    disabledEvents: ['TYPING_START'],
    // fetchAllMembers: true,
    disableEveryone: true,
});

export const commands = [];

export const definedGuilds = {
    vashta: '477270527535480834',
    cafedev: '455405043898646543',
};

export const colors = {
    green: 0x00e676,
    blue: 0x00bcd4,
    pink: 0xd062d8,
    red: 0xd63031,
    yellow: 0xf39c12,
};

export const minExp = 10;
export const maxExp = 20;

export const prefix = '.';
export const vaebId = '107593015014486016';
export const selfId = '469495067506376704';
export const defInline = true;

export const xpCooldown = 1000 * 60;

export const noChar = '­';
export const charLimit = 1949;

export const newUsers = [];

console.log('Set up shared data');
