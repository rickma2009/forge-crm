import type { PrismaClient } from '../generated/prisma/client';
import { salesEnhancementActions } from './sales-permissions';
// Additive, scoped initialization. Existing role grants and rule content remain human-owned.
export async function initializeSalesEnhancement(db:PrismaClient,code:string){
 return db.$transaction(async tx=>{
  const app=await tx.sysApplication.findFirstOrThrow({where:{applicationCode:code,status:'ACTIVE'}});
  await tx.$queryRaw`SELECT id FROM sys_application WHERE id=${app.id}::uuid FOR UPDATE`;
  const actor=await tx.iamUser.findFirstOrThrow({where:{tenantId:app.tenantId,account:'admin'}});
  const manager=await tx.iamRole.findFirst({where:{applicationId:app.id,roleCode:'system-manager',isSystem:true}});
  const names=new Set(['suggestion-view','suggestion-adopt','comment-view','comment-create','comment-edit-own','comment-moderate','score-view','score-override','score-rule-manage']);
  for(const action of salesEnhancementActions.filter(a=>names.has(a.actionCode))){
   const menu=await tx.uiMenu.findFirstOrThrow({where:{applicationId:app.id,menuCode:action.menuCode}});
   const permission=await tx.sysPermission.upsert({where:{applicationId_permissionCode:{applicationId:app.id,permissionCode:`menu.${action.menuCode}.${action.actionCode}`}},update:{permissionName:action.actionName!,resourceCode:action.menuCode,actionCode:action.actionCode},create:{applicationId:app.id,permissionCode:`menu.${action.menuCode}.${action.actionCode}`,permissionName:action.actionName!,resourceCode:action.menuCode,actionCode:action.actionCode,source:'SYSTEM'}});
   await tx.uiMenuAction.upsert({where:{menuId_actionCode:{menuId:menu.id,actionCode:action.actionCode}},update:{permissionId:permission.id,actionName:action.actionName!},create:{menuId:menu.id,permissionId:permission.id,actionCode:action.actionCode,actionName:action.actionName!,actionType:'CUSTOM',sortNo:action.sortNo}});
   if(menu.pageResourceId)await tx.sysPageButton.upsert({where:{pageId_buttonCode:{pageId:menu.pageResourceId,buttonCode:action.actionCode}},update:{buttonName:action.actionName!},create:{pageId:menu.pageResourceId,buttonCode:action.actionCode,buttonName:action.actionName!,buttonType:'TOOL',sortNo:action.sortNo,createdBy:actor.id,updatedBy:actor.id}});
   if(manager)await tx.iamRolePermission.upsert({where:{roleId_permissionId:{roleId:manager.id,permissionId:permission.id}},update:{},create:{applicationId:app.id,roleId:manager.id,permissionId:permission.id}});
  }
  if(!await tx.sdScoreRuleSet.findFirst({where:{applicationId:app.id}}))await tx.sdScoreRuleSet.create({data:{tenantId:app.tenantId,applicationId:app.id,systemCode:code,ruleVersion:1,state:'PUBLISHED',publishedAt:new Date(),creatorId:actor.id,config:{sourceScores:{},amountThresholds:{}}}});
  return {initialized:true};
 });
}
