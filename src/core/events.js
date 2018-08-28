import { client, newUsers, xpCooldown } from '../setup';
import { db, fetchProp, dataAll, dataGuilds, dataMembersAll, defaultGuild, defaultMember } from '../db';
import { newMessage, delMessage } from './messageHandler';
import { onError } from '../util';
import { memberRoleCacheAll } from '../expRoles';

export const ready = client.on('ready', () => {
    console.log(`> Connected as ${client.user.username}`);
});

export const disconnect = client.on('disconnect', (closeEvent) => {
    console.log('> Disconnected:', closeEvent);
});

export const reconnecting = client.on('reconnecting', () => {
    console.log('> Reconnecting...');
});

export const resume = client.on('resume', (replayed) => {
    console.log(`> Websocket resumed (${replayed})`);
});

export const warn = client.on('warn', (warning) => {
    console.log('> DiscordJS warning:', warning);
});

export const errorWS = client.on('error', (err) => {
    console.log('> WebSocket error:', err.error);
});

export const guildCreate = client.on('guildCreate', async (guild) => {
    console.log(`> Joined guild ${guild.name}`);

    const guildData = fetchProp(dataGuilds, guild.id, defaultGuild(guild));
    guildData.guildName = guild.name;

    try {
        await db.guilds.update(
            { guildId: guild.id },
            { $set: { guildName: guild.name }, $setOnInsert: defaultGuild(guild) },
            { upsert: true, multi: false },
        );
    } catch (err) {
        onError(err, 'JoinGuildUpdate');
    }

    console.log('Synced new guild');

    try {
        guild = await guild.fetchMembers();

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
        onError(err, `NewGuildFetchMembers_${guild.name}`);
    }

    console.log('Synced new guild members');
});

export const guildMemberAdd = client.on('guildMemberAdd', async (member) => {
    const { guild } = member;

    if (memberRoleCacheAll[guild.id]) {
        memberRoleCacheAll[guild.id][member.id] = undefined;
    }

    const dataMembers = fetchProp(dataMembersAll, guild.id);
    fetchProp(dataMembers, member.id, defaultMember(member));

    newUsers.push(member.id);

    setTimeout(() => {
        newUsers.splice(newUsers.indexOf(member.id), 1);
    }, xpCooldown);

    try {
        await db.members.update(
            { guildId: guild.id, userId: member.id },
            { $setOnInsert: defaultMember(member) },
            { upsert: true, multi: false },
        );
    } catch (err) {
        onError(err, 'GuildMemberAdd_Update');
    }

    console.log(`Synced new ${guild.name} member ${member.user.username} to db`);
});

export const messageDelete = client.on('messageDelete', (msgObj) => {
    if (!msgObj.guild || !dataAll._ready) return;
    delMessage(msgObj);
});

export const message = client.on('message', (msgObj) => {
    if (!msgObj.guild || !msgObj.member || !dataAll._ready) return;
    newMessage(msgObj);
});

console.log('Ran events module');
