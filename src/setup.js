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

export const activity = {
    [definedGuilds.vashta]: {
        '107593015014486016': { tracking: true, stamps: [] },
        '126710973737336833': { tracking: true, stamps: [] },
        '416346725515657226': { tracking: true, stamps: [] },
        '117279827974815745': { tracking: true, stamps: [] },
        '359479072436256779': { tracking: true, stamps: [] },
        '289078328835702784': { tracking: true, stamps: [] },
        '138274235435974656': { tracking: true, stamps: [] },
        '119203482598244356': { tracking: true, stamps: [] },
        '241730719427067904': { tracking: true, stamps: [] },
        '483289804910624768': { tracking: true, stamps: [] },
        '265924700738158593': { tracking: true, stamps: [] },
        '219140836930093056': { tracking: true, stamps: [] },
        '190210963922747393': { tracking: true, stamps: [] },
    },
};

export const minExp = 10;
export const maxExp = 20;
export const expEnabled = true;

export const prefix = '.';
export const vaebId = '107593015014486016';
export const selfId = '469495067506376704';
export const defInline = true;

export const xpCooldown = 1000 * 60;

export const noChar = '­';
export const charLimit = 1949;

export const newUsers = [];

console.log('Set up shared data');
