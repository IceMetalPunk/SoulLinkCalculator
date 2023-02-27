const TYPES = [
    'normal',
    'fighting',
    'flying',
    'poison',
    'ground',
    'rock',
    'bug',
    'ghost',
    'steel',
    'fire',
    'water',
    'grass',
    'electric',
    'psychic',
    'ice',
    'dragon',
    'dark',
    'fairy'
].map(t => t.charAt(0).toUpperCase() + t.slice(1));

let caught = [];
const baseTree = {
    value: [],
    parent: null,
    level: 0,
    types: TYPES,
    children: []
};

const recalc = async (from) => {
    if (from.level >= 6) { 
        return;
    }
    for (let pair of caught) {
        if (pair.t1 !== pair.t2 && from.types.includes(pair.t1) && from.types.includes(pair.t2)) {
            const toAdd = {
                level: from.level + 1,
                parent: from,
                value: from.value.concat(pair),
                types: from.types.filter(t => t !== pair.t1 && t !== pair.t2),
                children: []
            };
            globalThis.postMessage({
                type: 'team',
                team: toAdd.value
            });
            from.children.push(toAdd);
            await recalc(toAdd);
        }
    };
}

globalThis.addEventListener('message', async ({data}) => {
    if (data.type === 'add') {
        caught.push(data.pair);
        tree = {...baseTree, children: []};
        await recalc(tree);
        globalThis.postMessage({
            type: 'complete'
        });
    } else if (data.type === 'remove') {
        caught = caught.filter(team => {
            return team.p1 !== data.pair.p1 || team.p2 !== data.pair.p2 || team.location !== data.pair.location;
        });
        tree = {...baseTree, children: []};
        await recalc(tree);
        globalThis.postMessage({
            type: 'complete'
        });
    } else if (data.type === 'load') {
        caught = data.caught;
    }
});