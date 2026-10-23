import {config} from 'dotenv';
import {DatabaseService} from '../src/database/database.service';
import {businessListDefaultConfig} from '@forge-crm/contracts';
config({path:'../../.env',quiet:true});
const db=new DatabaseService(process.env.DATABASE_URL!);
async function main(){await db.$transaction(async tx=>{
 const app=await tx.sysApplication.findFirstOrThrow({where:{applicationCode:'demo-portal',status:'ACTIVE'}});
 const actor=await tx.iamUser.findFirstOrThrow({where:{tenantId:app.tenantId,normalizedAccount:'admin'}});
 const role=await tx.iamRole.findUniqueOrThrow({where:{systemCode_roleCode:{systemCode:'demo-portal',roleCode:'system-manager'}}});
 for(const [code,name,path,parent,action,actionName] of [['approval-center','审批中心','/showcase/approvals',null,'process','处理审批'],['workflow-settings','工作流设置','/showcase/system/workflows','system','manage','发布及运维流程']] as const){
  const parentPage=await tx.sysPageResource.findUniqueOrThrow({where:{applicationId_pageCode:{applicationId:app.id,pageCode:parent??'demo-portal'}}});
  const parentMenu=parent?await tx.uiMenu.findUniqueOrThrow({where:{systemCode_menuCode:{systemCode:'demo-portal',menuCode:parent}}}):null;
  const page=await tx.sysPageResource.upsert({where:{applicationId_pageCode:{applicationId:app.id,pageCode:code}},update:{},create:{tenantId:app.tenantId,applicationId:app.id,parentId:parentPage.id,pageCode:code,pageName:name,pageType:'PAGE',routePath:path,iconKey:'settings',sortNo:130,createdBy:actor.id,updatedBy:actor.id}});
  const perm=async(key:string,label:string,a:string)=>tx.sysPermission.upsert({where:{applicationId_permissionCode:{applicationId:app.id,permissionCode:key}},update:{},create:{applicationId:app.id,permissionCode:key,permissionName:label,resourceCode:code,actionCode:a,source:'SYSTEM'}});
  const access=await perm(`navigation.${code}.access`,`访问${name}`,'access');
  const menu=await tx.uiMenu.upsert({where:{systemCode_menuCode:{systemCode:'demo-portal',menuCode:code}},update:{},create:{applicationId:app.id,accessPermissionId:access.id,pageResourceId:page.id,systemCode:'demo-portal',menuCode:code,menuName:name,nodeType:'PAGE',parentId:parentMenu?.id,routePath:path,iconKey:'settings',sortNo:130,menuType:'PAGE'}});
  const perms=[access];
  for(const [a,label] of [['view','查看'],[action,actionName]]){const p=await perm(`menu.${code}.${a}`,label,a);perms.push(p);await tx.uiMenuAction.upsert({where:{menuId_actionCode:{menuId:menu.id,actionCode:a}},update:{},create:{menuId:menu.id,permissionId:p.id,actionCode:a,actionName:label,actionType:'CUSTOM'}});await tx.sysPageButton.upsert({where:{pageId_buttonCode:{pageId:page.id,buttonCode:a}},update:{},create:{pageId:page.id,buttonCode:a,buttonName:label,buttonType:'TOOL',createdBy:actor.id,updatedBy:actor.id}});}
  for(const p of perms)await tx.iamRolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:p.id}},update:{},create:{applicationId:app.id,roleId:role.id,permissionId:p.id}});
 }
 await tx.uiSystemListView.upsert({where:{systemCode_pageCode_actionCode_viewCode:{systemCode:'demo-portal',pageCode:'approval-center',actionCode:'view',viewCode:'object-default'}},update:{},create:{applicationId:app.id,systemCode:'demo-portal',pageCode:'approval-center',actionCode:'view',viewCode:'object-default',viewName:'审批中心默认视图',isDefault:true,allowPersonalOverride:true,priority:100,config:businessListDefaultConfig('approval-center'),createdBy:actor.id,updatedBy:actor.id}});
 });console.log('审批菜单与视图已初始化；仅系统管理员获默认授权，未修改业务单据或审批配置。');}
main().finally(()=>db.$disconnect());
