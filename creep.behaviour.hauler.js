let mod = {};
module.exports = mod;
mod.name = 'hauler';
mod.run = function(creep) {
    // Assign next Action
    let oldTargetId = creep.data.targetId;
    if( creep.action == null || creep.action.name == 'idle' ) {
        this.nextAction(creep);
    }
    
    // Do some work
    if( creep.action && creep.target ) {
        creep.action.step(creep);
    } else {
        logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
    }
};
mod.nextAction = function(creep){
    if( creep.pos.roomName != creep.data.homeRoom && Game.rooms[creep.data.homeRoom] && Game.rooms[creep.data.homeRoom].controller ) {
        Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
        return;
    }
    const outflowPriority = [
        Creep.action.feeding,
        Creep.action.charging,
        Creep.action.fueling,
    ];
    let priority = outflowPriority;
    if( creep.sum * 2 < creep.carryCapacity ) {
        priority = [
            Creep.action.uncharging,
            Creep.action.picking,
        ];
        Creep.action.withdrawing.debounce(creep, outflowPriority, function(withdrawing) {
            priority.push(withdrawing);
        });
        priority.push(Creep.action.reallocating);
        priority.push(Creep.action.idle);
    } else {
        priority = outflowPriority.concat([
            Creep.action.storing,
            Creep.action.idle,
        ]);
        if ( creep.sum > creep.carry.energy ||
            ( !creep.room.situation.invasion &&
                SPAWN_DEFENSE_ON_ATTACK && creep.room.conserveForDefense && creep.room.relativeEnergyAvailable > 0.8)) {
            priority.unshift(Creep.action.storing);
        }
        if (creep.room.structures.urgentRepairable.length > 0 ) {
            priority.unshift(Creep.action.fueling);
        }
    }

    for(var iAction = 0; iAction < priority.length; iAction++) {
        var a = priority[iAction];
        if(a.isValidAction(creep) && a.isAddableAction(creep) && a.assign(creep)) {
            if (a.name !== 'idle') {
                creep.data.lastAction = a.name;
                creep.data.lastTarget = creep.target.id;
            }
            return;
        }
    }
};
mod.strategies = {
    defaultStrategy: {
        name: `default-${mod.name}`,
        canWithdrawEnergy: function (creep, target) {
            const min = Math.min(creep.carryCapacity - creep.sum, 500);

            return function (amount) {
                return amount >= min;
            };
        }
    },
    uncharging: {
        name: `uncharging-${mod.name}`,
        targetScore: function (creep) {
            const isValidTarget = creep.getStrategyHandler(['uncharging'], 'isValidTarget', creep);
            if (!isValidTarget) return;

            // take from fullest IN container having energy
            return function (target) {
                let score = target.sum;
                if (target.targetOf)
                    score -= _.sum(target.targetOf.map(t => ( t.actionName == 'uncharging' ? t.carryCapacityLeft : 0 )));

                if( DEBUG && TRACE ) trace('Action', {creepName:creep.name, target: target.pos, score, strategy:'canWithdrawEnergy', Action:'uncharging'});

                if (!isValidTarget(score)) score = 0;
                return {target, score}
            };
        },
    },
};
mod.selectStrategies = function(actionName) {
    return [mod.strategies.defaultStrategy, mod.strategies[actionName]];
};
