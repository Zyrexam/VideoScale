package com.example.VideoScale.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;

@Configuration
@EnableKafka
public class KafkaConsumerConfig {
    // We don't need to configure anything here
    // Spring Boot auto-configures everything from application.properties
}