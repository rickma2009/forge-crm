package com.forge.workflow;

import java.util.*;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest @AutoConfigureMockMvc
class WorkflowIntegrationTest {
 @Autowired MockMvc mvc;@Autowired ObjectMapper mapper;@Autowired WorkflowService service;
 Map<String,Object> scope;String applicant,manager,director,finance;
 static final String TOKEN="test-service-token-with-at-least-32-characters";
 @BeforeEach void setup(){scope=Map.of("tenantId",uuid(),"applicationId",uuid());applicant=uuid();manager=uuid();director=uuid();finance=uuid();}
 String uuid(){return UUID.randomUUID().toString();}
 Map<String,Object> command(String kind,String actor){var m=new HashMap<String,Object>();m.put("scope",scope);m.put("requestId",uuid());m.put("kind",kind);m.put("actorId",actor);return m;}
 JsonNode call(Map<String,Object> body,int status)throws Exception {var r=mvc.perform(post("/internal/workflows/commands").header("X-Workflow-Service-Token",TOKEN).contentType("application/json").content(mapper.writeValueAsBytes(body))).andReturn().getResponse();assertEquals(status,r.getStatus(),r.getContentAsString());return r.getContentAsString().isBlank()?mapper.nullNode():mapper.readTree(r.getContentAsString());}
 Map<String,Object> design(String threshold){return Map.of("schemaVersion",1,"nodes",List.of(
  Map.of("id","start","type","START","label","提交","x",40,"y",170),Map.of("id","manager","type","APPROVAL","label","部门经理审批","assigneeKey","managerId","x",140,"y",150),Map.of("id","amount","type","EXCLUSIVE_GATEWAY","label","金额判断","x",350,"y",170),Map.of("id","director","type","APPROVAL","label","二级负责人审批","assigneeKey","directorId","x",460,"y",40),Map.of("id","finance","type","APPROVAL","label","财务审批","assigneeKey","financeId","x",790,"y",150),Map.of("id","business","type","BUSINESS_ACTION","label","销售订单审核生效","action","sales.order.approve@1","x",1010,"y",150),Map.of("id","end","type","END","label","完成","x",1260,"y",170)),"edges",List.of(
  edge("submit","start","manager",10),edge("check","manager","amount",20),Map.of("id","high","from","amount","to","director","label","超过阈值","match","ALL","conditions",List.of(Map.of("field","netAmount","operator","GT","value",threshold)),"isDefault",false,"sortNo",30),Map.of("id","low","from","amount","to","finance","label","默认","match","ALL","conditions",List.of(),"isDefault",true,"sortNo",40),edge("merge","director","finance",50),edge("apply","finance","business",60),edge("finish","business","end",70)));}
 Map<String,Object> edge(String id,String from,String to,int sort){return Map.of("id",id,"from",from,"to",to,"label","","match","ALL","conditions",List.of(),"isDefault",false,"sortNo",sort);}
 Map<String,Object> publication(int revision,String threshold){var c=command("PUBLISH",manager);c.put("template",Map.of("code","sales_order","name","销售订单审批","revision",revision,"objectCode","sales_order","design",design(threshold)));return c;}
 String publish(int revision,String threshold)throws Exception{return call(publication(revision,threshold),200).get("definitionId").asText();}
 Map<String,Object> start(String definition,String amount){var c=command("START",applicant);c.putAll(Map.of("definitionId",definition,"businessKey",uuid(),"applicantId",applicant,"managerId",manager,"directorId",director,"financeId",finance,"amount",amount,"variables",Map.of("netAmount",amount,"amount",amount,"taxAmount","0","discount","1","orderType","NORMAL","sourceType","MANUAL","currencyCode","CNY")));return c;}
 Map<String,Object> task(JsonNode i,String kind,String actor){var c=command(kind,actor);var task=i.get("tasks").get(0);c.putAll(Map.of("instanceId",i.get("instanceId").asText(),"taskId",task.get("id").asText(),"taskVersion",task.get("version").asInt(),"note","已核对"));return c;}
 JsonNode approve(JsonNode i,String actor)throws Exception{return call(task(i,"APPROVE",actor),200);}
 @Test void completeGraphAndThresholdBoundaries()throws Exception{
  String d=publish(1,"100000");
  for(String amount:List.of("99999.99","100000","100000.01")){
   var i=call(start(d,amount),200);assertEquals(7,i.get("graph").get("nodes").size());assertEquals(7,i.get("graph").get("edges").size());
   i=approve(i,manager);assertEquals(amount.equals("100000.01")?"director":"finance",i.get("tasks").get(0).get("nodeId").asText());
  }
 }
 @Test void duplicateStartAndDifferentPayloadConflict()throws Exception{
  var c=start(publish(1,"100000"),"80000");var first=call(c,200);assertEquals(first,call(c,200));c.put("amount","90000");call(c,409);
  c.put("requestId",uuid());call(c,409);
 }
 @Test void simultaneousSameCommandCreatesOneInstance()throws Exception{
  var c=mapper.convertValue(start(publish(1,"100000"),"80000"),Protocol.Command.class);
  var pool=Executors.newFixedThreadPool(2);try{var a=pool.submit(()->service.command(c));var b=pool.submit(()->service.command(c));assertEquals(a.get().get("instanceId"),b.get().get("instanceId"));}finally{pool.shutdownNow();}
 }
 @Test void versionSnapshotDoesNotChange()throws Exception{
  var first=call(start(publish(1,"100000"),"80000"),200);String newer=publish(2,"50000");
  assertEquals("finance",approve(first,manager).get("tasks").get(0).get("nodeId").asText());
  var next=approve(call(start(newer,"80000"),200),manager);assertEquals("director",next.get("tasks").get(0).get("nodeId").asText());assertEquals(2,next.get("revision").asInt());
 }
 @Test void assigneeTransferAndStaleRevision()throws Exception{
  var i=call(start(publish(1,"100000"),"80000"),200);call(task(i,"APPROVE",finance),403);
  var transfer=task(i,"TRANSFER",manager);transfer.put("targetId",finance);var moved=call(transfer,200);assertEquals(2,moved.get("tasks").get(0).get("version").asInt());
  call(task(i,"APPROVE",manager),403);var stale=task(i,"APPROVE",finance);call(stale,409);approve(moved,finance);
 }
 @Test void returnAndRejectEndRound()throws Exception{
  String d=publish(1,"100000");for(String action:List.of("RETURN","REJECT")){
   var i=call(start(d,"80000"),200);var done=call(task(i,action,manager),200);assertEquals(action.equals("RETURN")?"RETURNED":"REJECTED",done.get("status").asText());assertEquals(0,done.get("tasks").size());call(task(i,"APPROVE",manager),409);
  }
 }
 @Test void businessFailureWaitsAndOnlyMatchingResultCompletes()throws Exception{
  var i=approve(approve(call(start(publish(1,"100000"),"80000"),200),manager),finance);assertEquals(0,i.get("tasks").size());assertEquals(1,i.get("waitingActions").size());assertEquals("RUNNING",i.get("status").asText());
  var c=command("ACTION_RESULT",finance);c.putAll(Map.of("instanceId",i.get("instanceId").asText(),"executionId","wrong","success",true));call(c,409);
  c.put("executionId",i.get("waitingActions").get(0).get("executionId").asText());c.put("success",false);c.put("note","业务暂不可用");var failed=call(c,200);assertEquals("ACTION_FAILED",failed.get("status").asText());assertEquals(1,failed.get("waitingActions").size());
  c.put("requestId",uuid());c.put("success",true);var completed=call(c,200);assertEquals("APPROVED",completed.get("status").asText());assertEquals(0,completed.get("waitingActions").size());assertEquals(completed,call(c,200));c.put("requestId",uuid());call(c,409);
 }
 @Test void scopeIsolationAndSelfApproval()throws Exception{
  String d=publish(1,"100000");var bad=start(d,"80000");bad.put("managerId",applicant);call(bad,400);
  var i=call(start(d,"80000"),200);scope=Map.of("tenantId",uuid(),"applicationId",uuid());call(task(i,"APPROVE",manager),404);call(start(d,"80000"),404);
  mvc.perform(get("/internal/workflows/instances/"+i.get("instanceId").asText()).param("tenantId",scope.get("tenantId").toString()).param("applicationId",scope.get("applicationId").toString()).header("X-Workflow-Service-Token",TOKEN)).andExpect(r->assertEquals(404,r.getResponse().getStatus()));
 }
 @Test void securityAndInputValidation()throws Exception{
  mvc.perform(get("/internal/workflows/health")).andExpect(r->assertEquals(401,r.getResponse().getStatus()));
  var c=publication(1,"-1");call(c,400);c=publication(1,"100");c.put("template",Map.of("code","${evil}","name","invalid","revision",1,"objectCode","sales_order","design",design("10")));call(c,400);
  String d=publish(1,"100000");var s=start(d,"1.001");call(s,400);s=start(d,"100001");s.remove("directorId");call(s,400);s=start(d,"1");s.put("variables",Map.of("netAmount","not-a-number"));call(s,400);
 }
}
