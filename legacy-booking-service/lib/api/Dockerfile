# Use Maven with JDK 11 as the builder image
FROM maven:3.8.6-eclipse-temurin-17 AS builder

# Set working directory
WORKDIR /app

# Copy project files
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package spring-boot:repackage -DskipTests

# Use a smaller JDK runtime image
FROM eclipse-temurin:17-jre

# Set working directory
WORKDIR /app

# Copy built JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose application port
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "app.jar"]
