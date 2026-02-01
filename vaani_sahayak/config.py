"""
Configuration settings for Vaani-Sahayak voice assistant.

This module provides centralized configuration management with
environment variable support and default values.
"""

import os
from typing import Dict, Any, Optional


class Config:
    """Configuration class with environment variable support."""
    
    # AWS Configuration
    AWS_REGION = os.getenv('AWS_REGION', 'ap-south-1')
    
    # Service Configuration
    SERVICE_NAME = 'vaani-sahayak'
    SERVICE_VERSION = os.getenv('SERVICE_VERSION', '0.1.0')
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    ENABLE_CLOUDWATCH_LOGS = os.getenv('ENABLE_CLOUDWATCH_LOGS', 'true').lower() == 'true'
    
    # DynamoDB Configuration
    USER_CONTEXT_TABLE = os.getenv('USER_CONTEXT_TABLE', 'vaani-user-context')
    
    # S3 Configuration
    USER_INPUTS_BUCKET = os.getenv('USER_INPUTS_BUCKET', 'vaani-user-inputs')
    RESPONSE_AUDIO_BUCKET = os.getenv('RESPONSE_AUDIO_BUCKET', 'vaani-response-audio')
    AUDIO_LIFECYCLE_HOURS = int(os.getenv('AUDIO_LIFECYCLE_HOURS', '24'))
    
    # Transcription Configuration
    TRANSCRIBE_LANGUAGE_CODE = os.getenv('TRANSCRIBE_LANGUAGE_CODE', 'hi-IN')
    TRANSCRIBE_SAMPLE_RATE = int(os.getenv('TRANSCRIBE_SAMPLE_RATE', '16000'))
    CUSTOM_VOCABULARY_NAME = os.getenv('CUSTOM_VOCABULARY_NAME', 'rural-hindi-vocabulary')
    
    # AI Model Configuration
    BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'amazon.titan-text-express-v1')
    MAX_TOKENS = int(os.getenv('MAX_TOKENS', '512'))
    TEMPERATURE = float(os.getenv('TEMPERATURE', '0.7'))
    TOP_P = float(os.getenv('TOP_P', '0.9'))
    
    # Text-to-Speech Configuration
    POLLY_VOICE_ID = os.getenv('POLLY_VOICE_ID', 'Kajal')
    POLLY_ENGINE = os.getenv('POLLY_ENGINE', 'neural')
    POLLY_OUTPUT_FORMAT = os.getenv('POLLY_OUTPUT_FORMAT', 'mp3')
    POLLY_SAMPLE_RATE = os.getenv('POLLY_SAMPLE_RATE', '16000')
    
    # Processing Configuration
    MAX_AUDIO_DURATION_SECONDS = int(os.getenv('MAX_AUDIO_DURATION_SECONDS', '300'))
    MIN_AUDIO_DURATION_SECONDS = float(os.getenv('MIN_AUDIO_DURATION_SECONDS', '0.5'))
    PROCESSING_TIMEOUT_SECONDS = int(os.getenv('PROCESSING_TIMEOUT_SECONDS', '30'))
    
    # Response Configuration
    PRESIGNED_URL_EXPIRATION_SECONDS = int(os.getenv('PRESIGNED_URL_EXPIRATION_SECONDS', '3600'))
    MAX_CONVERSATION_HISTORY = int(os.getenv('MAX_CONVERSATION_HISTORY', '10'))
    
    # Error Handling Configuration
    MAX_RETRY_ATTEMPTS = int(os.getenv('MAX_RETRY_ATTEMPTS', '3'))
    RETRY_BACKOFF_MULTIPLIER = float(os.getenv('RETRY_BACKOFF_MULTIPLIER', '2.0'))
    
    @classmethod
    def get_aws_config(cls) -> Dict[str, Any]:
        """Get AWS service configuration."""
        return {
            'region_name': cls.AWS_REGION,
            'transcribe': {
                'language_code': cls.TRANSCRIBE_LANGUAGE_CODE,
                'sample_rate': cls.TRANSCRIBE_SAMPLE_RATE,
                'vocabulary_name': cls.CUSTOM_VOCABULARY_NAME
            },
            'bedrock': {
                'model_id': cls.BEDROCK_MODEL_ID,
                'max_tokens': cls.MAX_TOKENS,
                'temperature': cls.TEMPERATURE,
                'top_p': cls.TOP_P
            },
            'polly': {
                'voice_id': cls.POLLY_VOICE_ID,
                'engine': cls.POLLY_ENGINE,
                'output_format': cls.POLLY_OUTPUT_FORMAT,
                'sample_rate': cls.POLLY_SAMPLE_RATE
            }
        }
    
    @classmethod
    def get_storage_config(cls) -> Dict[str, Any]:
        """Get storage configuration."""
        return {
            'user_context_table': cls.USER_CONTEXT_TABLE,
            'user_inputs_bucket': cls.USER_INPUTS_BUCKET,
            'response_audio_bucket': cls.RESPONSE_AUDIO_BUCKET,
            'audio_lifecycle_hours': cls.AUDIO_LIFECYCLE_HOURS,
            'presigned_url_expiration': cls.PRESIGNED_URL_EXPIRATION_SECONDS
        }
    
    @classmethod
    def get_processing_config(cls) -> Dict[str, Any]:
        """Get processing configuration."""
        return {
            'max_audio_duration': cls.MAX_AUDIO_DURATION_SECONDS,
            'min_audio_duration': cls.MIN_AUDIO_DURATION_SECONDS,
            'processing_timeout': cls.PROCESSING_TIMEOUT_SECONDS,
            'max_conversation_history': cls.MAX_CONVERSATION_HISTORY,
            'max_retry_attempts': cls.MAX_RETRY_ATTEMPTS,
            'retry_backoff_multiplier': cls.RETRY_BACKOFF_MULTIPLIER
        }


# Global configuration instance
config = Config()