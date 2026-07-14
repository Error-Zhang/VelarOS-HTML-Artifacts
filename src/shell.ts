import type { HtmlArtifactRenderPatch } from './protocol'

export type HtmlArtifactContentKind = 'html' | 'svg'

export interface HtmlArtifactBridgeMessages {
  render: string
  patch: string
  resize: string
  sendPrompt: string
  openLink: string
  generic: string
  error: string
}

export interface HtmlArtifactDocumentOptions {
  contentKind?: HtmlArtifactContentKind
  designCss?: string
  svgFitCss?: string
  bodyStyle?: string
  bridgeMessages?: Partial<HtmlArtifactBridgeMessages>
  initialPatches?: readonly HtmlArtifactRenderPatch[]
}

export interface HtmlArtifactShellDocumentOptions extends HtmlArtifactDocumentOptions {
  rootId?: string
}

const DEFAULT_ROOT_ID = 'velaros-html-artifact-root'
const DEFAULT_BRIDGE_MESSAGES: HtmlArtifactBridgeMessages = {
  render: 'velaros-html-artifact-render',
  patch: 'velaros-html-artifact-patch',
  resize: 'velaros-html-artifact-resize',
  sendPrompt: 'velaros-html-artifact-send-prompt',
  openLink: 'velaros-html-artifact-open-link',
  generic: 'velaros-html-artifact-message',
  error: 'velaros-html-artifact-error',
}

export function inferHtmlArtifactContentKind(content: string): HtmlArtifactContentKind {
  return /^<svg[\s>]/i.test(content.trimStart()) ? 'svg' : 'html'
}

function resolveBridgeMessages(
  messages: Partial<HtmlArtifactBridgeMessages> | undefined
): HtmlArtifactBridgeMessages {
  return { ...DEFAULT_BRIDGE_MESSAGES, ...messages }
}

function resolveBodyStyle(
  kind: HtmlArtifactContentKind,
  bodyStyle: string | undefined
): string {
  if (bodyStyle) return bodyStyle

  return kind === 'svg'
    ? 'margin:0;width:100%;min-height:100%;background:transparent;'
    : 'margin:0;background:transparent;'
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function jsString(value: string): string {
  return JSON.stringify(value)
}

function safeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

function bridgeHeadScript(messages: HtmlArtifactBridgeMessages): string {
  return (
    `window.__htmlArtifactReportRuntimeError=function(error,meta){` +
    `try{` +
    `var payload={type:${jsString(messages.error)},message:String(error&&error.message||error&&error.reason||error||'Artifact error')};` +
    `if(meta&&meta.phase)payload.phase=String(meta.phase);` +
    `if(meta&&meta.patchType)payload.patchType=String(meta.patchType);` +
    `if(meta&&meta.patchId)payload.patchId=String(meta.patchId);` +
    `window.parent.postMessage(payload,'*');` +
    `}catch(ignore){}` +
    `};` +
    `window.sendPrompt=function(text){window.parent.postMessage({type:${jsString(messages.sendPrompt)},prompt:String(text||'')},'*')};` +
    `window.openLink=function(url){window.parent.postMessage({type:${jsString(messages.openLink)},url:String(url||'')},'*')};` +
    `window.widgetBridge={send:function(payload){window.parent.postMessage({type:${jsString(messages.generic)},payload:payload},'*')}};` +
    `window.addEventListener('error',function(event){window.__htmlArtifactReportRuntimeError(event&&event.error||event&&event.message||'Artifact error',{phase:'window'});});` +
    `window.addEventListener('unhandledrejection',function(event){window.__htmlArtifactReportRuntimeError(event&&event.reason||'Unhandled artifact promise rejection',{phase:'script'});});`
  )
}

function resizeTailScript(messages: HtmlArtifactBridgeMessages): string {
  return (
    `(function(){` +
    `function measureContentSize(target){` +
    `var body=document.body||{};var doc=document.documentElement||{};var viewportWidth=Math.max(doc.clientWidth||0,window.innerWidth||0);` +
    `var nodes=target?Array.prototype.slice.call(target.children||[]):[];` +
    `var contentWidth=0;var height=0;nodes.forEach(function(node){` +
    `if(!node)return;var rect=node.getBoundingClientRect?node.getBoundingClientRect():{width:0,height:0,bottom:0};` +
    `contentWidth=Math.max(contentWidth,node.scrollWidth||0,node.offsetWidth||0,Math.ceil(rect.width||0));` +
    `height=Math.max(height,node.scrollHeight||0,node.offsetHeight||0,Math.ceil(rect.height||0),Math.ceil(rect.bottom||0));` +
    `});` +
    `var overflowWidth=Math.max(target&&target.scrollWidth||0,body.scrollWidth||0,doc.scrollWidth||0);` +
    `if(overflowWidth>viewportWidth+1)contentWidth=Math.max(contentWidth,overflowWidth);` +
    `var width=contentWidth||viewportWidth||overflowWidth;` +
    `if(target&&target!==body){height=Math.max(height,target.scrollHeight||0,target.offsetHeight||0);}` +
    `return{width:Math.max(1,Math.ceil(width)),height:Math.max(1,Math.ceil(height))};` +
    `}` +
    `function reportHeight(){` +
    `var size=measureContentSize(document.body);` +
    `window.parent.postMessage({type:${jsString(messages.resize)},height:size.height,width:size.width,naturalHeight:size.height,naturalWidth:size.width,rendered:true},'*');` +
    `}` +
    `if(window.ResizeObserver){new ResizeObserver(reportHeight).observe(document.body);}` +
    `window.addEventListener('resize',reportHeight);` +
    `window.addEventListener('load',function(){setTimeout(reportHeight,120);setTimeout(reportHeight,420);});` +
    `setTimeout(reportHeight,40);` +
    `})();`
  )
}

function patchRuntimeScript(rootExpression: string, _messages: HtmlArtifactBridgeMessages): string {
  return (
    `var root=${rootExpression};` +
    `function readPatchId(patch){return patch&&String(patch.scriptId||patch.styleId||patch.target||'');}` +
    `function reportPatchError(error,patch,phase){` +
    `try{` +
    `var meta={phase:phase||'patch'};` +
    `if(patch&&patch.type)meta.patchType=String(patch.type);` +
    `var patchId=readPatchId(patch);` +
    `if(patchId)meta.patchId=patchId;` +
    `if(window.__htmlArtifactReportRuntimeError){window.__htmlArtifactReportRuntimeError(error||'Artifact patch error',meta);return;}` +
    `}catch(ignore){}` +
    `}` +
    `window.__htmlArtifactReportPatchError=function(error,meta){reportPatchError(error,meta,'script');};` +
    `function createArtifactEvent(name){` +
    `try{return new Event(name,{bubbles:true});}catch(ignore){var event=document.createEvent('Event');event.initEvent(name,true,false);return event;}` +
    `}` +
    `function invokeReadyListener(listener,event){` +
    `try{` +
    `if(typeof listener==='function'){listener.call(document,event);return;}` +
    `if(listener&&typeof listener.handleEvent==='function'){listener.handleEvent(event);}` +
    `}catch(error){reportPatchError(error,null,'script');}` +
    `}` +
    `function installLateDomReadyShim(){` +
    `if(document.__htmlArtifactLateDomReadyShim)return;` +
    `document.__htmlArtifactLateDomReadyShim=true;` +
    `var originalAddEventListener=document.addEventListener;` +
    `document.addEventListener=function(type,listener,options){` +
    `if(type==='DOMContentLoaded'&&document.readyState!=='loading'&&listener){` +
    `var event=createArtifactEvent('DOMContentLoaded');` +
    `setTimeout(function(){invokeReadyListener(listener,event);},0);` +
    `return;` +
    `}` +
    `return originalAddEventListener.call(document,type,listener,options);` +
    `};` +
    `}` +
    `function dispatchArtifactReady(){` +
    `try{` +
    `document.dispatchEvent(createArtifactEvent('velaros:artifact-ready'));` +
    `if(root){root.dispatchEvent(createArtifactEvent('velaros:artifact-ready'));}` +
    `window.dispatchEvent(createArtifactEvent('velaros:artifact-ready'));` +
    `}catch(error){reportPatchError(error,null,'render');}` +
    `}` +
    `installLateDomReadyShim();` +
    `function isAllowedExternalScript(src){` +
    `try{var raw=String(src||'').trim();if(raw.indexOf('//')===0)raw='https:'+raw;var url=new URL(raw,window.location.href);return url.protocol==='https:';}catch(error){return false;}` +
    `}` +
    `function activateScripts(){` +
    `var scripts=root?Array.prototype.slice.call(root.querySelectorAll('script:not([data-velaros-script-activated])')):[];` +
    `function activateScriptAt(index){` +
    `if(index>=scripts.length)return;` +
    `var script=scripts[index];` +
    `var next=document.createElement('script');` +
    `next.setAttribute('data-velaros-script-activated','true');` +
    `var hasAllowedSrc=false;var hasBlockedSrc=false;` +
    `Array.prototype.slice.call(script.attributes).forEach(function(attr){var attrName=String(attr.name||'').toLowerCase();if(attrName==='src'){if(isAllowedExternalScript(attr.value)){hasAllowedSrc=true;next.setAttribute(attr.name,attr.value);return;}hasBlockedSrc=true;next.setAttribute('data-blocked-src',attr.value);return;}next.setAttribute(attr.name,attr.value);});` +
    `next.onerror=function(event){reportPatchError(event&&event.error||'Artifact script load failed',{type:'script',scriptId:next.getAttribute('data-artifact-script')||next.src||'inline'},'script');};` +
    `if(hasAllowedSrc){next.async=false;next.onload=function(){activateScriptAt(index+1);};next.onerror=function(event){reportPatchError(event&&event.error||'Artifact script load failed',{type:'script',scriptId:next.getAttribute('data-artifact-script')||next.src||'inline'},'script');activateScriptAt(index+1);};if(script.parentNode){script.parentNode.replaceChild(next,script);}else{activateScriptAt(index+1);}return;}` +
    `if(hasBlockedSrc){reportPatchError('Blocked external script: '+next.getAttribute('data-blocked-src'),{type:'script',scriptId:next.getAttribute('data-artifact-script')||next.getAttribute('data-blocked-src')||'inline'},'script');}` +
    `next.text=script.text||script.textContent||'';` +
    `if(script.parentNode){script.parentNode.replaceChild(next,script);}` +
    `activateScriptAt(index+1);` +
    `}` +
    `activateScriptAt(0);` +
    `}` +
    `function sameNode(a,b){return a&&b&&a.nodeType===b.nodeType&&(a.nodeType!==1||a.nodeName===b.nodeName);}` +
    `function syncAttributes(target,source){` +
    `if(target.nodeType!==1||source.nodeType!==1)return;` +
    `Array.prototype.slice.call(target.attributes).forEach(function(attr){if(!source.hasAttribute(attr.name))target.removeAttribute(attr.name);});` +
    `Array.prototype.slice.call(source.attributes).forEach(function(attr){if(target.getAttribute(attr.name)!==attr.value)target.setAttribute(attr.name,attr.value);});` +
    `}` +
    `function patchNode(target,source){` +
    `if(!sameNode(target,source)){target.parentNode&&target.parentNode.replaceChild(source.cloneNode(true),target);return;}` +
    `if(target.nodeType===3){if(target.nodeValue!==source.nodeValue)target.nodeValue=source.nodeValue;return;}` +
    `syncAttributes(target,source);patchChildren(target,source);` +
    `}` +
    `function patchChildren(target,source){` +
    `var sourceChildren=Array.prototype.slice.call(source.childNodes);` +
    `var targetChild=target.firstChild;` +
    `sourceChildren.forEach(function(sourceChild){` +
    `if(!targetChild){target.appendChild(sourceChild.cloneNode(true));return;}` +
    `var nextTarget=targetChild.nextSibling;` +
    `patchNode(targetChild,sourceChild);` +
    `targetChild=nextTarget;` +
    `});` +
    `while(targetChild){var next=targetChild.nextSibling;target.removeChild(targetChild);targetChild=next;}` +
    `}` +
    `function findPatchTarget(selector){` +
    `if(!root)return;` +
    `if(!selector)return root;` +
    `try{if(root.matches&&root.matches(selector))return root;return root.querySelector(selector);}catch(error){return null;}` +
    `}` +
    `function applyStylePatch(patch){` +
    `try{` +
    `var styleId=String(patch.styleId||patch.target||'default');` +
    `var styles=Array.prototype.slice.call(document.head.querySelectorAll('style[data-artifact-style]'));` +
    `var style=styles.find(function(entry){return entry.getAttribute('data-artifact-style')===styleId;});` +
    `if(!style){style=document.createElement('style');style.setAttribute('data-artifact-style',styleId);document.head.appendChild(style);}` +
    `style.textContent=String(patch.css||'');` +
    `}catch(error){reportPatchError(error,patch,'patch');}` +
    `}` +
    `function applyScriptPatch(patch){` +
    `try{` +
    `var scriptId=String(patch.scriptId||patch.target||'default');` +
    `var scriptName=scriptId.replace(/[^\\w.-]+/g,'-')||'script';` +
    `var scripts=Array.prototype.slice.call(document.querySelectorAll('script[data-artifact-script]'));` +
    `scripts.forEach(function(entry){if(entry.getAttribute('data-artifact-script')===scriptId){entry.parentNode&&entry.parentNode.removeChild(entry);}});` +
    `var script=document.createElement('script');` +
    `script.setAttribute('data-artifact-script',scriptId);` +
    `script.onerror=function(event){reportPatchError(event&&event.error||'Artifact script patch load failed',patch,'script');};` +
    `script.text='try{\\n'+String(patch.code||'')+'\\n}catch(error){if(window.__htmlArtifactReportPatchError){window.__htmlArtifactReportPatchError(error,{type:"script",scriptId:'+JSON.stringify(scriptId)+'});}}\\n//# sourceURL=html-artifact-'+scriptName+'.js';` +
    `document.body.appendChild(script);` +
    `}catch(error){reportPatchError(error,patch,'script');}` +
    `}` +
    `function applyPatch(patch){` +
    `try{` +
    `if(!patch||!patch.type)return;` +
    `if(patch.type==='style'){applyStylePatch(patch);return;}` +
    `if(patch.type==='script'){applyScriptPatch(patch);return;}` +
    `var target=findPatchTarget(patch.target);` +
    `if(!target)return;` +
    `var template=document.createElement('template');` +
    `template.innerHTML=String(patch.html||'');` +
    `if(patch.type==='append'){Array.prototype.slice.call(template.content.childNodes).forEach(function(child){target.appendChild(child.cloneNode(true));});}` +
    `else{patchChildren(target,template.content);}` +
    `activateScripts();` +
    `}catch(error){reportPatchError(error,patch,'patch');}` +
    `}` +
    `function applyPatches(patches){` +
    `if(!Array.isArray(patches))return;` +
    `patches.forEach(applyPatch);` +
    `}` +
    `function render(html,patches){` +
    `if(!root)return;` +
    `var template=document.createElement('template');` +
    `template.innerHTML=String(html||'');` +
    `patchChildren(root,template.content);` +
    `applyPatches(patches);` +
    `activateScripts();` +
    `dispatchArtifactReady();` +
    `}`
  )
}

function liveRenderTailScript(rootId: string, messages: HtmlArtifactBridgeMessages): string {
  return (
    `(function(){${patchRuntimeScript(
      `document.getElementById(${jsString(rootId)})`,
      messages
    )}function measureContentSize(target){` +
    `var body=document.body||{};var doc=document.documentElement||{};var viewportWidth=Math.max(doc.clientWidth||0,window.innerWidth||0);` +
    `var rootRect=target&&target.getBoundingClientRect?target.getBoundingClientRect():{top:0,left:0};` +
    `var nodes=target?Array.prototype.slice.call(target.children||[]):[];` +
    `var contentWidth=0;var height=0;function measureNode(node,originRect){` +
    `if(!node)return;var rect=node.getBoundingClientRect?node.getBoundingClientRect():{width:0,height:0,bottom:0,right:0};` +
    `var right=Math.ceil((rect.right||0)-(originRect.left||0));var bottom=Math.ceil((rect.bottom||0)-(originRect.top||0));` +
    `contentWidth=Math.max(contentWidth,node.scrollWidth||0,node.offsetWidth||0,Math.ceil(rect.width||0),right);` +
    `height=Math.max(height,node.scrollHeight||0,node.offsetHeight||0,Math.ceil(rect.height||0),bottom);` +
    `}nodes.forEach(function(node){` +
    `measureNode(node,rootRect);` +
    `});` +
    `if(contentWidth&&target&&target!==body&&window.getComputedStyle){var style=window.getComputedStyle(body);contentWidth+=parseFloat(style.paddingLeft)||0;contentWidth+=parseFloat(style.paddingRight)||0;}` +
    `var overflowWidth=Math.max(target&&target.scrollWidth||0,body.scrollWidth||0,doc.scrollWidth||0);` +
    `if(overflowWidth>viewportWidth+1)contentWidth=Math.max(contentWidth,overflowWidth);` +
    `var width=contentWidth||viewportWidth||overflowWidth;` +
    `if(target&&target!==body){var bodyRect=body.getBoundingClientRect?body.getBoundingClientRect():{top:0,left:0};var bodyNodes=Array.prototype.slice.call(body.children||[]);bodyNodes.forEach(function(node){if(node===target)return;measureNode(node,bodyRect);});height=Math.max(height,target.scrollHeight||0,target.offsetHeight||0);}` +
    `return{width:Math.max(1,Math.ceil(width)),height:Math.max(1,Math.ceil(height))};` +
    `}` +
    `var hasRendered=false;` +
    `function reportHeight(){` +
    `if(!hasRendered)return;` +
    `var size=measureContentSize(root||document.body);` +
    `window.parent.postMessage({type:${jsString(messages.resize)},height:size.height,width:size.width,naturalHeight:size.height,naturalWidth:size.width,rendered:true},'*');` +
    `}` +
    `function reportSoon(){` +
    `setTimeout(reportHeight,0);setTimeout(reportHeight,80);setTimeout(reportHeight,360);` +
    `}` +
    `var pendingPatches=[];` +
    `var pendingPatchFrame=0;` +
    `function flushQueuedPatches(){` +
    `pendingPatchFrame=0;` +
    `var patches=pendingPatches;` +
    `pendingPatches=[];` +
    `applyPatches(patches);` +
    `dispatchArtifactReady();` +
    `reportSoon();` +
    `}` +
    `function queuePatches(patches){` +
    `if(!Array.isArray(patches)||!patches.length)return;` +
    `pendingPatches=pendingPatches.concat(patches);` +
    `if(pendingPatchFrame)return;` +
    `pendingPatchFrame=(window.requestAnimationFrame||function(callback){return setTimeout(callback,0);})(flushQueuedPatches);` +
    `}` +
    `window.addEventListener('message',function(event){` +
    `if(event.source!==window.parent)return;` +
    `var data=event.data||{};` +
    `if(data.type===${jsString(messages.render)}){render(data.html,data.patches);hasRendered=true;reportSoon();}` +
    `if(data.type===${jsString(messages.patch)}){queuePatches(data.patches||(data.patch?[data.patch]:[]));}` +
    `});` +
    `if(window.ResizeObserver){var resizeObserver=new ResizeObserver(reportHeight);if(root)resizeObserver.observe(root);resizeObserver.observe(body);}` +
    `if(window.MutationObserver){new MutationObserver(reportSoon).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','width','height']});}` +
    `window.addEventListener('resize',reportHeight);` +
    `window.addEventListener('load',function(){setTimeout(reportHeight,80);setTimeout(reportHeight,360);});` +
    `setTimeout(reportHeight,40);` +
    `})();`
  )
}

function initialPatchesTailScript(
  patches: readonly HtmlArtifactRenderPatch[],
  messages: HtmlArtifactBridgeMessages
): string {
  return (
    `(function(){${patchRuntimeScript(
      'document.body',
      messages
    )}var initialPatches=${safeJsonForInlineScript(patches)};` +
    `applyPatches(initialPatches);` +
    `dispatchArtifactReady();` +
    `})();`
  )
}

export function buildHtmlArtifactDocument(
  content: string,
  options: HtmlArtifactDocumentOptions = {}
): string {
  const kind = options.contentKind ?? inferHtmlArtifactContentKind(content)
  const messages = resolveBridgeMessages(options.bridgeMessages)
  const bodyStyle = resolveBodyStyle(kind, options.bodyStyle)
  const svgCss = kind === 'svg' ? options.svgFitCss ?? '' : ''

  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>${options.designCss ?? ''}${svgCss}body{${bodyStyle}}</style>` +
    `<script>${bridgeHeadScript(messages)}</script></head><body>${content}<script>${initialPatchesTailScript(
      options.initialPatches ?? [],
      messages
    )}</script>` +
    `<script>${resizeTailScript(messages)}</script></body></html>`
  )
}

export function buildHtmlArtifactShellDocument(
  options: HtmlArtifactShellDocumentOptions = {}
): string {
  const rootId = options.rootId ?? DEFAULT_ROOT_ID
  const kind = options.contentKind ?? 'html'
  const messages = resolveBridgeMessages(options.bridgeMessages)
  const bodyStyle = resolveBodyStyle(kind, options.bodyStyle)
  const svgCss = kind === 'svg' ? options.svgFitCss ?? '' : ''

  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<style>${options.designCss ?? ''}${svgCss}body{${bodyStyle}}#${escapeHtmlAttribute(rootId)}{width:100%;min-width:0;}</style>` +
    `<script>${bridgeHeadScript(messages)}</script></head><body>` +
    `<div id="${escapeHtmlAttribute(rootId)}"></div>` +
    `<script>${liveRenderTailScript(rootId, messages)}</script></body></html>`
  )
}
