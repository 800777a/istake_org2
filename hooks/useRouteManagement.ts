
import { useState } from 'react';
import { EventData, BusRoute, RoutePlanItem, RoadSignItem, GlobalSettings } from '../types';
import { updateEvent } from '../services/sheetService';

export function useRouteManagement(currentEvent: EventData, onUpdateEvent: (event: EventData) => void) {
    const [collapsedBuses, setCollapsedBuses] = useState<Record<string, boolean>>({});
    const [collapsedSigns, setCollapsedSigns] = useState<Record<string, boolean>>({});
    const [signMenuIdx, setSignMenuIdx] = useState<{ busName: string, type: 'outbound' | 'return', idx: number } | null>(null);

    const toggleBusCollapse = (busName: string) => setCollapsedBuses(prev => ({ ...prev, [busName]: !prev[busName] }));
    const toggleSignCollapse = (busName: string) => setCollapsedSigns(prev => ({ ...prev, [busName]: !prev[busName] }));

    const handleBusRouteFieldUpdate = (busName: string, field: keyof BusRoute, value: string) => {
        if (!busName) return;
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outboundTitle: '', returnTitle: '', outbound: [], returnTrip: [] };
        const updatedRoutes = { ...routes, [busName]: { ...currentRoute, [field]: value } };
        onUpdateEvent({ ...currentEvent, busRoutes: updatedRoutes });
    };

    const addRouteItem = (busName: string, type: 'outbound' | 'return') => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outboundTitle: '', returnTitle: '', outbound: [], returnTrip: [] };
        const items = type === 'outbound' ? [...(currentRoute.outbound || [])] : [...(currentRoute.returnTrip || [])];
        
        items.push({ 
            location: '', 
            arrivalTime: '', 
            departureTime: '', 
            duration: '0', 
            area: '', 
            stay: '0', 
            stopCode: '', 
            address: '', 
            mapUrl: '' 
        });
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outbound = items;
        else updatedRoute.returnTrip = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const updateRouteItem = (busName: string, type: 'outbound' | 'return', idx: number, field: keyof RoutePlanItem, value: string) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName];
        if (!currentRoute) return;
        
        const items = type === 'outbound' ? [...(currentRoute.outbound || [])] : [...(currentRoute.returnTrip || [])];
        items[idx] = { ...items[idx], [field]: value };
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outbound = items;
        else updatedRoute.returnTrip = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const removeRouteItem = (busName: string, type: 'outbound' | 'return', idx: number) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName];
        if (!currentRoute) return;
        
        const items = type === 'outbound' ? [...(currentRoute.outbound || [])] : [...(currentRoute.returnTrip || [])];
        items.splice(idx, 1);
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outbound = items;
        else updatedRoute.returnTrip = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const addSignItem = (busName: string, type: 'outbound' | 'return') => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName] || { outboundTitle: '', returnTitle: '', outbound: [], returnTrip: [] };
        const items = type === 'outbound' ? [...(currentRoute.outboundRoadSigns || [])] : [...(currentRoute.returnRoadSigns || [])];
        
        items.push({ label: '', instruction: '', checked: false });
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outboundRoadSigns = items;
        else updatedRoute.returnRoadSigns = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const updateSignItem = (busName: string, type: 'outbound' | 'return', idx: number, field: keyof RoadSignItem, value: any) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName];
        if (!currentRoute) return;
        
        const items = type === 'outbound' ? [...(currentRoute.outboundRoadSigns || [])] : [...(currentRoute.returnRoadSigns || [])];
        items[idx] = { ...items[idx], [field]: value };
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outboundRoadSigns = items;
        else updatedRoute.returnRoadSigns = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    const removeSignItem = (busName: string, type: 'outbound' | 'return', idx: number) => {
        const routes = currentEvent.busRoutes || {};
        const currentRoute = routes[busName];
        if (!currentRoute) return;
        
        const items = type === 'outbound' ? [...(currentRoute.outboundRoadSigns || [])] : [...(currentRoute.returnRoadSigns || [])];
        items.splice(idx, 1);
        
        const updatedRoute = { ...currentRoute };
        if (type === 'outbound') updatedRoute.outboundRoadSigns = items;
        else updatedRoute.returnRoadSigns = items;
        
        onUpdateEvent({ ...currentEvent, busRoutes: { ...routes, [busName]: updatedRoute } });
    };

    return {
        collapsedBuses, toggleBusCollapse,
        collapsedSigns, toggleSignCollapse,
        signMenuIdx, setSignMenuIdx,
        handleBusRouteFieldUpdate,
        addRouteItem, updateRouteItem, removeRouteItem,
        addSignItem, updateSignItem, removeSignItem
    };
}
