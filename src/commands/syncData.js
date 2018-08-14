import { requiresDev } from '../permissions';

import { client } from '../setup';
import { db, fetchProp, dataGuilds, dataMembersAll, defaultGuild, defaultMember } from '../db';
import { print, onError } from '../util';

export default {
    cmds: ['sync-data', 'syncdata', 'updatedata'],
    desc: 'Force sync all guild data to db (and re-fetch)',

    checkPermissions: [requiresDev],

    func: async ({ channel }) => {
        console.log('> Syncing guilds');

        await Promise.all(client.guilds.map(async (guild) => {
            const { guildName, ...defaultGuildObj } = defaultGuild(guild);

            await db.guilds.updateOne({ guildId: guild.id }, { $set: { guildName }, $setOnInsert: defaultGuildObj }, { upsert: true });

            await Promise.all(Object.entries(defaultGuildObj).map(async ([fieldName, fieldValue]) => {
                await db.guilds.updateOne(
                    { guildId: guild.id, [fieldName]: { $exists: false } },
                    { $set: { [fieldName]: fieldValue } },
                    { upsert: false },
                );
            }));

            console.log(`Synced guild: ${guild.name}`);
        }));

        console.log('> Syncing members');

        await Promise.all(client.guilds.map(async (guildOrig) => {
            try {
                const guild = await guildOrig.fetchMembers();

                // const dataMembers = fetchProp(dataMembersAll, guild.id);

                await Promise.all(guild.members.map(async (member) => {
                    const defaultMemberObj = defaultMember(member);

                    await db.members.updateOne(
                        { guildId: guild.id, userId: member.id },
                        { $setOnInsert: defaultMemberObj },
                        { upsert: true },
                    );

                    await Promise.all(Object.entries(defaultMemberObj).map(async ([fieldName, fieldValue]) => {
                        await db.members.updateOne(
                            { guildId: guild.id, userId: member.id, [fieldName]: { $exists: false } },
                            { $set: { [fieldName]: fieldValue } },
                            { upsert: false },
                        );
                    }));

                    console.log(`Synced member: ${member.user.username}`);
                }));
            } catch (err) {
                onError(err, `UpdateMembers_${guildOrig.name}`);
            }
        }));

        console.log('> Re-fetching guilds');

        const dataGuildsDocs = await db.guilds.find();

        dataGuildsDocs.forEach((guildData) => {
            const { guildId } = guildData;

            dataGuilds[guildId] = guildData;
        });

        console.log('> Re-fetching members');

        const dataMembersDocs = await db.members.find();

        dataMembersDocs.forEach((memberData) => {
            const { guildId, userId } = memberData;

            if (!dataMembersAll[guildId]) dataMembersAll[guildId] = {};

            dataMembersAll[guildId][userId] = memberData;
        });

        console.log('Finished syncing');
        print(channel, 'Synced all data');
    },
};
