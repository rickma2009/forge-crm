package com.forge.workflow;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
@Component
public class ServiceSecurity extends OncePerRequestFilter {
 private final byte[] token;
 public ServiceSecurity(@Value("${workflow.token}") String token){if(token.length()<32)throw new IllegalArgumentException("WORKFLOW_SERVICE_TOKEN must contain at least 32 characters");this.token=token.getBytes(StandardCharsets.UTF_8);}
 @Override protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain chain)throws ServletException,IOException {
  String value=r.getHeader("X-Workflow-Service-Token");
  if(value==null||!MessageDigest.isEqual(token,value.getBytes(StandardCharsets.UTF_8))){s.setStatus(401);s.setContentType("application/json");s.getWriter().write("{\"code\":\"UNAUTHORIZED\"}");return;}
  chain.doFilter(r,s);
 }
}
