import { getValuesFromObj, pastebinPost, getDateString, sendEmbed } from '../util';
import { requiresDev } from '../permissions';

const parsePermissionOverwrite = (guild, overwrite) =>
    getValuesFromObj(
        overwrite,
        ['type', 'allow', 'deny'],
        [
            {
                newProp: 'name',
                fromProps: ['type', 'id'],
                generate: (type, typeId) =>
                    // eslint-disable-next-line no-nested-ternary
                    (type === 'role'
                        ? !guild.roles.cache.get(typeId).managed
                            ? guild.roles.cache.get(typeId).name
                            : undefined
                        : guild.members.cache.get(typeId).id),
            },
        ],
    );

const parseRole = (guild, role) => getValuesFromObj(role, ['hexColor', 'hoist', 'mentionable', 'name', 'permissions', 'position']);

const parseChannel = (guild, channel) =>
    getValuesFromObj(
        channel,
        ['name', 'position', 'type', 'nsfw', 'topic', 'bitrate', 'userLimit'],
        [
            {
                newProp: 'parentName',
                fromProps: ['parent'],
                generate: category => (category ? category.name : null),
            },
            {
                newProp: 'permissionOverwrites',
                fromProps: ['permissionOverwrites'],
                generate: overwrites =>
                    overwrites
                        .filter(overwrite => overwrite.type === 'role')
                        .map(overwrite => parsePermissionOverwrite(guild, overwrite))
                        .filter(overwrite => overwrite.name !== undefined),
            },
        ],
    );

export default {
    cmds: ['export', 'export server', 'export guild', 'upload', 'upload server', 'upload guild'],
    desc: "Export a server's data",
    params: [],

    checkPermissions: [requiresDev],

    func: async ({ guild, channel: printChannel }) => {
        const guildData = getValuesFromObj(
            guild,
            [
                'afkTimeout',
                'defaultMessageNotifications',
                'embedEnabled',
                'explicitContentFilter',
                'iconURL',
                'mfaLevel',
                'name',
                'region',
                'splashURL',
                'verificationLevel',
            ],
            [
                {
                    newProp: 'afkChannelName',
                    fromProps: ['afkChannel'],
                    generate: channel => (channel ? channel.name : null),
                },
                {
                    newProp: 'systemChannelName',
                    fromProps: ['systemChannel'],
                    generate: channel => (channel ? channel.name : null),
                },
                {
                    newProp: 'roles',
                    fromProps: ['roles'],
                    generate: roles => roles.cache.filter(role => !role.managed).map(role => parseRole(guild, role)),
                },
                {
                    newProp: 'channels',
                    fromProps: ['channels'],
                    generate: channels => channels.map(channel => parseChannel(guild, channel)),
                },
            ],
        );

        guildData.roles.cache.sort(({ position: a }, { position: b }) => a - b);
        guildData.channels.sort(({ position: a }, { position: b }) => a - b);

        const guildDataJSON = JSON.stringify(guildData, null, 2);

        // console.log('------------------------\n', guildDataJSON, '\n------------------------');

        const pasteURL = await pastebinPost(`${guild.name} Export: ${getDateString()}`, guildDataJSON, { format: 'json' });
        sendEmbed(printChannel, 'Guild Export', pasteURL);
    },
};
