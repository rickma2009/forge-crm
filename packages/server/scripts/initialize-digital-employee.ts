import {config} from 'dotenv';
import {DatabaseService} from '../src/database/database.service';
config({path:'../../.env',quiet:true});
const db=new DatabaseService(process.env.DATABASE_URL!);
async function main(){await db.$transaction(async tx=>{
 const app=await tx.sysApplication.findFirstOrThrow({where:{applicationCode:'demo-portal',status:'ACTIVE'}});
 const actor=await tx.iamUser.findFirstOrThrow({where:{tenantId:app.tenantId,normalizedAccount:'admin'}});
 const role=await tx.iamRole.findUniqueOrThrow({where:{systemCode_roleCode:{systemCode:'demo-portal',roleCode:'system-manager'}}});
 const root=await tx.sysPageResource.findUniqueOrThrow({where:{applicationId_pageCode:{applicationId:app.id,pageCode:'demo-portal'}}});
 const page=await tx.sysPageResource.upsert({where:{applicationId_pageCode:{applicationId:app.id,pageCode:'digital-employee'}},update:{pageName:'数字员工',routePath:'/showcase/digital-employee',status:'ACTIVE',updatedBy:actor.id},create:{tenantId:app.tenantId,applicationId:app.id,parentId:root.id,pageCode:'digital-employee',pageName:'数字员工',pageType:'PAGE',routePath:'/showcase/digital-employee',iconKey:'interaction',sortNo:4,createdBy:actor.id,updatedBy:actor.id}});
 const permission=async(code:string,name:string,action:string)=>tx.sysPermission.upsert({where:{applicationId_permissionCode:{applicationId:app.id,permissionCode:code}},update:{permissionName:name,status:'ACTIVE'},create:{applicationId:app.id,permissionCode:code,permissionName:name,resourceCode:'digital-employee',actionCode:action,source:'SYSTEM'}});
 const access=await permission('navigation.digital-employee.access','访问数字员工','access');
 const menu=await tx.uiMenu.upsert({where:{systemCode_menuCode:{systemCode:'demo-portal',menuCode:'digital-employee'}},update:{accessPermissionId:access.id,pageResourceId:page.id,menuName:'数字员工',routePath:'/showcase/digital-employee',status:'ACTIVE'},create:{applicationId:app.id,accessPermissionId:access.id,pageResourceId:page.id,systemCode:'demo-portal',menuCode:'digital-employee',menuName:'数字员工',nodeType:'PAGE',routePath:'/showcase/digital-employee',iconKey:'interaction',sortNo:4,menuType:'PAGE'}});
 const permissions=[access];
 for(const [action,name,type,sortNo] of [['view','查看','VIEW',10],['manage','配置数字员工','UPDATE',20],['execute','执行数字员工任务','CUSTOM',30]] as const){const p=await permission(`menu.digital-employee.${action}`,name,action);permissions.push(p);await tx.uiMenuAction.upsert({where:{menuId_actionCode:{menuId:menu.id,actionCode:action}},update:{permissionId:p.id,actionName:name,actionType:type,status:'ACTIVE'},create:{menuId:menu.id,permissionId:p.id,actionCode:action,actionName:name,actionType:type,sortNo}});await tx.sysPageButton.upsert({where:{pageId_buttonCode:{pageId:page.id,buttonCode:action}},update:{buttonName:name,status:'ACTIVE',updatedBy:actor.id},create:{pageId:page.id,buttonCode:action,buttonName:name,buttonType:'TOOL',sortNo,createdBy:actor.id,updatedBy:actor.id}});}
 for(const p of permissions)await tx.iamRolePermission.upsert({where:{roleId_permissionId:{roleId:role.id,permissionId:p.id}},update:{},create:{applicationId:app.id,roleId:role.id,permissionId:p.id}});
 });console.log('数字员工菜单、动作与系统管理员授权已增量初始化。');}
main().finally(()=>db.$disconnect());
