import { useId, useMemo, useState } from "react";
import { getMonsterTemplateRenderClass, scopeMonsterTemplateCss, type MonsterTemplate } from "../../../../domain/monster-templates/monster-template";
import { renderMarkdown } from "./markdown";
/** Campos compartidos por el gestor local y los borradores del catálogo de servicio. */
export function MonsterTemplateFields({template,onChange}:{template:MonsterTemplate;onChange:(template:MonsterTemplate)=>void}){
  const[preview,setPreview]=useState(false);const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");const scope=`template-preview-${id}`;
  const html=useMemo(()=>renderMarkdown(template.markdown),[template.markdown]);
  const css=useMemo(()=>scopeMonsterTemplateCss(template.css,scope),[template.css,scope]);
  return <div className="monster-template-fields"><label>Nombre<input required maxLength={200} value={template.name} onChange={e=>onChange({...template,name:e.target.value})}/></label><label>Sistema<input required maxLength={200} value={template.system} onChange={e=>onChange({...template,system:e.target.value})}/></label><button type="button" onClick={()=>setPreview(p=>!p)}>{preview?"Editar contenido":"Previsualizar ficha"}</button>{preview?<div className={`markdown-content ${scope}`}><style>{css}</style><div className={getMonsterTemplateRenderClass(template)} dangerouslySetInnerHTML={{__html:html}}/></div>:<><label>Markdown<textarea rows={8} spellCheck={false} value={template.markdown} onChange={e=>onChange({...template,markdown:e.target.value})}/></label><p>Define campos escribiendo marcadores como {"{{Nombre}}"} o {"{{CA}}"} en el Markdown. La ficha conserva estos marcadores editables.</p><label>CSS scoped<textarea rows={6} spellCheck={false} value={template.css} onChange={e=>onChange({...template,css:e.target.value})}/></label></>}</div>;
}
