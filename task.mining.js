// This task will react on white/brown flags
var mod = {
    register: () => {
        // when a new flag has been found (occurs every tick, for each flag)
        Flag.found.on( flag => Task.mining.handleFlagFound(flag) );
        // a creep starts spawning
        Creep.spawningStarted.on( params => Task.mining.handleSpawningStarted(params) );
        // a creep completed spawning
        Creep.spawningCompleted.on( creep => Task.mining.handleSpawningCompleted(creep) );
        // a creep will die soon
        Creep.predictedRenewal.on( creep => Task.mining.handleCreepDied(creep.name) );
        // a creep died
        Creep.died.on( name => Task.mining.handleCreepDied(name) );
    },
    handleFlagFound: flag => {
        if( flag.color == FLAG_COLOR.claim.mining.color && flag.secondaryColor == FLAG_COLOR.claim.mining.secondaryColor ){
            // check if a new creep has to be spawned
            Task.mining.checkForRequiredCreeps(flag);
        }
    },
    // check if a new creep has to be spawned
    checkForRequiredCreeps: (flag) => {
        let spawnRoom = Game.rooms[Room.bestSpawnRoomFor(flag.pos.roomName)];
        let room = Game.rooms[flag.pos.roomName];
        let memory = Task.mining.memory(flag);

        // todo count creeps by type needed per source / mineral
        let haulerCount = null;
        let minerCount = null;
    }
    // todo: rest of task
};

module.exports = mod;
