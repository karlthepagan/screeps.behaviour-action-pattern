let mod = {};
module.exports = mod;
mod.name = 'remoteMiner';
mod.run = function(creep) {
    let oldTargetId = creep.data.targetId;
    // assign Action
    if( creep.room.name == creep.data.destiny.room ){
        // if we're there, be a miner.
        this.mine(creep);
        return;
    } else {
        // else go there
        Creep.action.travelling.assign(creep, Game.flags[creep.data.destiny.targetName]);
    }
    
    // Do some work
    if( creep.action && creep.target ) {
        creep.action.step(creep);
    } else {
        logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
    }
};
mod.mine = function(creep) {
    let source;
    if( !creep.data.determinatedTarget ) { // select source
        let notDeterminated = source => {
            let hasThisSource = data => { return data.determinatedTarget == source.id };
            let existingBranding = _.find(Memory.population, hasThisSource);
            return !existingBranding;
        };
        source = _.find(creep.room.sources, notDeterminated);
        if( source ) {
            creep.data.determinatedTarget = source.id;
        }
        if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(9935), SAY_PUBLIC);
    } else { // get dedicated source
        source = Game.getObjectById(creep.data.determinatedTarget);
    }

    if( source ) {
        if( !creep.action ) Population.registerAction(creep, Creep.action.harvesting, source);
        if( !creep.data.determinatedSpot ) {
            let args = {
                spots: [{
                    pos: source.pos,
                    range: 1
                }],
                checkWalkable: true,
                where: null,
                roomName: creep.pos.roomName
            }

            let invalid = [];
            let findInvalid = entry => {
                if( entry.roomName == args.roomName && ['miner', 'upgrader'].includes(entry.creepType) &&
                    entry.determinatedSpot && (entry.ttl > entry.spawningTime || entry.ttl > entry.predictedRenewal) )
                    invalid.push(entry.determinatedSpot);
            };
            _.forEach(Memory.population, findInvalid);
            args.where = pos => { return !_.some(invalid,{x:pos.x,y:pos.y}); };

            if( source.container )
                args.spots.push({
                    pos: source.container.pos,
                    range: 1
                });
            let spots = Room.fieldsInRange(args);
            if( spots.length > 0 ){
                let spot = creep.pos.findClosestByPath(spots, {filter: pos => {
                    return _.some(
                        creep.room.lookForAt(LOOK_STRUCTURES, pos),
                        {'structureType': STRUCTURE_CONTAINER}
                    );
                }})
                if( !spot ) spot = creep.pos.findClosestByPath(spots) || spots[0];
                if( spot ) creep.data.determinatedSpot = {
                    x: spot.x,
                    y: spot.y
                }
            }
            if( !creep.data.determinatedSpot ) logError('Unable to determine working location for miner in room ' + creep.pos.roomName);
        }

        if( creep.data.determinatedSpot ) {
            let carrying = creep.sum;
            const linkEnergy = source.link && source.link.energy;
            const containerEnergy = source.container && source.container.sum;
            const haulerCount = creep.room.population && creep.room.population.typeCount['hauler'] && creep.room.population.typeCount['hauler'];
            let branch;
            if( source.link && linkEnergy < source.link.energyCapacity ) {
                branch = 'link mine';
                if(CHATTY) creep.say(branch, SAY_PUBLIC);
                let range = this.approach(creep);
                if( range == 0 ){
                    if(carrying > ( creep.carryCapacity - ( creep.data.body&&creep.data.body.work ? (creep.data.body.work*2) : (creep.carryCapacity/2) )))
                        creep.transfer(source.link, RESOURCE_ENERGY);
                    creep.harvest(source);
                }
            } else if( source.container && containerEnergy < source.container.storeCapacity ) {
                branch = 'can mine';
                if(CHATTY) creep.say(branch, SAY_PUBLIC);
                let range = this.approach(creep);
                if( range == 0 ){
                    if( carrying > ( creep.carryCapacity - ( creep.data.body&&creep.data.body.work ? (creep.data.body.work*2) : (creep.carryCapacity/2) ))){
                        let transfer = r => { if(creep.carry[r] > 0 ) creep.transfer(source.container, r); };
                        _.forEach(Object.keys(creep.carry), transfer);
                    }
                    creep.harvest(source);
                }
            } else if( haulerCount > 0 ) {
                branch = 'drop mine';
                if(CHATTY) creep.say(branch, SAY_PUBLIC);
                let range = this.approach(creep);
                if( range == 0 ){
                    if( carrying > ( creep.carryCapacity -
                        ( creep.data.body&&creep.data.body.work ? (creep.data.body.work*2) : (creep.carryCapacity/2) ))) {
                        if( OOPS ) creep.say(String.fromCharCode(8681), SAY_PUBLIC);
                        let drop = r => { if(creep.carry[r] > 0 ) creep.drop(r); };
                        _.forEach(Object.keys(creep.carry), drop);
                    }
                    creep.harvest(source);
                }
            } else {
                branch = 'behaviour.worker.run';
                Creep.behaviour.worker.run(creep);
            }
            if( DEBUG && TRACE ) trace('Behaviour', {creepName:creep.name, mine: branch, linkEnergy, containerEnergy,
                haulerCount,  Behaviour:mod.name, [mod.name]:'mine'});
        }
    }
};
mod.approach = function(creep){
    let targetPos = new RoomPosition(creep.data.determinatedSpot.x, creep.data.determinatedSpot.y, creep.data.destiny.room);
    let range = creep.pos.getRangeTo(targetPos);
    if( range > 0 ) {
        creep.drive( targetPos, 0, 0, range );
        if( range === 1 && !creep.data.predictedRenewal ) {
            const predictedRenewal = _.min([500, 1500 - creep.ticksToLive + creep.data.spawningTime]);
            if( DEBUG && TRACE ) trace('Behaviour', {creepName:creep.name, predictedRenewal, Behaviour:mod.name, [mod.name]:'approach'});
            creep.data.predictedRenewal = predictedRenewal;
        }
    }
    return range;
};
