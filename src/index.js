import { client, setupCommands, setupMembers } from './setup';
import { discordToken } from './auth';
import { onError } from './util';

import './core/events';

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Promise Rejection at:', p);
    console.log('Reason:', reason);
});

const maxAttempts = 3;

const init = async (attempts = 1) => {
    try {
        await client.login(discordToken);
    } catch (err) {
        onError(err, 'DiscordLogin');

        if (attempts < maxAttempts) {
            init(attempts + 1);
        } else {
            console.log(`Failed to login after ${attempts} attempts`);
        }

        return;
    }

    setupCommands();
    await setupMembers();
};

init();
