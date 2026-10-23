FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 workflow
# start.sh runs PostgreSQL-backed tests and creates this artifact before building.
COPY target/workflow-engine-0.1.0.jar app.jar
USER 10001
EXPOSE 8091
ENTRYPOINT ["java","-jar","/app/app.jar"]
