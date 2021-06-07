import { sendEmbed, onError } from '../../util';
import { dataMembersAll } from '../../db';
import { requiresAdmin } from '../../permissions';
import { forceUpdateExpRole } from '../../expRoles';

export default {
    cmds: ['fixranks', 'fixxp', 'syncranks', 'updateranks', 'refreshranks'],
    desc: 'Refresh xp ranks for every user',
    params: [],

    checkPermissions: [requiresAdmin],

    func: async ({ guild, channel }) => {
        const guildMembers = await guild.members.fetch();

        const dataMembers = dataMembersAll[guild.id];

        guildMembers.forEach((member) => {
            forceUpdateExpRole(guild, member, dataMembers[member.id].exp);
        });

        sendEmbed(channel, `${guild.name} XP Ranks`, 'Refreshing XP Ranks for all users');
    },
};
