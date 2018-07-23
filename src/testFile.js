import parseParamCombos from './parseParams';
import parseCommandArgs from './parseArgs';

console.log('\nRan TestFile');

const defaultParse = str => str;

const command = require('./modules/test').default;

command.params.forEach((paramData, index) => {
    paramData.id = index;
    if (!command.parse) command.parse = defaultParse;
});
command.paramCombos = parseParamCombos(command.params);
command.minArgs = command.paramCombos.reduce((nowNum, params) => Math.min(nowNum, params.length), command.paramCombos[0].length);
command.maxArgs = command.paramCombos.reduce((nowNum, params) => Math.max(nowNum, params.length), command.paramCombos[0].length);

const parsedArgs = parseCommandArgs(command, 'vaeb 20 days being too cool', { guild: {}, channel: { name: 'ChannelName' } });

console.log('PARSED ARGS:', parsedArgs);

console.log('\nEnded TestFile');
