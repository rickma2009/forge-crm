package com.forge.workflow;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flowable.engine.*;
import org.flowable.task.api.Task;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static com.forge.workflow.Protocol.*;

@Service
public class WorkflowService {
 private static final Set<String> NUMERIC_VARIABLES=Set.of("netAmount","amount","taxAmount","discount");
 private static final Map<String,Set<String>> ENUM_VARIABLES=Map.of("orderType",Set.of("NORMAL","SAMPLE","REPLACEMENT"),"sourceType",Set.of("MANUAL","OPPORTUNITY","QUOTATION"),"currencyCode",Set.of("CNY"));
 private final RepositoryService repository;private final RuntimeService runtime;private final TaskService tasks;private final HistoryService history;
 private final JdbcTemplate db;private final ObjectMapper json;private final TemplateCompiler compiler;
 public WorkflowService(RepositoryService r,RuntimeService rt,TaskService t,HistoryService h,JdbcTemplate db,ObjectMapper json,TemplateCompiler c){repository=r;runtime=rt;tasks=t;history=h;this.db=db;this.json=json;compiler=c;}
 private void require(boolean ok,int code,String message){if(!ok)throw new ResponseStatusException(HttpStatus.valueOf(code),message);}
 private String encode(Object v){try{return json.writeValueAsString(v);}catch(Exception e){throw new IllegalStateException("Serialization failed",e);}}
 private Map<String,Object> decode(String v){try{return json.readValue(v,new TypeReference<Map<String,Object>>(){});}catch(Exception e){throw new IllegalStateException("Stored data invalid",e);}}
 private String digest(Command c){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(encode(c).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
 @Transactional
 public Map<String,Object> command(Command c){
  String scope=c.scope().key();
  // Scope locks serialize competing commands across service replicas, not just one JVM.
  db.update("INSERT INTO sys_wf_scope_lock(scope_key) VALUES (?) ON CONFLICT DO NOTHING",scope);
  db.queryForObject("SELECT scope_key FROM sys_wf_scope_lock WHERE scope_key=? FOR UPDATE",String.class,scope);
  var prior=db.queryForList("SELECT digest,response FROM sys_wf_command WHERE scope_key=? AND request_id=?",scope,c.requestId().toString());
  String hash=digest(c);if(!prior.isEmpty()){require(hash.equals(prior.get(0).get("digest")),409,"Request ID payload conflict");return decode((String)prior.get(0).get("response"));}
  Map<String,Object> result=switch(c.kind()){
   case PUBLISH -> publish(c);
   case START -> start(c);
   case ACTION_RESULT -> result(c);
   default -> task(c);
  };
  db.update("INSERT INTO sys_wf_command(scope_key,request_id,digest,response) VALUES(?,?,?,?)",scope,c.requestId().toString(),hash,encode(result));
  return result;
 }
 private Map<String,Object> publish(Command c){
  require(c.template()!=null,400,"Template required");var t=c.template();String scope=c.scope().key();
  Integer last=db.queryForObject("SELECT COALESCE(MAX(revision),0) FROM sys_wf_definition WHERE scope_key=? AND code=?",Integer.class,scope,t.code());
  require(t.revision()==last+1,409,"Definition revision conflict");var compiled=compiler.compile(t);
  var deployment=repository.createDeployment().tenantId(scope).name(t.name()).addBytes(t.code()+".bpmn20.xml",compiled.xml()).deploy();
  var d=repository.createProcessDefinitionQuery().deploymentId(deployment.getId()).singleResult();
  db.update("INSERT INTO sys_wf_definition(scope_key,definition_id,code,revision,config,graph) VALUES(?,?,?,?,?,?)",scope,d.getId(),t.code(),t.revision(),encode(t),encode(compiled.graph()));
  return Map.of("definitionId",d.getId(),"revision",t.revision(),"graph",compiled.graph());
 }
 private Map<String,Object> start(Command c){
  require(c.definitionId()!=null&&c.businessKey()!=null&&!c.businessKey().isBlank()&&c.amount()!=null&&c.applicantId()!=null,400,"Missing start fields");
  require(c.actorId().equals(c.applicantId()),403,"Only applicant may start");
  String scope=c.scope().key();var ds=db.queryForList("SELECT config FROM sys_wf_definition WHERE scope_key=? AND definition_id=?",scope,c.definitionId());require(!ds.isEmpty(),404,"Definition unavailable");
  Set<String> required=approvalKeys((String)ds.get(0).get("config"));if(required.contains("managerId"))require(c.managerId()!=null,400,"Manager required");if(required.contains("directorId"))require(c.directorId()!=null,400,"Director required");if(required.contains("financeId"))require(c.financeId()!=null,400,"Finance required");
  for(UUID person:List.of(c.managerId(),c.directorId(),c.financeId()).stream().filter(Objects::nonNull).toList())require(!person.equals(c.applicantId()),400,"Self approval is not allowed");
  require(db.queryForObject("SELECT COUNT(*) FROM sys_wf_instance WHERE scope_key=? AND business_key=?",Integer.class,scope,c.businessKey())==0,409,"Business request already started");
  Map<String,Object> vars=new HashMap<>();vars.put("amount",c.amount());if(c.managerId()!=null)vars.put("managerId",c.managerId().toString());if(c.financeId()!=null)vars.put("financeId",c.financeId().toString());if(c.directorId()!=null)vars.put("directorId",c.directorId().toString());if(c.variables()!=null)for(var entry:c.variables().entrySet())vars.put(entry.getKey(),processVariable(entry.getKey(),entry.getValue()));
  var i=runtime.startProcessInstanceById(c.definitionId(),c.businessKey(),vars);
  db.update("INSERT INTO sys_wf_instance(scope_key,instance_id,definition_id,business_key,applicant_id) VALUES(?,?,?,?,?)",scope,i.getId(),c.definitionId(),c.businessKey(),c.applicantId().toString());
  audit(c,i.getId(),"start");return state(c.scope(),i.getId());
 }
 private Object processVariable(String key,String value){require(NUMERIC_VARIABLES.contains(key)||ENUM_VARIABLES.containsKey(key),400,"Unknown process variable");if(NUMERIC_VARIABLES.contains(key)){require(value!=null&&value.matches("\\d{1,10}(\\.\\d{1,4})?"),400,"Invalid numeric process variable");return new BigDecimal(value);}require(ENUM_VARIABLES.get(key).contains(value),400,"Invalid enum process variable");return value;}
 private Set<String> approvalKeys(String config){try{Set<String> keys=new HashSet<>();JsonNode nodes=json.readTree(config).path("design").path("nodes");for(JsonNode node:nodes)if("APPROVAL".equals(node.path("type").asText()))keys.add(node.path("assigneeKey").asText());return keys;}catch(Exception e){throw new IllegalStateException("Stored workflow definition invalid",e);}}
 private Map<String,Object> owned(Scope s,String id){var rows=db.queryForList("SELECT * FROM sys_wf_instance WHERE scope_key=? AND instance_id=?",s.key(),id);require(!rows.isEmpty(),404,"Instance unavailable");return rows.get(0);}
 private Map<String,Object> task(Command c){
  var instance=owned(c.scope(),c.instanceId());require("RUNNING".equals(instance.get("state")),409,"Instance not running");
  require(c.taskId()!=null&&c.taskVersion()!=null,400,"Task and revision required");Task task=tasks.createTaskQuery().taskId(c.taskId()).processInstanceId(c.instanceId()).singleResult();require(task!=null,409,"Task already processed");
  require(c.actorId().toString().equals(task.getAssignee()),403,"Not task assignee");require(!c.actorId().toString().equals(instance.get("applicant_id")),403,"Self approval forbidden");
  require(c.taskVersion()==revision(task),409,"Task revision conflict");
  if(c.kind()!=Kind.APPROVE)require(c.note()!=null&&!c.note().isBlank(),400,"Reason required");
  audit(c,c.instanceId(),task.getTaskDefinitionKey());
  switch(c.kind()){
   case APPROVE -> tasks.complete(task.getId());
   case TRANSFER -> {require(c.targetId()!=null&&!c.targetId().toString().equals(instance.get("applicant_id"))&&!c.targetId().equals(c.actorId()),400,"Invalid transfer target");tasks.setVariableLocal(task.getId(),"commandRevision",revision(task)+1);tasks.setAssignee(task.getId(),c.targetId().toString());}
   case RETURN,REJECT -> {runtime.deleteProcessInstance(c.instanceId(),c.kind().name());db.update("UPDATE sys_wf_instance SET state=? WHERE scope_key=? AND instance_id=?",c.kind()==Kind.RETURN?"RETURNED":"REJECTED",c.scope().key(),c.instanceId());}
   default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  }
  return state(c.scope(),c.instanceId());
 }
 private int revision(Task task){Object value=tasks.getVariableLocal(task.getId(),"commandRevision");return value==null?1:((Number)value).intValue();}
 private Map<String,Object> result(Command c){
  var row=owned(c.scope(),c.instanceId());require(Set.of("RUNNING","ACTION_FAILED").contains(row.get("state")),409,"Instance not waiting");
  require(c.executionId()!=null&&c.success()!=null,400,"Result fields required");var execution=runtime.createExecutionQuery().processInstanceId(c.instanceId()).activityId("business").singleResult();require(execution!=null&&execution.getId().equals(c.executionId()),409,"Stale business result");
  if(c.success()){runtime.trigger(execution.getId());db.update("UPDATE sys_wf_instance SET state='APPROVED',action_error=NULL WHERE scope_key=? AND instance_id=?",c.scope().key(),c.instanceId());}
  else {require(c.note()!=null&&!c.note().isBlank(),400,"Failure reason required");db.update("UPDATE sys_wf_instance SET state='ACTION_FAILED',action_error=? WHERE scope_key=? AND instance_id=?",c.note(),c.scope().key(),c.instanceId());}
  audit(c,c.instanceId(),"business");return state(c.scope(),c.instanceId());
 }
 private void audit(Command c,String id,String node){db.update("INSERT INTO sys_wf_audit(id,scope_key,instance_id,actor_id,action,node_id,note) VALUES(?,?,?,?,?,?,?)",UUID.randomUUID().toString(),c.scope().key(),id,c.actorId().toString(),c.kind().name(),node,c.note());}
 @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
 public Map<String,Object> state(Scope scope,String id){
  var instance=owned(scope,id);String definition=(String)instance.get("definition_id");var d=db.queryForMap("SELECT revision,graph FROM sys_wf_definition WHERE scope_key=? AND definition_id=?",scope.key(),definition);
  var active=tasks.createTaskQuery().processInstanceId(id).list().stream().map(t->Map.<String,Object>of("id",t.getId(),"nodeId",t.getTaskDefinitionKey(),"name",t.getName(),"assignee",t.getAssignee(),"version",revision(t))).toList();
  var waits=runtime.createExecutionQuery().processInstanceId(id).activityId("business").list().stream().map(e->Map.of("executionId",e.getId(),"nodeId","business","action","sales.order.approve@1")).toList();
  var visits=history.createHistoricActivityInstanceQuery().processInstanceId(id).orderByHistoricActivityInstanceStartTime().asc().list().stream().map(h->{Map<String,Object> v=new LinkedHashMap<>();v.put("visitId",h.getId());v.put("nodeId",h.getActivityId());v.put("type",h.getActivityType());v.put("startedAt",h.getStartTime());v.put("endedAt",h.getEndTime());v.put("assignee",h.getAssignee());return v;}).toList();
  Map<String,Object> out=new LinkedHashMap<>();out.put("instanceId",id);out.put("definitionId",definition);out.put("revision",d.get("revision"));out.put("status",instance.get("state"));out.put("actionError",instance.get("action_error"));out.put("graph",decode((String)d.get("graph")));out.put("tasks",active);out.put("waitingActions",waits);out.put("visits",visits);out.put("audit",db.queryForList("SELECT actor_id,action,node_id,note,created_at FROM sys_wf_audit WHERE scope_key=? AND instance_id=? ORDER BY created_at,id",scope.key(),id));return out;
 }
}
