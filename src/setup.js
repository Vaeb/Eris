import { Client } from 'discord.js';
import glob from 'glob';
import path from 'path';

import { db, readyQuery, fetchProp } from './db';
import parseParamCombos from './parseParams';

export const dataAll = {};
export const dataGuilds = {};
export const dataMembersAll = {};
export const watchlist = [];

readyQuery(dataGuilds, async () => {
    const dataGuildsDocs = await db.guilds.find();

    dataGuildsDocs.forEach((guildData) => {
        const { guildId } = guildData;

        dataGuilds[guildId] = guildData;
    });

    console.log('Fetched initial guild data');
});

readyQuery(dataMembersAll, async () => {
    const dataMembersDocs = await db.members.find();

    dataMembersDocs.forEach((memberData) => {
        const { guildId, userId } = memberData;

        if (!dataMembersAll[guildId]) dataMembersAll[guildId] = {};

        dataMembersAll[guildId][userId] = memberData;
    });

    console.log('Fetched initial member data');
});

readyQuery(watchlist, async () => {
    const seriesNames = await db.watchlist.find();
    watchlist.push(...seriesNames.map(({ series_name: seriesName }) => seriesName));
});

export const client = new Client({
    disabledEvents: ['TYPING_START'],
    // fetchAllMembers: true,
    disableEveryone: true,
});

export const commands = [];

export const definedServers = {
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

export const prefix = '==';
export const vaebId = '107593015014486016';
export const selfId = '469495067506376704';
export const defInline = true;

export const noChar = '­';

export const setupCommands = () => {
    const defaultParse = ({ str }) => str;
    // const defaultParseFail = () => 'Incorrect value';
    const defaultParseFail = ({ str, param: { name, examples } }) => {
        const exampleStr = examples
            .slice(0, 3)
            .map(typeExamples =>
                typeExamples
                    .slice(0, 2)
                    .map(example => `"${example}"`)
                    .join(' or '))
            .join(' or ');
        const exampleStrUse = exampleStr.length ? ` - a correct argument could be something like ${exampleStr}` : '';
        return `"${str}" is not a valid ${name}${exampleStrUse}`;
    };
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
        if (!command.params) command.params = [];
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

const onError = (err, context = 'Unspecified', noLog) => {
    const errContext = `[ Caught_${context} ]`;

    if (!noLog) return console.log(`[ Caught_${context} ]`, err);

    return errContext;
};

export const defaultGuild = guild => ({ guildId: guild.id, guildName: guild.name, expEnabled: true });
export const defaultMember = member => ({ guildId: member.guild.id, userId: member.id, exp: 0 });

export const setupMembers = async () => {
    try {
        if (!dataMembersAll._ready) await dataMembersAll._readyPromise;
        if (!dataGuilds._ready) await dataGuilds._readyPromise;

        await Promise.all(client.guilds.map(async (guild) => {
            const guildData = fetchProp(dataGuilds, guild.id);
            guildData.guildName = guild.name;

            const { guildName, ...defaultGuildObj } = defaultGuild(guild);

            await db.guilds.update(
                { guildId: guild.id },
                { $set: { guildName }, $setOnInsert: defaultGuildObj },
                { upsert: true, multi: false },
            );
        }));

        console.log('Synced guilds');

        await Promise.all(client.guilds.map(async (guildOrig) => {
            try {
                const guild = await guildOrig.fetchMembers();

                const dataMembers = fetchProp(dataMembersAll, guild.id);

                const newMembers = guild.members.filter(member => !dataMembers[member.id]).map(defaultMember);

                if (newMembers.length > 0) {
                    const bulk = db.members.initializeUnorderedBulkOp();

                    newMembers.forEach((memberDoc) => {
                        bulk.insert(memberDoc);
                    });

                    try {
                        await bulk.execute();
                        console.log(`Synced ${newMembers.length} new members for ${guild.name}`);
                    } catch (err) {
                        onError(err, 'BulkInsertNewMembers_Query');
                    }
                }
            } catch (err) {
                onError(err, `InitFetchMembers_${guildOrig.name}`);
            }
        }));

        console.log('Synced members');
    } catch (err) {
        onError(err, 'InitSetupGuilds');
    }

    console.log('Fetched all data');

    dataAll._ready = true;
};

console.log('Set up shared data');
