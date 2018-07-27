import nodeUtil from 'util';

import { requiresDev } from '../permissions';
import { print } from '../util';

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

    checkPermissions: requiresDev,

    func: async ({
        guild, channel, speaker, command, args,
    }) => {
        const code = `(async () => {\n${args[0].value}\n})()`;

        try {
            const result = await eval(code);
            console.log('Eval result:', result);

            if (result !== undefined) {
                const outStr = ['**Output:**'];
                outStr.push('```');
                outStr.push(nodeUtil.format(result));
                outStr.push('```');
                print(channel, outStr.join('\n'));
            }
        } catch (err) {
            console.log('Eval Error:', err);
            const outStr = ['**Error:**'];
            outStr.push('```');
            outStr.push(nodeUtil.format(err));
            outStr.push('```');
            print(channel, outStr.join('\n'));
        }
    },
};
