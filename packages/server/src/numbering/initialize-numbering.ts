import type { PrismaClient } from '../generated/prisma/client';
import { initializeNumberingRules } from './numbering-defaults';
export async function initializeNumbering(db:PrismaClient,code:string){return db.$transaction(async tx=>{
 const app=await tx.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
 await tx.$queryRaw`SELECT id FROM sys_application WHERE id=${app.id}::uuid FOR UPDATE`;
 const parent=await tx.uiMenu.findFirstOrThrow({where:{applicationId:app.id,menuCode:'system'}});
 const actor=await tx.iamUser.findFirstOrThrow({where:{tenantId:app.tenantId,account:'admin'}});
 const manager=await tx.iamRole.findFirstOrThrow({where:{applicationId:app.id,roleCode:'system-manager',isSystem:true}});
 const menuCode='system-code-rules',path='/showcase/system/code-rules';
 const page=await tx.sysPageResource.upsert({where:{applicationId_pageCode:{applicationId:app.id,pageCode:menuCode}},update:{},create:{tenantId:app.tenantId,applicationId:app.id,parentId:parent.pageResourceId,pageCode:menuCode,pageName:'编码规则',pageType:'PAGE',routePath:path,iconKey:'settings',sortNo:120,createdBy:actor.id,updatedBy:actor.id}});
 const permission=async (action:string,name:string)=>tx.sysPermission.upsert({where:{applicationId_permissionCode:{applicationId:app.id,permissionCode:action==='access'?`navigation.${menuCode}.access`:`menu.${menuCode}.${action}`}},update:{},create:{applicationId:app.id,permissionCode:action==='access'?`navigation.${menuCode}.access`:`menu.${menuCode}.${action}`,permissionName:name,resourceCode:menuCode,actionCode:action,source:'SYSTEM'}});
 const access=await permission('access','访问编码规则');
 const menu=await tx.uiMenu.upsert({where:{systemCode_menuCode:{systemCode:code,menuCode}},update:{},create:{applicationId:app.id,systemCode:code,menuCode,menuName:'编码规则',nodeType:'PAGE',menuType:'PAGE',parentId:parent.id,pageResourceId:page.id,accessPermissionId:access.id,routePath:path,iconKey:'settings',sortNo:120}});
 for(const [i,[action,name]] of [['access','访问编码规则'],['view','查看编码规则'],['create','新增规则'],['update','编辑规则'],['delete','删除规则'],['allocate','接口取号']].entries()){
  const p=await permission(action!,name!);
  if(action!=='access'){
   await tx.uiMenuAction.upsert({where:{menuId_actionCode:{menuId:menu.id,actionCode:action!}},update:{},create:{menuId:menu.id,permissionId:p.id,actionCode:action!,actionName:name!,actionType:action==='view'?'VIEW':'CUSTOM',sortNo:i*10}});
   await tx.sysPageButton.upsert({where:{pageId_buttonCode:{pageId:page.id,buttonCode:action!}},update:{},create:{pageId:page.id,buttonCode:action!,buttonName:name!,buttonType:'TOOL',sortNo:i*10,createdBy:actor.id,updatedBy:actor.id}});
  }
  await tx.iamRolePermission.upsert({where:{roleId_permissionId:{roleId:manager.id,permissionId:p.id}},update:{},create:{applicationId:app.id,roleId:manager.id,permissionId:p.id}});
 }
 await initializeNumberingRules(tx,[code]);return {initialized:true,rules:12};
});}
