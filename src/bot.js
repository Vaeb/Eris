import glob from 'glob';
import path from 'path';

import { client, commands } from './setup';
import { db, dbPromise, readyQuery, dataGuilds, dataMembersAll, dataAll, defaultGuild, defaultMember, watchlist } from './db';
import { discordToken } from './auth';
import { onError } from './util';
import parseParamCombos from './parseParams';
import { expRolesInit } from './expRoles';

import './core/events';

const maxAttempts = 3;

const setupCommands = () => {
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

    glob.sync('./src/commands/**/*.js').forEach((file) => {
        const filePath = path.resolve(file);
        const command = require(filePath).default;

        if (!command) {
            console.log('Command data not found:', file);
            return;
        }

        command.name = command.cmds[0];
        if (!command.desc) command.desc = 'Command description not provided';
        if (!command.params) command.params = [];
        if (!command.checkPermissions) command.checkPermissions = [defaultPermissions];

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

const setupMembers = async () => {
    try {
        // if (!dataMembersAll._ready) await dataMembersAll._readyPromise;
        // if (!dataGuilds._ready) await dataGuilds._readyPromise;

        let numSyncedGuilds = 0;

        await Promise.all(client.guilds.cache.map(async (guild) => {
            // const guildData = fetchProp(dataGuilds, guild.id);
            // guildData.guildName = guild.name;

            const { guildName, ...defaultGuildObj } = defaultGuild(guild);

            await db.guilds.update(
                { guildId: guild.id },
                { $set: { guildName }, $setOnInsert: defaultGuildObj },
                { upsert: true, multi: false },
            );

            numSyncedGuilds++;
        }));

        console.log(`Synced ${numSyncedGuilds} guilds to db`);

        let numSyncedMembers = 0;

        await Promise.all(client.guilds.cache.map(async (guild) => {
            try {
                console.log('Updating', guild.name);
                const guildMembers = await guild.members.fetch();
                console.log('Got members', guild.name, guildMembers.size);

                await Promise.all(guildMembers.map(async (member) => {
                    const defaultMemberObj = defaultMember(member);

                    await db.members.update(
                        { guildId: guild.id, userId: member.id },
                        { $setOnInsert: defaultMemberObj },
                        { upsert: true, multi: false },
                    );

                    numSyncedMembers++;
                }));

                console.log('Done', guild.name);

                // const dataMembers = fetchProp(dataMembersAll, guild.id);

                // const newMembers = guild.members.cache.filter(member => !dataMembers[member.id]).map(defaultMember);

                // if (newMembers.length > 0) {
                //     const bulk = db.members.initializeUnorderedBulkOp();

                //     newMembers.forEach((memberDoc) => {
                //         bulk.insert(memberDoc);
                //     });

                //     try {
                //         await bulk.execute();
                //         console.log(`Synced ${newMembers.length} new members for ${guild.name}`);
                //     } catch (err) {
                //         onError(err, 'BulkInsertNewMembers_Query');
                //     }
                // }
            } catch (err) {
                onError(err, `InitFetchMembers_${guild.name}`);
            }
        }));

        console.log(`Synced ${numSyncedMembers} members to db`);
    } catch (err) {
        onError(err, 'InitSetupGuilds');
    }
};

const init = async (attempts = 1) => {
    try {
        await client.login(discordToken);
    } catch (err) {
        onError(err, 'DiscordLogin');

        if (attempts < maxAttempts) {
            init(attempts + 1);
        } else {
            console.log(`Failed to login after ${attempts} attempts`);
        }

        return;
    }

    await dbPromise;

    console.log('> Syncing data');

    await setupMembers();

    readyQuery(dataGuilds, async () => {
        const dataGuildsDocs = await db.guilds.find();

        dataGuildsDocs.forEach((guildData) => {
            const { guildId } = guildData;

            dataGuilds[guildId] = guildData;
        });

        console.log(`Fetched ${dataGuildsDocs.length} guilds from db`);
    });

    readyQuery(dataMembersAll, async () => {
        const dataMembersDocs = await db.members.find();

        dataMembersDocs.forEach((memberData) => {
            const { guildId, userId } = memberData;

            if (!dataMembersAll[guildId]) dataMembersAll[guildId] = {};

            dataMembersAll[guildId][userId] = memberData;
        });

        console.log(`Fetched ${dataMembersDocs.length} members from db`);
    });

    readyQuery(watchlist, async () => {
        const seriesNames = await db.watchlist.find();
        watchlist.push(...seriesNames.map(({ series_name: seriesName }) => seriesName));
    });

    if (!dataMembersAll._ready) await dataMembersAll._readyPromise;
    if (!dataGuilds._ready) await dataGuilds._readyPromise;

    dataAll.setReady();

    console.log('Finished syncing data');

    setupCommands();

    expRolesInit();
};

init();
