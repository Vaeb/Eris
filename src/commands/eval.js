const nodeUtil = require('util');
const request = require('request-promise-native');
const dateformat = require('dateformat');

const setup = require('../setup');
const util = require('../util');
const database = require('../db');
const permissions = require('../permissions');
const expRoles = require('../expRoles');
const events = require('../core/events');
const messageHandler = require('../core/messageHandler');

const { client, vaebId, selfId } = setup;
const { print: printOld, sendEmbed, sendEmbedError, getDateString } = util;
const { db, dataGuilds, dataMembersAll, fetchProp } = database;
const { requiresDev } = permissions;

/*
    ==eval const client = require('../setup').client; return client.channels.get('455410709631729665').name;
*/

export default {
    cmds: ['eval'],
    desc: 'Dev-only debug command',
    params: [
        {
            name: 'Code',
            desc: 'JavaScript code to run',
            types: ['JavaScript'],
            examples: [['return 5*Math.random();', "print(channel, 'Variables like print and channel can still be accessed!');"]],
        },
    ],

    checkPermissions: [requiresDev],

    func: async ({
        msgObj, guild, channel, speaker, command, args,
    }) => {
        const print = (...args2) => printOld(channel, ...args2);

        const code = `(async () => {\n${args[0]}\n})()`;

        try {
            const result = await eval(code);
            console.log('Eval result:', result);

            if (result !== undefined) {
                const outStr = ['**Output:**'];
                outStr.push('```');
                outStr.push(nodeUtil.format(result));
                outStr.push('```');
                printOld(channel, outStr.join('\n'));
            }
        } catch (err) {
            console.log('Eval Error:', err);
            const outStr = ['**Error:**'];
            outStr.push('```');
            outStr.push(nodeUtil.format(err));
            outStr.push('```');
            printOld(channel, outStr.join('\n'));
        }
    },
};
