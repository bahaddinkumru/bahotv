import { Transport, ClientProviderOptions, MicroserviceOptions } from '@nestjs/microservices';

export const kafkaConfig: ClientProviderOptions = {
    name: 'AI_MODERATION_SERVICE',
    transport: Transport.KAFKA,
    options: {
        client: {
            clientId: 'baho-tv',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        },
        producerOnlyMode: true,
    },
};

export const kafkaConsumerConfig: MicroserviceOptions = {
    transport: Transport.KAFKA,
    options: {
        client: {
            clientId: 'baho-tv-worker',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        },
        consumer: {
            groupId: 'baho-ai-moderator-group',
        },
    },
};