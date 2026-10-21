import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('apps/client'),build:{target:"es2022",outDir:resolve('dist/client'),emptyOutDir:true},server:{host:'127.0.0.1',port:5173,proxy:{'/api':'http://127.0.0.1:2567','/matchmake':'http://127.0.0.1:2567','/ws':{target:'ws://127.0.0.1:2567',ws:true}}}});
