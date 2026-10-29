import { resolve } from "node:path";
export default {
  root:resolve(import.meta.dirname),
  publicDir:resolve(import.meta.dirname,"../renderer/public"),
  server:{host:"127.0.0.1",port:5175,strictPort:true,proxy:{"/api/v1":{target:"http://127.0.0.1:8787",changeOrigin:false}}},
  build:{outDir:resolve(import.meta.dirname,"../../out/web"),emptyOutDir:true}
};
