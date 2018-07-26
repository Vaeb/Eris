import { prefix } from './setup';
import { print, sendEmbed, cloneDeepArray } from './util';

const parseArgCombosInner = (args, numParams) => {
    if (args.length < numParams) return null;

    let nowGroups = [];

    const firstParamLastArg = args.length - numParams;
    nowGroups[0] = args.slice(0, firstParamLastArg + 1);
    for (let i = 1; i < numParams; i++) {
        nowGroups[i] = [args[firstParamLastArg + i]];
    }

    const argCombos = [nowGroups.map(arr => arr.join(' '))];

    let focus = 0;
    const endFocus = numParams - 1;

    const savePointsStack = [];

    while (focus !== endFocus || savePointsStack.length > 0) {
        if (focus === endFocus) {
            ({ nowGroups, focus } = savePointsStack.pop()); // Restore savepoint when hit end
        } else {
            const focusGroup = nowGroups[focus];
            nowGroups[focus + 1].unshift(focusGroup.pop()); // Move eoFocus to soFocusNext
            argCombos.push(nowGroups.map(arr => arr.join(' ')));
            // More than 1 left = Push savepoint
            if (focusGroup.length > 1) savePointsStack.push({ focus, nowGroups: cloneDeepArray(nowGroups) });
            focus++; // Next focus
        }
    }

    return argCombos;
};

const parseArgCombos = (args, paramCombos) =>
    [...new Set(paramCombos.map(paramIds => paramIds.length))].reduce((o, numParams) => {
        o[numParams] = parseArgCombosInner(args, numParams);
        return o;
    }, {});

const parseCommandArgs = (command, strArgs, { guild, channel } = {}) => {
    const usedArgs = strArgs.split(/\s/);

    const { params, paramCombos, minArgs } = command;
    const commandName = command.cmds[0];
    const commandFormat = command.noPrefix ? commandName : prefix + commandName;

    const numUsedArgs = strArgs.length === 0 ? 0 : usedArgs.length;

    let failErr;

    if (numUsedArgs > 0 && (!paramCombos || paramCombos.length === 0)) {
        // Fail: Should have no arguments
        failErr = `Command "${commandName}" should not have any arguments`;
    } else if (numUsedArgs < minArgs) {
        // Fail: Too little arguments
        failErr = `Command "${commandName}" needs more arguments`;
    }

    if (failErr) {
        sendEmbed(channel, {
            title: 'Command Failed',
            desc: [failErr, `Use "${prefix}syntax ${commandName}" for more information`].join('\n'),
        });

        // sendEmbed(channel, {
        //     title: 'Command usage error',
        //     fields: [failErr, `Use "${prefix}syntax ${commandName}" for more information`],
        // });

        // print(channel, `**[ Command Usage Error ]** ${failErr} | Use "${prefix}syntax ${commandName}" for more information`);

        return false;
    }

    if (numUsedArgs === 0) return [];

    // Combination of arguments shifted in different positions to fit params
    const argComboVariations = parseArgCombos(usedArgs, paramCombos);

    // console.log('argComboVariations', argComboVariations);

    let builtArgs; // Found arguments that fit params

    // console.log('++', argComboVariations);

    const foundBuiltArgs = paramCombos.some((paramIdsOrig) => {
        // A combination of params (ids)

        // if (numUsedArgs < numParams) return false;

        const argCombos = argComboVariations[paramIdsOrig.length]; // Combinations of arguments

        if (!argCombos) return false;

        const numArgCombos = argCombos.length;

        for (let i = 0; i < numArgCombos; i++) {
            const paramIds = paramIdsOrig.slice(0);
            let numParams = paramIds.length;

            const nowArgs = argCombos[i].slice(0); // A combination of arguments
            const nowArgsParsed = [];

            let passed = true;

            // console.log('> Next combo of arguments...');

            for (let j = 0; j < numParams; j++) {
                const paramData = params[paramIds[j]]; // A param (data)
                const { parse, overflowArgs } = paramData;

                if (j >= nowArgs.length) return false;

                let argValue = nowArgs[j];

                if (overflowArgs) {
                    const splitData = overflowArgs({ str: argValue });
                    if (splitData) {
                        // console.log('---');
                        // console.log(paramIds, '|', nowArgs, '|', numParams);
                        const { splitArgs } = splitData;
                        const numNewArgs = splitArgs.length - 1;
                        argValue = splitArgs[0];
                        nowArgs[j] = argValue;
                        numParams += numNewArgs;
                        nowArgs.splice(j + 1, 0, ...splitArgs.slice(1));
                        const newParamIds = [];
                        for (let k = j + 1; k <= j + numNewArgs; k++) {
                            if (k < paramIds.length) paramIds[k]++;
                            newParamIds.push(k);
                        }
                        paramIds.splice(j + 1, 0, ...newParamIds);
                        // console.log(paramIds, '|', nowArgs, '|', numParams);
                        /*
                            we know that if arguments are overflowing from current parameter, they **must** be for
                            the directly adjacent next parameter(s), so need to insert the missing parameter(s)
                        */
                    }
                }

                const parsedValue = parse({ str: argValue, guild, channel });

                // console.log('Parsing', argValue, 'as', paramData.name);

                if (parsedValue === undefined) {
                    passed = false;
                    break;
                }

                nowArgsParsed.push(parsedValue);
            }

            if (passed) {
                // Found match
                // console.log('Parsed values:', nowArgsParsed);
                // builtArgs = paramIds.map((id, index) => ({ ...params[id], value: nowArgsParsed[index], original: nowArgs[index] }));
                // eslint-disable-next-line no-loop-func
                // console.log('gg', numParams, nowArgs, '|', nowArgsParsed);

                const builtArgsBasic = {
                    args: paramIds.map((id, index) => ({ value: nowArgsParsed[index], original: nowArgs[index] })),
                    guild,
                    channel,
                };

                builtArgs = params.map(({ id, defaultResolve, parse }) => {
                    const newArg = { ...params[id] };

                    const index = paramIds.indexOf(id);

                    if (index > -1) {
                        newArg.value = nowArgsParsed[index];
                        newArg.original = nowArgs[index];
                    } else if (defaultResolve) {
                        // Resolve default value
                        if (typeof defaultResolve === 'function') {
                            newArg.value = defaultResolve({ ...builtArgsBasic, parse });
                        } else {
                            newArg.value = parse({ str: defaultResolve, guild, channel });
                        }
                    }

                    return newArg;
                });
                return true;
            }
        }

        return false;
    });

    // console.log('Found arguments!:', foundBuiltArgs, builtArgs);

    if (foundBuiltArgs) return builtArgs;

    sendEmbed(channel, {
        title: 'Command Failed',
        desc: [
            `Your arguments did not match the required parameters for the ${commandName} command`,
            `Use "${prefix}syntax ${commandName}" for more information`,
        ].join('\n'),
    });

    // print(
    //     channel,
    //     `**[ Command Usage Error ]** Your arguments did not match the required parameters for ${commandName} | Use "${prefix}syntax ${commandName}" for more information`,
    // );

    // sendEmbed(channel, {
    //     title: 'Command usage error',
    //     // desc: '',
    //     fields: [
    //         `Command arguments did not match the required parameters for "${commandName}" `,
    //         `Use "${prefix}syntax ${commandName}" for more information`,
    //     ],
    // });

    return false;
};

export default parseCommandArgs;
