module.exports = {
    name: 'remoteMiner',
    run: function(creep) {
        // if we're there, be a miner.
        if( creep.room.name == creep.data.destiny.room ){
            Creep.behaviour.miner.run(creep);
            return;
        }
        // Assign next Action
        let oldTargetId = creep.data.targetId;
        if( creep.action == null  || creep.action.name == 'idle' ) {
            Task.mining.nextAction(creep);
        }

        if( creep.data.targetId != oldTargetId ) {
            delete creep.data.path;
        }
        // Do some work
        if( creep.action && creep.target ) {
            creep.action.step(creep);
        } else {
            logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
        }
    }
}
