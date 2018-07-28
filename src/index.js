import { discordToken } from './auth';
import { onError } from './util';
import { client, setupCommands } from './setup';

import './core/events';

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Promise Rejection at:', p);
    console.log('Reason:', reason);
});

client
    .login(discordToken)
    .then(() => {
        setupCommands();
    })
    .catch(err => onError(err, 'DiscordLogin'));
