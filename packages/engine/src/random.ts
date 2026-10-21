import type {State} from './types';
export function seedNumber(seed:string|number):number {let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function random(s:Pick<State,'rng'>,stream:string,max:number):number {let n=s.rng[stream]??seedNumber(stream);n=(n+0x6d2b79f5)>>>0;s.rng[stream]=n;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return Math.floor(((t^(t>>>14))>>>0)/4294967296*max);}
export function canonical(value:unknown):string {if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).filter(k=>(value as Record<string,unknown>)[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';}
export function hash(value:unknown):string {const text=canonical(value);let a=2166136261,b=0x9e3779b9;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),0x85ebca6b);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export const clone=<T>(x:T):T=>structuredClone(x);
