import { useMemo } from 'react';
import { EventData, Registration, RegStatus, TripType, OrdinanceType, OrdinanceItem, PaymentMethod } from '../types';

export const calculateStats = (activeEvent: EventData | null | undefined, registrations: Registration[]) => {
    // vehicleStats
    const validRegs = registrations.filter(r => r.status !== RegStatus.CANCELLED && r.status !== RegStatus.DELETED);
    // V300: Exclude RETAINED (留用) from bus seat counts
    const seatOccupiers = validRegs.filter(r => r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED);
    
    const capacity = (activeEvent?.busConfigs && activeEvent.busConfigs.length > 0)
        ? activeEvent.busConfigs.reduce((sum, b) => sum + (b.capacity || 42), 0)
        : ((activeEvent?.bus_count || 0) * 42); // Fallback to 42 * count if no configs
        
    const occ = Math.min(capacity, seatOccupiers.length);
    const wait = Math.max(0, seatOccupiers.length - capacity);
        
    const vehicleStats = {
        capacity,
        occupied: occ,
        waiting: wait,
        remaining: Math.max(0, capacity - occ)
    };

    // ordinanceStats
    const proxyEndowments = validRegs.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.ENDOWMENT
    );
    const proxyBaptisms = validRegs.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.BAPTISM
    );
    
    const endCap = activeEvent?.endowment_capacity || 0;
    const bapCap = activeEvent?.baptism_capacity || 0;
    const sealCap = activeEvent?.sealing_capacity || 0;
    
    // Dynamic waitlist based on capacity limit
    const endOcc = endCap > 0 ? Math.min(endCap, proxyEndowments.length) : proxyEndowments.length;
    const endWait = endCap > 0 ? Math.max(0, proxyEndowments.length - endCap) : 0;
    
    const bapOcc = bapCap > 0 ? Math.min(bapCap, proxyBaptisms.length) : proxyBaptisms.length;
    const bapWait = bapCap > 0 ? Math.max(0, proxyBaptisms.length - bapCap) : 0;

    const proxySealings = validRegs.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.SEALING
    );
    const sealOcc = sealCap > 0 ? Math.min(sealCap, proxySealings.length) : proxySealings.length;
    const sealWait = sealCap > 0 ? Math.max(0, proxySealings.length - sealCap) : 0;

    const ordinanceStats = {
        endowment: {
            capacity: endCap,
            occupied: endOcc,
            waiting: endWait,
            remaining: Math.max(0, endCap - endOcc)
        },
        baptism: {
            capacity: bapCap,
            occupied: bapOcc,
            waiting: bapWait,
            remaining: Math.max(0, bapCap - bapOcc)
        },
        sealing: {
            capacity: sealCap,
            occupied: sealOcc,
            waiting: sealWait,
            remaining: Math.max(0, sealCap - sealOcc)
        }
    };

    return { vehicleStats: vehicleStats, ordinanceStats: ordinanceStats };
};

export const calculateRanks = (registrations: Registration[]) => {
    const vehicleRanks = new Map<string, number>();
    const endowmentRanks = new Map<string, number>();
    const baptismRanks = new Map<string, number>();
    const sealingRanks = new Map<string, number>();
    
    const valid = registrations.filter(r => r.status !== RegStatus.CANCELLED && r.status !== RegStatus.DELETED);
    
    // V300: Exclude RETAINED (留用) from bus seat pool ranking
    const seatOccupiers = valid.filter(r => r.trip_type !== TripType.SELF_MANAGED && r.trip_type !== TripType.RETAINED);
    const sortedVehicles = [...seatOccupiers].sort((a,b) => {
        const timeA = new Date(a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.created_at || 0).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        if (a.serial_number && b.serial_number) return a.serial_number - b.serial_number;
        return a.reg_id.localeCompare(b.reg_id);
    });
    sortedVehicles.forEach((r, idx) => vehicleRanks.set(r.reg_id, idx + 1));
    
    const proxyEndowments = valid.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.ENDOWMENT
    );
    const sortedEnd = [...proxyEndowments].sort((a,b) => {
        const timeA = new Date(a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.created_at || 0).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        const serialA = a.endowment_serial_number || 999999;
        const serialB = b.endowment_serial_number || 999999;
        if (serialA !== serialB) return serialA - serialB;
        return a.reg_id.localeCompare(b.reg_id);
    });
    sortedEnd.forEach((r, idx) => endowmentRanks.set(r.reg_id, idx + 1));
    
    const proxyBaptisms = valid.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.BAPTISM
    );
    const sortedBap = [...proxyBaptisms].sort((a,b) => {
        const timeA = new Date(a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.created_at || 0).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        const serialA = a.baptism_serial_number || 999999;
        const serialB = b.baptism_serial_number || 999999;
        if (serialA !== serialB) return serialA - serialB;
        return a.reg_id.localeCompare(b.reg_id);
    });
    sortedBap.forEach((r, idx) => baptismRanks.set(r.reg_id, idx + 1));

    const proxySealings = valid.filter(r => 
        (r.ordinance_type === OrdinanceType.PROXY || r.ordinance_type === OrdinanceType.LIVING) && 
        r.ordinance_item === OrdinanceItem.SEALING
    );
    const sortedSeal = [...proxySealings].sort((a,b) => {
        const timeA = new Date(a.created_at || 0).getTime() || 0;
        const timeB = new Date(b.created_at || 0).getTime() || 0;
        if (timeA !== timeB) return timeA - timeB;
        const serialA = a.sealing_serial_number || 999999;
        const serialB = b.sealing_serial_number || 999999;
        if (serialA !== serialB) return serialA - serialB;
        return a.reg_id.localeCompare(b.reg_id);
    });
    sortedSeal.forEach((r, idx) => sealingRanks.set(r.reg_id, idx + 1));
    
    return { vehicleRanks, endowmentRanks, baptismRanks, sealingRanks };
};

export const useRanks = (registrations: Registration[]) => {
    return useMemo(() => calculateRanks(registrations), [registrations]);
};

export const useStats = (activeEvent: EventData | null | undefined, registrations: Registration[]) => {
    return useMemo(() => calculateStats(activeEvent, registrations), [activeEvent, registrations]);
};
