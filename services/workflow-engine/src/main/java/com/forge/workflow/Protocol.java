package com.forge.workflow;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
public final class Protocol {
 public record Scope(@NotNull UUID tenantId,@NotNull UUID applicationId) { public String key(){return tenantId+":"+applicationId;} }
 public record Condition(@NotBlank String field,@NotBlank String operator,@NotBlank @Size(max=128) String value) {}
 public record DesignNode(@NotBlank String id,@NotBlank String type,@NotBlank @Size(max=80) String label,String assigneeKey,String action,double x,double y) {}
 public record DesignEdge(@NotBlank String id,@NotBlank String from,@NotBlank String to,@Size(max=80) String label,@NotBlank String match,@NotNull List<@Valid Condition> conditions,boolean isDefault,@Min(1) int sortNo) {}
 public record Design(@Min(1) int schemaVersion,@NotNull List<@Valid DesignNode> nodes,@NotNull List<@Valid DesignEdge> edges) {}
 public record Template(@NotBlank @Pattern(regexp="[a-z][a-z0-9_]{0,47}") String code,
  @NotBlank @Size(max=80) String name,@Min(1) int revision,@NotBlank String objectCode,@NotNull @Valid Design design) {}
 public record Command(@NotNull @Valid Scope scope,@NotNull UUID requestId,
  @NotNull Kind kind,@NotNull UUID actorId,@Valid Template template,
  @Size(max=128) String definitionId,@Size(max=128) String businessKey,
  @Size(max=64) String instanceId,@Size(max=64) String taskId,@Size(max=64) String executionId,
  @Min(1) Integer taskVersion,UUID applicantId,UUID managerId,UUID directorId,UUID financeId,
  @DecimalMin("0") @DecimalMax("1000000000") @Digits(integer=10,fraction=2) BigDecimal amount,
  Map<String,String> variables,UUID targetId,@Size(max=500) String note,Boolean success) {}
 public enum Kind { PUBLISH,START,APPROVE,RETURN,REJECT,TRANSFER,ACTION_RESULT }
}
