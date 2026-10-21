import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export default defineConfig({root,define:{'process.env':JSON.stringify({NODE_ENV:'production',NEXT_PUBLIC_DEMO_RECORDING:'true'})},resolve:{alias:[{find:'@',replacement:root+'src'},{find:'next/link',replacement:root+'recording/Link.tsx'},{find:'next/navigation',replacement:root+'recording/navigation.ts'},{find:'next/image',replacement:root+'recording/Image.tsx'},{find:'next/font/google',replacement:root+'recording/fonts.ts'},{find:'next/dynamic',replacement:root+'recording/dynamic.tsx'}]},build:{outDir:'dist-demo',emptyOutDir:true},server:{host:'127.0.0.1'}});
