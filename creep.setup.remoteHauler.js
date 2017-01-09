var setup = new Creep.Setup('remoteHauler');
setup.minControllerLevel = 4;
setup.default = {
        fixedBody: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
        minAbsEnergyAvailable: 650,
        minEnergyAvailable: 0.3,
        maxMulti: 1,
        maxCount: room => room.sources.length * REMOTE_HAULER_MULTIPLIER
};
setup.RCL = {
    1: setup.none,
    2: setup.none,
    3: setup.none,
    4: setup.default,
    5: setup.default,
    6: setup.default,
    7: setup.default,
    8: setup.default
};
module.exports = setup;
