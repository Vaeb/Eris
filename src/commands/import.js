import request from 'request-promise-native';

import { client } from '../setup';
import { sendEmbed, print, onError } from '../util';
import { requiresDev } from '../permissions';

const makeOverwrite = (guild, { type, name, allow, deny }) => ({
    id: type === 'role' ? guild.roles.find(r => r.name === name).id : name,
    type,
    allow,
    deny,
});

export default {
    cmds: ['import', 'import server', 'import guild', 'download', 'download server', 'download guild'],
    desc: "Import a server's data",
    params: [
        {
            name: 'Paste ID',
            desc: 'The ID of a paste on Pastebin (can be found in the page URL)',
            types: ['Text'],
            examples: [['GzI0dchF']],
            parse: ({ str }) => (/\s/.test(str) ? undefined : str),
        },
        {
            name: 'New server',
            desc: 'Whether to generate a new server or use the current one',
            types: ['Boolean'],
            examples: [['True', 'False']],
            optional: true,
            parse: ({ str }) => !!/^(?:true|yes|y|new)$/i.test(str),
            defaultResolve: () => false,
        },
    ],

    checkPermissions: [requiresDev],

    func: async ({ guild, channel: printChannel, args: [pasteId, isNew] }) => {
        // Note: Role positions will only auto-increment if you manually set the the position property when you create a new role

        const guildDataString = await request.get(`https://pastebin.com/raw/${pasteId}`);
        const guildData = JSON.parse(guildDataString);

        guildData.roles.sort(({ position: a }, { position: b }) => b - a);
        guildData.channels.sort(({ position: a }, { position: b }) => a - b);

        // const oldGuild = guild;

        if (isNew) {
            guild = await client.user.createGuild(guildData.name, guildData.region, guildData.iconURL);
            guild.channels.forEach((c) => {
                c.delete().catch(err => console.log('Failed to delete channel', c, err));
            });
            guild.roles.filter(r => r.name !== '@everyone').forEach((r) => {
                r.delete().catch(err => console.log('Failed to delete role', r, err));
            });
        }

        console.log('Importing...', isNew);

        // Create roles

        for (let i = 0; i < guildData.roles.length; i++) {
            const roleData = guildData.roles[i];

            const existingRole = guild.roles.find(role => role.name === roleData.name);

            if (!existingRole) {
                try {
                    console.log('123creating', roleData.name);
                    // eslint-disable-next-line no-await-in-loop
                    await guild.createRole({
                        name: roleData.name,
                        color: roleData.hexColor,
                        hoist: roleData.hoist,
                        permissions: roleData.permissions,
                        mentionable: roleData.mentionable,
                        position: 1,
                    });
                    console.log('created', roleData.name);
                } catch (err) {
                    console.log('Failed to create role:', err, '|', roleData);
                }
            } else {
                try {
                    console.log('123updating', roleData.name);
                    // eslint-disable-next-line no-await-in-loop
                    if (existingRole.hexColor !== roleData.hexColor) await existingRole.setColor(roleData.hexColor); // No Promise.all due to ratelimit discord api issues
                    // eslint-disable-next-line no-await-in-loop
                    if (existingRole.hoist !== roleData.hoist) await existingRole.setHoist(roleData.hoist);
                    // eslint-disable-next-line no-await-in-loop
                    if (existingRole.mentionable !== roleData.mentionable) await existingRole.setMentionable(roleData.mentionable);
                    // eslint-disable-next-line no-await-in-loop
                    if (existingRole.permissions !== roleData.permissions) await existingRole.setPermissions(roleData.permissions);
                    // eslint-disable-next-line no-await-in-loop
                    await existingRole.setPosition(1);
                    console.log('updated', roleData.name);
                } catch (err) {
                    console.log('Failed to update role:', err, '|', roleData);
                }
            }
        }

        console.log('Created roles');

        // // Set role positions

        // await Promise.all(guildData.roles.map(async (roleData) => {
        //     try {
        //         guild.setRolePosition(guild.roles.find(r => r.name === roleData.name), roleData.position);
        //     } catch (err) {
        //         console.log('Failed to set role positions', err, '|', roleData);
        //     }
        // }));

        // console.log('Set role positions');

        // return;

        // Create channels

        await Promise.all(guildData.channels.map(async (channelData) => {
            const existingChannel = guild.channels.find(channel => channel.name === channelData.name);

            if (!existingChannel) {
                try {
                    await guild.createChannel(
                        channelData.name,
                        channelData.type,
                        channelData.permissionOverwrites
                            .map((overwrite) => {
                                if (overwrite.type === 'role' && !guild.roles.find(r => r.name === overwrite.name)) {
                                    console.log('Failed to create channel overwrite (missing role):', overwrite.name, '|', channelData);
                                    return undefined;
                                }
                                return makeOverwrite(guild, overwrite);
                            })
                            .filter(o => o !== undefined),
                    );
                } catch (err) {
                    console.log('Failed to create channel:', err, '|', channelData);
                }
            }
        }));

        console.log('Created channels');

        // Set channel positions

        try {
            await guild.setChannelPositions(guildData.channels.map(channelData => ({
                channel: guild.channels.find(channel => channel.name === channelData.name).id,
                position: channelData.position,
            })));
        } catch (err) {
            console.log('Failed to set channel positions:', err);
        }

        console.log('Set channel positions');

        // Set channel properties

        for (let i = 0; i < guildData.channels.length; i++) {
            const channelData = guildData.channels[i];
            try {
                const channel = guild.channels.find(c => c.name === channelData.name);

                // eslint-disable-next-line no-await-in-loop
                if (channelData.topic && channel.topic !== channelData.topic) await channel.setTopic(channelData.topic);
                // eslint-disable-next-line no-await-in-loop
                if (channelData.nsfw && channel.nsfw !== channelData.nsfw) await channel.setNSFW(channelData.nsfw);
                // eslint-disable-next-line no-await-in-loop
                if (channelData.bitrate && channel.bitrate !== channelData.bitrate) await channel.setBitrate(channelData.bitrate);
                // eslint-disable-next-line no-await-in-loop
                if (channelData.userLimit && channel.userLimit !== channelData.userLimit) await channel.setUserLimit(channelData.userLimit);
                if (channelData.parentName) {
                    const parentChannel = guild.channels.find(c => c.type === 'category' && c.name === channelData.parentName);
                    if (parentChannel) {
                        if (channel.parentID !== parentChannel.id) {
                            // eslint-disable-next-line no-await-in-loop
                            await channel.setParent(parentChannel.id);
                        }
                    } else {
                        console.log('Parent channel not found', channelData.parentName, parentChannel);
                    }
                }
            } catch (err) {
                console.log('Failed to set channel properties:', err);
            }
        }

        console.log('Set channel properties');

        // Set guild properties

        try {
            await Promise.all([
                // If it fails, do them one-by-one
                // guild.setAfkTimeout(guildData.afkTimeout),
                guild.setExplicitContentFilter(guildData.explicitContentFilter),
                guild.setIcon((guildData.iconURL || '').replace(/\.jpg$/, '.png')),
                guild.setName(guildData.name),
                guild.setRegion(guildData.region),
                guild.setSplash(guildData.splashURL),
                guild.setVerificationLevel(guildData.verificationLevel),
                guild.setAFKChannel(guild.channels.find(channel => channel.name === guildData.afkChannelName)),
                guild.setSystemChannel(guild.channels.find(channel => channel.name === guildData.systemChannelName)),
            ]);
        } catch (err) {
            console.log('Failed to set guild property:', err);
        }

        console.log('Set guild properties');

        console.log('Import complete');

        sendEmbed(printChannel, 'Success', 'Imported guild data').then(async () => {
            if (!isNew) return;
            const firstChannel =
                guild.channels.find(c => c.type === 'text' && c.name === 'rules') || guild.channels.find(c => c.type === 'text');
            console.log('Making channel for:', firstChannel.name, 'in', guild.id);
            const invite = await firstChannel.createInvite({ temporary: false, maxAge: 0, maxUses: 0, unique: false });
            // const invite = await firstChannel.createInvite();
            print(printChannel, invite);
        });
    },
};
