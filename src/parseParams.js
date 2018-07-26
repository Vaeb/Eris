// const sortParamCombos = paramCombos =>
//     paramCombos.sort((paramsA, paramsB) => {
//         const paramsALen = paramsA.length;
//         const paramsBLen = paramsB.length;

//         const minLen = Math.min(paramsALen, paramsBLen);

//         for (let i = 0; i < minLen; i++) {
//             const paramA = paramsA[i];
//             const paramB = paramsB[i];
//             const rankDif = paramA - paramB; // Return positive so that a lower paramARank comes first
//             if (rankDif !== 0) return rankDif;
//         }

//         const numDif = paramsBLen - paramsALen; // Return negative so that a higher paramsA comes first
//         if (numDif !== 0) return numDif;

//         return 0;
//     });

// const stackToState = (stack, newVals = []) => [...stack, ...newVals].sort().join('');

// const parseParamCombosOld = (allParams) => {
//     if (allParams.length === 0) return [];

//     let params = allParams.map((_, index) => index);
//     const paramCombos = [params.slice(0)];

//     if (params.length === 1) return paramCombos;

//     const paramNameToId = params.reduce((obj, paramId) => {
//         obj[allParams[paramId].name] = paramId;
//         return obj;
//     }, {});

//     const invRequires = params.reduce((dependencyMap, paramId) => {
//         dependencyMap[paramId] = params
//             .filter(paramId2 => (allParams[paramId2].requires || []).includes(paramId))
//             .sort((a, b) => b - a)
//             .map(paramId2 => allParams[paramId2].name);
//         return dependencyMap;
//     }, {});

//     const comboStack = [];
//     let stateStack = ['State'];

//     const usedStates = {};
//     let state = stackToState(stateStack);

//     const filterRemoved = remParamName => !stateStack.includes(remParamName);

//     let couldRemove = true;

//     while (couldRemove || comboStack.length !== 0) {
//         if (!couldRemove || params.length === 1) {
//             ({ params, state, stateStack } = comboStack.pop());
//             // console.log(`pop | ${state}`, params);
//         }
//         couldRemove = false;
//         const numParams = params.length;
//         for (let i = 0; i < numParams; i++) {
//             const paramId = params[i];
//             const { name, optional } = allParams[paramId];
//             if (optional) {
//                 const alsoRemoveNames = invRequires[paramId].filter(filterRemoved);
//                 // if (alsoRemoveNames.length > 0) console.log(alsoRemoveNames);
//                 const newState = stackToState(stateStack, [name, ...alsoRemoveNames]);
//                 // if (name === 'Time') console.log('Removing', name, 'Old state:', state, 'New state:', newState, 'Params:', params.map(id => allParams[id].name));
//                 if (!usedStates[newState]) {
//                     couldRemove = true;
//                     comboStack.push({ params: params.slice(0), state, stateStack: stateStack.slice(0) });
//                     stateStack.push(name, ...alsoRemoveNames);
//                     state = newState;
//                     usedStates[newState] = true;
//                     params.splice(i, 1);
//                     if (alsoRemoveNames.length) {
//                         for (let j = 0; j < alsoRemoveNames.length; j++) {
//                             params.splice(params.indexOf(paramNameToId[alsoRemoveNames[j]]), 1);
//                         }
//                     }
//                     paramCombos.push(params.slice(0));
//                     // if (name === 'Time') console.log('New Params:', params.map(id => allParams[id].name));
//                     // console.log(`push | ${state}`, params);
//                     break;
//                 }
//             }
//         }
//     }

//     return sortParamCombos(paramCombos);
// };

/*

    User
    User Time
    User Time TF
    User Time TF Reason
    User Time Reason
    User TF
    User TF Reason
    User Reason 
    Time
    Time TF
    Time TF Reason
    Time Reason 
    TF
    TF Reason
    Reason

*/

const parseParamCombos = (allParams) => {
    if (allParams.length === 0) return [];

    const maxParams = allParams.length;

    const paramIds = allParams.map((_, index) => index);
    const paramCombos = [];

    const forcedParams = paramIds.filter(id => !allParams[id].optional);

    let firstOptional = paramIds.find(id => allParams[id].optional);
    if (firstOptional === undefined) firstOptional = -1; // pesky 0==false

    const paramStack = [];
    const usedCombos = {};

    let couldPush = true;

    while (couldPush || paramStack.length !== 0) {
        if (!couldPush || paramStack.length === maxParams) {
            const removedId = paramStack.pop();
            if (removedId < firstOptional) break; // Only required params before this
        }

        couldPush = false;

        const curCombo = paramStack.join('');

        let lastId = paramStack[paramStack.length - 1];
        if (lastId === undefined) lastId = -1;

        for (let paramId = lastId + 1; paramId < maxParams; paramId++) {
            if (!paramStack.includes(paramId)) {
                const newCombo = curCombo + String(paramId);
                if (!usedCombos[newCombo]) {
                    usedCombos[newCombo] = true;
                    couldPush = true;
                    paramStack.push(paramId);
                    const meetsRequirements = paramStack.every(id => (allParams[id].requires || []).every(id2 => paramStack.includes(id2)));
                    if (meetsRequirements && forcedParams.every(id => paramStack.includes(id))) {
                        paramCombos.push(paramStack.slice(0));
                    }
                    break;
                }
            }
        }

        // console.log(paramStack, couldPush);
    }

    return paramCombos;
};

export default parseParamCombos;
