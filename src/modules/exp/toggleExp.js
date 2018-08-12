import { requiresDev } from '../../permissions';

import { db, fetchProp } from '../../db';
import { dataGuilds } from '../../setup';
import { sendEmbed, sendEmbedError, strToBoolean } from '../../util';

export default {
    cmds: ['exp', 'toggleexp', 'toggle-exp', 'exptoggle', 'exp-toggle'],
    desc: 'Toggle exp levelling for the server',
    params: [
        {
            name: 'Toggle Status',
            desc: 'Whether the exp feature is "on" or "off" for the server',
            types: ['Boolean'],
            examples: [['on', 'off']],
            parse: ({ str }) => strToBoolean(str),
        },
    ],

    checkPermissions: requiresDev,

    func: async ({ guild, channel, args }) => {
        const guildData = fetchProp(dataGuilds, guild.id);

        if (guildData.expEnabled === args[0]) {
            sendEmbedError(channel, `Exp feature is already ${args[0] ? 'enabled' : 'disabled'}`);
            return;
        }

        await db.guilds.update({ guildId: guild.id }, { $set: { expEnabled: args[0] } }, { upsert: true, multi: false });
        guildData.expEnabled = args[0];
        sendEmbed(channel, 'Guild Settings', args[0] ? 'Enabled exp feature' : 'Disabled exp feature');
    },
};
