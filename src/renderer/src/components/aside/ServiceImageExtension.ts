import { Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { assetUrl } from "../../../../shared/contracts/service-references";
/** El documento conserva asset:; el DOM solo usa la ruta autenticada permitida. */
export const ServiceImage = Node.create({
  name:"image",group:"block",atom:true,
  addAttributes(){return {src:{default:"",parseHTML:(element:HTMLElement)=>element.dataset.reference??element.getAttribute("src")??""},alt:{default:"Imagen de nota"}};},
  parseHTML(){return [{tag:"img[src]"}];},
  renderHTML({node}){const reference=String(node.attrs.src);const url=assetUrl(reference);return url?["img",{src:url,"data-reference":reference,alt:String(node.attrs.alt),style:"max-width:100%"}]:["span",{"data-reference":reference},`Imagen ausente: ${reference}`];},
  addStorage(){return {markdown:{serialize(state:{write:(value:string)=>void;closeBlock:(node:ProseMirrorNode)=>void},node:ProseMirrorNode){state.write(`![${String(node.attrs.alt).replace(/[[\]\n]/g,"")}](${String(node.attrs.src).replace(/[\s)]/g,encodeURIComponent)})`);state.closeBlock(node);},parse:{}}};}
});
