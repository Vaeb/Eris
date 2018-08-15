import { print, getValuesFromObj, chunkMessage } from '../util';
import { requiresDev } from '../permissions';

const parsePermissionOverwrite = (guild, overwrite) =>
    getValuesFromObj(
        overwrite,
        ['type', 'allow', 'deny'],
        [
            {
                newProp: 'name',
                fromProps: ['type', 'id'],
                generate: (type, typeId) => (type === 'role' ? guild.roles.get(typeId).name : guild.members.get(typeId).id),
            },
        ],
    );

const parseRole = (guild, role) => getValuesFromObj(role, ['hexColor', 'hoist', 'mentionable', 'name', 'permissions', 'position']);

const parseChannel = (guild, channel) =>
    getValuesFromObj(
        channel,
        ['name', 'position', 'type'],
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
                    overwrites.filter(overwrite => overwrite.type === 'role').map(overwrite => parsePermissionOverwrite(guild, overwrite)),
            },
        ],
    );

export default {
    cmds: ['export', 'export server', 'export guild'],
    desc: "Check the server's top XP rankings",
    params: [],

    checkPermissions: [requiresDev],

    func: ({ guild, channel: printChannel }) => {
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
                    generate: roles => roles.filter(role => !role.managed).map(role => parseRole(guild, role)),
                },
                {
                    newProp: 'channels',
                    fromProps: ['channels'],
                    generate: channels => channels.map(channel => parseChannel(guild, channel)),
                },
            ],
        );

        const guildDataJSON = JSON.stringify(guildData, null, 2);

        console.log('------------------------\n', guildDataJSON, '\n------------------------');

        const chunks = chunkMessage(`\`\`\`\n${guildDataJSON}\n\`\`\``);

        for (let i = 0; i < chunks.length; i++) {
            print(printChannel, chunks[i]);
        }
    },
};
