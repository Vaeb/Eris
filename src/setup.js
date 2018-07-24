import { Client } from 'discord.js';
import glob from 'glob';
import path from 'path';

import parseParamCombos from './parseParams';

console.log('\nScheduler bot starting...');

export const client = new Client({
    disabledEvents: ['TYPING_START'],
    // fetchAllMembers: true,
    disableEveryone: true,
});

export const commands = [];

const defaultParse = ({ str }) => str;
const defaultPermissions = () => true;

glob.sync('./src/modules/**/*.js').forEach((file) => {
    const filePath = path.resolve(file);
    const command = require(filePath).default;
    if (!command) {
        console.log('Command data not found:', file);
        return;
    }
    command.name = command.cmds[0];
    if (!command.checkPermissions) command.checkPermissions = defaultPermissions;
    command.params.forEach((paramData, index) => {
        paramData.id = index;
        if (!paramData.parse) paramData.parse = defaultParse;
    });
    command.paramCombos = parseParamCombos(command.params);
    command.minArgs = command.paramCombos.reduce((nowNum, params) => Math.min(nowNum, params.length), Infinity);
    console.log(`Built command: ${command.name}`);
    commands.push(command);
});

export const colors = { green: 0x00e676, blue: 0x00bcd4, pink: 0xd062d8 };

export const prefix = '==';
export const vaebId = '107593015014486016';
export const selfId = '469495067506376704';
export const defInline = true;

export const noChar = '­';

console.log('Fetched setup data');
