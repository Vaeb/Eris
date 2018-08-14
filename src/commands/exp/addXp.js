import { sendEmbed, matchPosInteger, onError } from '../../util';
import { db, dataMembersAll } from '../../db';
import { userResolvable } from '../../paramTypes';
import { requiresAdmin, requiresExp } from '../../permissions';

export default {
    cmds: ['addxp', 'giveexp', 'sendxp'],
    desc: 'Add xp to a user',
    params: [
        {
            name: 'User',
            desc: 'User to check',
            types: userResolvable.types,
            examples: userResolvable.examples,
            parse: userResolvable.parse,
            parseFail: userResolvable.parseFail,
        },
        {
            name: 'Number',
            desc: 'How much xp to add',
            types: ['Integer'],
            examples: [['5', '107', '500']],
            parse: ({ str }) => matchPosInteger(str),
            parseFail: ({ str }) => `"${str}" is not a positive integer`,
        },
        {
            name: 'Reason',
            desc: 'Reason for the mute',
            types: ['Text'],
            examples: [['Abusing xp system by sending random messages frequently']],
            optional: true,
            defaultResolve: 'Reason not provided',
        },
    ],

    checkPermissions: [requiresAdmin],

    func: async ({ guild, channel, args: [member, changeXp, reason] }) => {
        const memberData = dataMembersAll[guild.id][member.id];
        const newXp = memberData.exp + changeXp;

        await db.members
            .updateOne({ guildId: guild.id, userId: member.id }, { $inc: { exp: changeXp } }, { upsert: false })
            .catch(err => onError(err, 'Query_ExpAdd'));

        memberData.exp = newXp;

        sendEmbed(channel, {
            title: 'Added User XP',
            desc: `${member} has gained ${changeXp} xp!`,
            fields: [{ name: 'Reason', value: reason, inline: true }, { name: 'New XP', value: newXp, inline: true }],
        });
    },
};
