import { sendEmbed, matchPosInteger, onError } from '../../util';
import { db, dataMembersAll } from '../../db';
import { userResolvable } from '../../paramTypes';
import { requiresAdmin, requiresExp } from '../../permissions';
import { addXp } from '../../expRoles';

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

    checkPermissions: [requiresAdmin, requiresExp],

    func: async ({ channel, args: [member, changeXp, reason] }) => {
        const newXp = await addXp(member, changeXp);

        sendEmbed(channel, {
            title: 'Added User XP',
            desc: `${member} has gained ${changeXp} xp!`,
            fields: [{ name: 'Reason', value: reason, inline: true }, { name: 'New XP', value: newXp, inline: true }],
        });
    },
};
