import { EventData, RegStatus } from '../../types';

export const isRegistrationClosed = (activeEvent: EventData | null, eventStats?: { occupied: number; capacity: number }) => {
    if (!activeEvent) return true;
    if (activeEvent.engineConfig?.enabled) {
        const now = new Date();
        const { regStartTime, regEndTime, groupFormationDeadline } = activeEvent.engineConfig.timeNodes;
        if (regStartTime && now < new Date(regStartTime)) return true;
        if (regEndTime && now > new Date(regEndTime)) return true;
        if (groupFormationDeadline && now > new Date(groupFormationDeadline)) return true;
        return false;
    }
    if (activeEvent.is_registration_open === false) return true;
    if (activeEvent.is_seat_limited && eventStats && eventStats.occupied >= eventStats.capacity) return true;
    if (activeEvent.registrationDeadline) {
        const deadline = new Date(activeEvent.registrationDeadline);
        if (new Date() > deadline) return true;
    }
    return false;
};

export const isCancellationDisabled = (activeEvent: EventData | null) => {
    if (!activeEvent) return true;
    if (activeEvent.engineConfig?.enabled) {
        const { cancellationDeadline } = activeEvent.engineConfig.timeNodes;
        if (cancellationDeadline) {
            return new Date() > new Date(cancellationDeadline);
        }
        return false;
    }
    return activeEvent.stop_cancellation || false;
};

export const isPaymentOverdue = (reg: { is_paid: boolean; created_at: string; status: RegStatus }, activeEvent: EventData | null) => {
    if (reg.is_paid) return false;
    if (!activeEvent) return false;
    
    if (activeEvent.engineConfig?.enabled) {
        const { regularPaymentDeadline, waitlistPaymentDeadline } = activeEvent.engineConfig.timeNodes;
        const deadline = reg.status === RegStatus.WAITING ? waitlistPaymentDeadline : regularPaymentDeadline;
        return deadline ? new Date() > new Date(deadline) : false;
    }
    
    if (activeEvent.paymentDeadlineDays) {
        return new Date(reg.created_at).getTime() + (activeEvent.paymentDeadlineDays * 86400000) < Date.now();
    }
    
    return false;
};
