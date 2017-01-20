let setup = new Creep.Setup('miner');
module.exports = setup;
setup.minControllerLevel = 3;
setup.targetRange = function(source) {

};
setup.targetMaxCount = function(source) {

};
setup.maxCount = function(room) {
    return _.sum(room.sources, setup.sourceMaxCount);
};
setup.multiBody = function(room) {
    return [WORK, MOVE];
};
setup.default = {
    fixedBody: [WORK, WORK, WORK, WORK, CARRY, MOVE],
    multiBody: setup.multiBody,
    minAbsEnergyAvailable: 500,
    minEnergyAvailable: 0.3,
    maxMulti: 1,
    maxCount: setup.maxCount,
};
setup.RCL = {
    1: setup.none,
    2: setup.none,
    3: setup.default,
    4: setup.default,
    5: setup.default,
    6: setup.default,
    7: setup.default,
    8: setup.default
};
