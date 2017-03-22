const action = new Creep.Action('avoiding');
module.exports = action;
action.lairDangerTime = 24;
action.targetRange = 0;
action.reachedRange = 0;
action.isActiveLair = function(target) {
    return !(target.ticksToSpawn > action.lairDangerTime); // non-lair => true
};
action.isValidAction = function(creep){
    return _.get(creep,['data','destiny','room'],creep.room.name) === creep.room.name &&
        (Room.isSKRoom(creep.room.name) || creep.room.situation.invasion);
};
action.isAddableAction = function(creep) {
    return true;
};
action.isValidTarget = function(target, creep){
    if (Task.reputation.npcOwner(target)) {
        return action.isActiveLair(target);
    } else if (Task.reputation.hostileOwner(target) && target.hasActiveBodyparts) {
        return target.hasActiveBodyparts([ATTACK,RANGED_ATTACK]);
    }
    return false;
};
action.newTarget = function(creep) {
    if (Room.isSKRoom(creep.pos.roomName)) {
        const target = _.first(creep.room.find(FIND_STRUCTURES, {filter: function (t) {
            return !_.isUndefined(t.ticksToSpawn) && action.isActiveLair(t) && creep.pos.getRangeTo(t.pos) < 15;
        }}));

        if (target) {
            return target;
        }
    }

    if (creep.room.situation.invasion) {
        const maxRange = creep.getStrategyHandler([action.name], 'maxRange', creep);

        const target = _.chain(creep.room.hostiles).filter(function(target) {
            return action.isValidTarget(target);
        }).map(function(target) {
            let score = 0;
            const range = creep.pos.getRangeTo(target);
            if (creep.owner.username === "Invader") {
                score = range - 51; // TODO how to score invaders vs players?
            } else if (range < maxRange) {
                score = range - maxRange;
            } else {
                score = 0;
            }
            return {target, score};
        }).filter('score').sortBy('score').first().get('target').value();

        if (target) {
            return target;
        }
    }
};
action.work = function(creep) {
    if (!(creep.data.safeSpot && creep.data.safeSpot.roomName)) {
        creep.data.safeSpot = creep.getStrategyHandler([action.name], 'findSafeSpot', creep);
    }

    const range = creep.pos.getRangeTo(creep.target);
    if ( range < creep.getStrategyHandler([action.name], 'minRange', creep)) {
        if (creep.room.isBorder(creep.pos)) {
            // TODO free from creep in other room?
        } else {
            creep.fleeMove();
        }
    }
    else if (creep.data.safeSpot) {
        if ( range < creep.getStrategyHandler([action.name], 'maxRange', creep)) {
            if(creep.leaveBorder()) return;
            if (DEBUG && TRACE) trace('Action', {creepName:creep.name, avoiding:'avoid spot', Action:'avoiding'});
            creep.travelTo(creep.data.safeSpot);
        } else {
            // TODO beyond maxRange should clear target?
            if(creep.leaveBorder()) return;
            if (DEBUG && TRACE) trace('Action', {creepName:creep.name, avoiding:'avoid idle', Action:'avoiding'});
            creep.idleMove();
        }
    }
};
action.run = function(creep) {
    if( action.isValidAction(creep) ) {
        if (creep.action === action && action.isValidTarget(creep.target, creep) ||
            action.isAddableAction(creep) && action.assign(creep) ) {

            action.work(creep);
            return true;
        }
    }
};
action.onAssignment = function(creep, target) {
    delete creep.data.safeSpot;
    if( SAY_ASSIGNMENT ) creep.say(String.fromCharCode(10532), SAY_PUBLIC);
};
action.defaultStrategy.maxRange = function(creep) {
    return 10;
};
action.defaultStrategy.minRange = function(creep) {
    return 5;
};
action.currentEntrance = function(creep) {
    const exit = _.get(creep.memory, ['_travel','roomIn',creep.pos.roomName,0]);
    if (exit) {
        return {roomName: creep.pos.roomName, x: +exit.substring(0,2), y: +exit.substring(2,4)};
    }
    return false;
};
action.currentExit = function(creep) {
    // TODO this should set a goal and pathfind to the safe location on this exit
    const exit = _.get(creep.memory, ['_travel','roomOut',creep.pos.roomName,0]);
    if (exit) {
        return {roomName: creep.pos.roomName, x: +exit.substring(0,2), y: +exit.substring(2,4)};
    }
    return false;
};
action.homeExit = function(creep) {
    // find the route home, move toward the exit until out of danger
    const home = _.chain(creep.room.findRoute(creep.data.homeRoom)).first().get('exit').value();
    if (home) {
        return _.merge({roomName: creep.pos.roomName}, creep.pos.findClosestByRange(home));
    }
    return false;
};
action.defaultStrategy.findSafeSpot = function(creep) {
    const flag = creep.data.destiny && Game.flags[creep.data.destiny.targetName];
    if (flag) {
        return flag.pos;
    }

    return action.currentExit(creep) || action.homeExit(creep) || false;
};
