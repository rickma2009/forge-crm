package com.forge.workflow;

import java.util.*;
import org.flowable.bpmn.model.*;
import org.flowable.bpmn.converter.BpmnXMLConverter;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Compiles only the structured, server-validated model. User supplied XML or expressions never enter Flowable. */
@Component
public class TemplateCompiler {
 public record Compiled(byte[] xml,Map<String,Object> graph){}
 private static final Set<String> IDS=Set.of("managerId","directorId","financeId");
 private static final Set<String> NUMERIC=Set.of("netAmount","amount","taxAmount","discount");
 private static final Set<String> TEXT=Set.of("orderType","sourceType","currencyCode");
 private static final Map<String,Set<String>> TEXT_VALUES=Map.of(
  "orderType",Set.of("NORMAL","SAMPLE","REPLACEMENT"),
  "sourceType",Set.of("MANUAL","OPPORTUNITY","QUOTATION"),
  "currencyCode",Set.of("CNY"));
 private void require(boolean value,String message){if(!value)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
 public Compiled compile(Protocol.Template t){
  require("sales_order".equals(t.objectCode()),"Unsupported object");var d=t.design();require(d!=null&&d.schemaVersion()==1,"Unsupported design schema");
  Map<String,Protocol.DesignNode> defs=validateDesign(d);
  BpmnModel model=new BpmnModel();org.flowable.bpmn.model.Process process=new org.flowable.bpmn.model.Process();process.setId(t.code());process.setName(t.name());process.setExecutable(true);model.addProcess(process);List<Map<String,Object>> nodes=new ArrayList<>(),edges=new ArrayList<>();
  for(var n:d.nodes()){FlowNode flow=switch(n.type()){
   case "START" -> new StartEvent();case "END" -> new EndEvent();case "EXCLUSIVE_GATEWAY" -> new ExclusiveGateway();
   case "APPROVAL" -> {require(IDS.contains(n.assigneeKey()),"Invalid assignee rule");UserTask task=new UserTask();task.setAssignee("${"+n.assigneeKey()+"}");yield task;}
   case "BUSINESS_ACTION" -> {require("business".equals(n.id())&&"sales.order.approve@1".equals(n.action()),"Invalid business action");yield new ReceiveTask();}
   default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Unsupported node type");};
   double w=(flow instanceof StartEvent||flow instanceof EndEvent||flow instanceof ExclusiveGateway)?48:180,h=(w==48)?48:88;flow.setId(n.id());flow.setName(n.label());process.addFlowElement(flow);GraphicInfo g=new GraphicInfo();g.setX(n.x());g.setY(n.y());g.setWidth(w);g.setHeight(h);model.addGraphicInfo(n.id(),g);nodes.add(Map.of("id",n.id(),"label",n.label(),"type",flow.getClass().getSimpleName(),"x",n.x(),"y",n.y(),"width",w,"height",h));
  }
  for(var e:d.edges()){SequenceFlow f=new SequenceFlow(e.from(),e.to());f.setId(e.id());f.setName(e.label()==null?"":e.label());if(!e.isDefault()&&!e.conditions().isEmpty())f.setConditionExpression(expression(e));process.addFlowElement(f);((FlowNode)process.getFlowElement(e.from())).getOutgoingFlows().add(f);((FlowNode)process.getFlowElement(e.to())).getIncomingFlows().add(f);if(e.isDefault())((ExclusiveGateway)process.getFlowElement(e.from())).setDefaultFlow(e.id());GraphicInfo a=model.getGraphicInfo(e.from()),b=model.getGraphicInfo(e.to());List<GraphicInfo> gis=new ArrayList<>();for(double[] point:List.of(new double[]{a.getX()+a.getWidth(),a.getY()+a.getHeight()/2},new double[]{b.getX(),b.getY()+b.getHeight()/2})){GraphicInfo gi=new GraphicInfo();gi.setX(point[0]);gi.setY(point[1]);gis.add(gi);}model.addFlowGraphicInfoList(e.id(),gis);edges.add(Map.of("id",e.id(),"from",e.from(),"to",e.to(),"label",f.getName(),"points",gis.stream().map(p->Map.of("x",p.getX(),"y",p.getY())).toList()));}
  return new Compiled(new BpmnXMLConverter().convertToXML(model),Map.of("schemaVersion",1,"width",Math.max(900,d.nodes().stream().mapToDouble(n->n.x()+220).max().orElse(900)),"height",Math.max(320,d.nodes().stream().mapToDouble(n->n.y()+140).max().orElse(320)),"nodes",nodes,"edges",edges));
 }
 private Map<String,Protocol.DesignNode> validateDesign(Protocol.Design design){
  require(design.nodes()!=null&&design.nodes().size()>=3&&design.nodes().size()<=30,"Invalid node count");require(design.edges()!=null&&design.edges().size()>=2&&design.edges().size()<=60,"Invalid edge count");
  Map<String,Protocol.DesignNode> nodes=new LinkedHashMap<>();for(var node:design.nodes()){require(node.id().matches("[a-z][a-z0-9_]{0,47}")&&!nodes.containsKey(node.id()),"Invalid node id");require(node.label()!=null&&!node.label().isBlank()&&node.label().length()<=80,"Invalid node label");if("START".equals(node.type()))require("start".equals(node.id()),"Invalid start node");if("END".equals(node.type()))require("end".equals(node.id()),"Invalid end node");nodes.put(node.id(),node);}require("START".equals(nodes.getOrDefault("start",emptyNode()).type())&&"BUSINESS_ACTION".equals(nodes.getOrDefault("business",emptyNode()).type())&&"END".equals(nodes.getOrDefault("end",emptyNode()).type()),"Required nodes missing");
  Set<String> edgeIds=new HashSet<>();for(var edge:design.edges()){require(edge.id().matches("[a-z][a-z0-9_]{0,47}")&&edgeIds.add(edge.id())&&nodes.containsKey(edge.from())&&nodes.containsKey(edge.to())&&!edge.from().equals(edge.to()),"Invalid edge");require(Set.of("ALL","ANY").contains(edge.match()),"Invalid condition match");}
  for(var node:nodes.values()){var incoming=design.edges().stream().filter(e->e.to().equals(node.id())).toList();var outgoing=design.edges().stream().filter(e->e.from().equals(node.id())).toList();if("START".equals(node.type()))require(incoming.isEmpty(),"Start cannot have incoming edges");if("END".equals(node.type())){require(outgoing.isEmpty(),"End cannot have outgoing edges");continue;}require(!outgoing.isEmpty(),"Node has no outgoing edge");if("EXCLUSIVE_GATEWAY".equals(node.type())){require(outgoing.size()>=2&&outgoing.stream().filter(Protocol.DesignEdge::isDefault).count()==1,"Gateway requires one default edge");for(var edge:outgoing){if(edge.isDefault())require(edge.conditions().isEmpty(),"Default edge cannot have conditions");else require(!edge.conditions().isEmpty(),"Gateway branch requires conditions");}}else{require(outgoing.size()==1,"Node requires exactly one outgoing edge");for(var edge:outgoing)require(!edge.isDefault()&&edge.conditions().isEmpty(),"Conditions require gateway");}}
  Set<String> fromStart=reachable("start",design.edges(),false),toEnd=reachable("end",design.edges(),true);for(String id:nodes.keySet())require(fromStart.contains(id)&&toEnd.contains(id),"Disconnected node");return nodes;
 }
 private Protocol.DesignNode emptyNode(){return new Protocol.DesignNode("empty","EMPTY","empty",null,null,0,0);}
 private Set<String> reachable(String start,List<Protocol.DesignEdge> edges,boolean reverse){Set<String> seen=new HashSet<>();Deque<String> queue=new ArrayDeque<>();queue.add(start);while(!queue.isEmpty()){String id=queue.removeFirst();if(!seen.add(id))continue;for(var edge:edges)if(reverse?edge.to().equals(id):edge.from().equals(id))queue.add(reverse?edge.from():edge.to());}return seen;}
 private String expression(Protocol.DesignEdge edge){List<String> parts=new ArrayList<>();for(var c:edge.conditions()){String op=switch(c.operator()){case "EQ"->"==";case "NE"->"!=";case "GT"->">";case "GTE"->">=";case "LT"->"<";case "LTE"->"<=";default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid operator");};String value;if(NUMERIC.contains(c.field())){require(c.value().matches("\\d{1,10}(\\.\\d{1,4})?"),"Invalid numeric value");value=c.value();}else{require(TEXT.contains(c.field())&&TEXT_VALUES.get(c.field()).contains(c.value())&&Set.of("EQ","NE").contains(c.operator()),"Invalid text condition");value="'"+c.value()+"'";}parts.add(c.field()+" "+op+" "+value);}require(!parts.isEmpty(),"Condition required");return "${"+String.join("ANY".equals(edge.match())?" || ":" && ",parts)+"}";}
}
