import { Client } from 'discord.js';
import glob from 'glob';
import path from 'path';

import db from './db';
import parseParamCombos from './parseParams';

export const watchlist = [];

const fetchWatchlist = async () => {
    try {
        const seriesNames = await db.watchlist.find();
        watchlist.push(...seriesNames.map(({ series_name: seriesName }) => seriesName));
    } catch (err) {
        console.log('Database query error:', err);
    }
    watchlist._ready = true;
};

watchlist._ready = false;
watchlist._readyPromise = fetchWatchlist();

export const client = new Client({
    disabledEvents: ['TYPING_START'],
    // fetchAllMembers: true,
    disableEveryone: true,
});

export const commands = [];

export const colors = {
    green: 0x00e676,
    blue: 0x00bcd4,
    pink: 0xd062d8,
    red: 0xd63031,
    yellow: 0xf39c12,
};

export const prefix = '==';
export const vaebId = '107593015014486016';
export const selfId = '469495067506376704';
export const defInline = true;

export const noChar = '­';

export const setupCommands = () => {
    const defaultParse = ({ str }) => str;
    // const defaultParseFail = () => 'Incorrect value';
    const defaultParseFail = ({ str, param: { name } }) => `"${str}" is not a valid ${name}`;
    const defaultPermissions = () => true;

    glob.sync('./src/modules/**/*.js').forEach((file) => {
        const filePath = path.resolve(file);
        const command = require(filePath).default;

        if (!command) {
            console.log('Command data not found:', file);
            return;
        }

        command.name = command.cmds[0];
        if (!command.desc) command.desc = 'Command description not provided';
        if (!command.checkPermissions) command.checkPermissions = defaultPermissions;

        command.params.forEach((paramData, index) => {
            paramData.id = index;
            if (!paramData.desc) paramData.desc = 'Parameter description not provided';
            if (!paramData.types) paramData.types = [];
            if (!paramData.examples) paramData.examples = [];
            if (!paramData.parse) paramData.parse = defaultParse;
            if (!paramData.parseFail) paramData.parseFail = defaultParseFail;
        });

        command.paramCombos = parseParamCombos(command.params);

        command.minArgs = command.paramCombos.length
            ? command.paramCombos.reduce((nowNum, params) => Math.min(nowNum, params.length), Infinity)
            : 0;
        // console.log(`Built command: ${command.name}`);
        commands.push(command);
    });
};

console.log('Set up shared data');
