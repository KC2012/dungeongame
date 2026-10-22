import {writeFileSync} from 'node:fs';
import {spriteNames,spritePixels,palette} from '../apps/client/src/assets';
const width=640,cell=80,height=Math.ceil(spriteNames.length/8)*100;
let body='';spriteNames.forEach((name,i)=>{const x=i%8*cell,y=Math.floor(i/8)*100;body+=`<text x="${x+4}" y="${y+16}" fill="#d9e9df" font-size="10">${name}</text>`;spritePixels(name).forEach((r,yy)=>r.forEach((c,xx)=>{if(palette[c])body+=`<rect x="${x+8+xx*4}" y="${y+24+yy*4}" width="4" height="4" fill="${palette[c]}"/>`}))});
writeFileSync('docs/alpha3/sprite-sheet.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#111e24;font-family:monospace">${body}</svg>`);
