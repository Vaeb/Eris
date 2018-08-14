import { requiresDev } from '../../permissions';

import { db, fetchProp, dataGuilds } from '../../db';
import { sendEmbed, sendEmbedError, strToBoolean } from '../../util';

export default {
    cmds: ['togglexp', 'toggle-xp', 'exptoggle', 'xp-toggle'],
    desc: 'Toggle xp levelling for the server',
    params: [
        {
            name: 'Toggle Status',
            desc: 'Whether the xp feature is "on" or "off" for the server',
            types: ['Boolean'],
            examples: [['on', 'off']],
            parse: ({ str }) => strToBoolean(str),
        },
    ],

    checkPermissions: [requiresDev],

    func: async ({ guild, channel, args }) => {
        const guildData = dataGuilds[guild.id];

        if (guildData.expEnabled === args[0]) {
            sendEmbedError(channel, `XP feature is already ${args[0] ? 'enabled' : 'disabled'}`);
            return;
        }

        await db.guilds.updateOne({ guildId: guild.id }, { $set: { expEnabled: args[0] } }, { upsert: true });
        guildData.expEnabled = args[0];
        sendEmbed(channel, 'Guild Settings', args[0] ? 'Enabled xp feature' : 'Disabled xp feature');
    },
};
