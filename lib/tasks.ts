export type Link={label:string;url:string};
export type Task={id:string;title:string;notes:string;q:number;x:number;y:number;done:boolean;due:string;sources:Link[];links:Link[];created_at?:string;aged_from?:string;done_at?:string};
export const quadrants=[{name:'Do first',label:'DO',hint:'Important and time-sensitive'},{name:'Schedule',label:'PLAN',hint:'Protect time for meaningful work'},{name:'Delegate',label:'HAND OFF',hint:'Keep it moving without doing it all'},{name:'Let go',label:'DEFER',hint:'Not everything needs your attention'}];
export function positionFor(q:number,n:number){return {x:(q%2?940:80)+(n%2)*330,y:(q>=2?870:240)+(Math.floor(n/2)%3)*185+Math.floor(n/6)*8};}
export const seedTasks:Task[]=[];
