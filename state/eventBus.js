// Lightweight event bus for UI decoupling
export class EventBus {
  constructor(){ this.listeners = new Map(); }
  on(type, cb){ if(!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(cb); return () => this.off(type, cb); }
  off(type, cb){ const set = this.listeners.get(type); if(!set) return; set.delete(cb); if(set.size===0) this.listeners.delete(type); }
  emit(type, payload){ const set = this.listeners.get(type); if(!set) return; for(const cb of Array.from(set)){ try{ cb(payload);}catch(e){ console.error("event handler error", e); } } }
}

const eventBus = new EventBus();
export default eventBus;
