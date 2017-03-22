let action = new Creep.Action('travelling');
module.exports = action;
action.isValidTarget = function(target){ return target !== null; };
action.isAddableAction = function(){ return true; };
action.isAddableTarget = function(){ return true; };
action.newTarget = function(creep){
    // TODO trace it: console.log(creep.strategy([action.name]).key);
    return creep.getStrategyHandler([action.name], 'newTarget', creep);
};
action.step = function(creep){
    if (this.travelAvoid(creep)) {
        creep.say(String.fromCharCode(10556), SAY_PUBLIC);
    } else if(CHATTY) {
        creep.say(this.name, SAY_PUBLIC);
    }
    let targetRange = creep.data.travelRange || this.targetRange;
    let target = creep.target;
    if (creep.data.travelPos) {
        target = creep.data.travelPos;
        targetRange = 0;
    } else if (FlagDir.isSpecialFlag(creep.target)) {
        if (creep.data.travelRoom) {
            const room = Game.rooms[creep.data.travelRoom];
            if (room && (room.name === creep.pos.roomName)) { // TODO || room.getBorder(creep.pos.roomName))) {
                creep.leaveBorder(); // TODO unregister / return false? and immediately acquire new action & target
                target = null;
            } else {
                targetRange = creep.data.travelRange || TRAVELLING_BORDER_RANGE || 22;
                target = new RoomPosition(25, 25, creep.data.travelRoom);
            }
        } else {
            logError(creep.name + 'Creep.action.travelling called with specialFlag target and travelRoom undefined.');
            target = null;
        }
    }
    if( target ){
        const range = creep.pos.getRangeTo(target);
        if( range <= targetRange ) {
            return action.unregister(creep);
        }
        const result = creep.travelTo(target, {range:targetRange, ignoreCreeps:creep.data.ignoreCreeps || true});
        if (result === 0 && targetRange === 1) {
            if (creep.data.travelPos) {
                delete creep.data.travelPos;
                delete creep.data.avoiding;
            } else {
                return action.unregister(creep);
            }
        }
    } else {
        action.unregister(creep);
    }
};
action.assignRoom = function(creep, roomName) {
    if (!roomName) {
        logError(creep.name + 'Creep.action.travelling.assignRoom called with no room.');
        return;
    }
    if (_.isUndefined(creep.data.travelRange)) creep.data.travelRange = TRAVELLING_BORDER_RANGE || 22;
    creep.data.travelRoom = roomName;
    return Creep.action.travelling.assign(creep, FlagDir.specialFlag());
};
action.travelAvoid = function(creep) {
    if (!creep.data.avoiding) {
        const avoid = creep.getStrategyHandler([], 'avoidTargets', creep);

        if (!(avoid && avoid.length)) {
            return false;
        }

        const exit = this.currentExit(creep);

        const exitPoints = creep.room.exits(goal, []);

        const matrix = Room.avoidMatrix(creep.pos.roomName, creep, exit);
        creep._avoidMatrix = matrix;

        const goal = PathFinder.search(creep, exitPoints, {
            roomCallback: room => room === creep.room ? matrix : false,
        });

        // TODO save path

        creep.data.travelPos = _.last(goal.path);
        const success = !!creep.data.travelPos;
        creep.data.avoiding = success;
        return success;
    }

    return false;
};
action.currentEntrance = function(creep) {
    const exit = _.get(creep.memory, ['_travel','roomIn',creep.pos.roomName,0]);
    if (exit) {
        return {roomName: creep.pos.roomName,
            exit: +exit.substring(0,1),
            x: +exit.substring(1,3),
            y: +exit.substring(3,5)};
    }
    return false;
};
action.currentExit = function(creep) {
    // TODO this should set a goal and pathfind to the safe location on this exit
    const exit = _.get(creep.memory, ['_travel','roomOut',creep.pos.roomName,0]);
    if (exit) {
        return {roomName: creep.pos.roomName,
            exit: +exit.substring(0,1),
            x: +exit.substring(1,3),
            y: +exit.substring(3,5)};
    }
    return false;
};
action.unregister = function(creep) {
    delete creep.action;
    delete creep.target;
    delete creep.data.actionName;
    delete creep.data.ignoreCreeps;
    delete creep.data.targetId;
    delete creep.data.travelRoom;
    delete creep.data.travelRange;
};
action.onAssignment = function(creep, target) {
    if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(9784), SAY_PUBLIC);
};
action.defaultStrategy.newTarget = function(creep) {
    if( creep.data.travelPos || creep.data.travelRoom ) {
        return FlagDir.specialFlag();
    }
    return null;
};
action.defaultStrategy.avoidTargets = function(creep) {
    return creep.room.hostiles;
};