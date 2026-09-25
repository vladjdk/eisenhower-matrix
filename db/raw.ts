import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('Board storage unavailable');return env.DB;}
