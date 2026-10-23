package com.forge.workflow;
import java.util.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/internal/workflows")
public class WorkflowController {
 private final WorkflowService service; private final TemplateCompiler compiler;
 public WorkflowController(WorkflowService service,TemplateCompiler compiler){this.service=service;this.compiler=compiler;}
 @PostMapping("/preview") public Map<String,Object> preview(@Valid @RequestBody Protocol.Template template){return compiler.compile(template).graph();}
 @PostMapping("/commands") public Map<String,Object> command(@Valid @RequestBody Protocol.Command command){return service.command(command);}
 @GetMapping("/instances/{id}") public Map<String,Object> state(@PathVariable String id,@RequestParam UUID tenantId,@RequestParam UUID applicationId){return service.state(new Protocol.Scope(tenantId,applicationId),id);}
 @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok","engine","flowable","version","7.2.0");}
}
