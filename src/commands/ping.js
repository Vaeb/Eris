// import { requiresDev } from '../permissions';
import { sendEmbed } from '../util';

export default {
    cmds: ['ping'],
    desc: 'Test the bot is working',
    params: [],
    noPrefix: true,

    func: ({ channel }) => {
        // sendEmbed(channel, { desc: 'pong' });
    },
};
