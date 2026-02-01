"""
AWS SDK configuration and credentials management for Vaani-Sahayak.

This module handles AWS service client initialization, credential management,
and configuration for all AWS services used in the system.
"""

import boto3
import os
from typing import Optional, Dict, Any
from botocore.config import Config
from botocore.exceptions import NoCredentialsError, ClientError

from .exceptions import (
    ConfigurationError, 
    AuthenticationError, 
    create_error, 
    ErrorCodes, 
    ErrorSeverity
)


class AWSConfig:
    """AWS configuration and client management."""
    
    def __init__(self, region_name: Optional[str] = None):
        """Initialize AWS configuration.
        
        Args:
            region_name: AWS region name. If None, uses environment variable or default.
        """
        self.region_name = region_name or os.getenv('AWS_REGION', 'ap-south-1')
        self._clients = {}
        self._validate_credentials()
    
    def _validate_credentials(self) -> None:
        """Validate AWS credentials are available."""
        try:
            # Try to create a simple client to test credentials
            sts_client = boto3.client('sts', region_name=self.region_name)
            sts_client.get_caller_identity()
        except NoCredentialsError as e:
            error = create_error(
                ErrorCodes.AUTH_FAILED,
                "AWS credentials not found or invalid",
                ErrorSeverity.CRITICAL,
                {"region": self.region_name}
            )
            raise AuthenticationError(error, e)
        except ClientError as e:
            error = create_error(
                ErrorCodes.AUTH_FAILED,
                f"AWS credential validation failed: {str(e)}",
                ErrorSeverity.CRITICAL,
                {"region": self.region_name}
            )
            raise AuthenticationError(error, e)
    
    def get_client(self, service_name: str, **kwargs) -> Any:
        """Get or create AWS service client with optimized configuration.
        
        Args:
            service_name: AWS service name (e.g., 'transcribe', 'bedrock-runtime')
            **kwargs: Additional client configuration options
            
        Returns:
            Configured boto3 client for the service
        """
        client_key = f"{service_name}_{hash(str(sorted(kwargs.items())))}"
        
        if client_key not in self._clients:
            try:
                # Service-specific configurations
                config = self._get_service_config(service_name)
                
                # Merge with any provided kwargs
                client_config = {
                    'region_name': self.region_name,
                    'config': config,
                    **kwargs
                }
                
                self._clients[client_key] = boto3.client(service_name, **client_config)
                
            except Exception as e:
                error = create_error(
                    ErrorCodes.CONFIGURATION_ERROR,
                    f"Failed to create {service_name} client: {str(e)}",
                    ErrorSeverity.HIGH,
                    {"service": service_name, "region": self.region_name}
                )
                raise ConfigurationError(error, e)
        
        return self._clients[client_key]
    
    def _get_service_config(self, service_name: str) -> Config:
        """Get optimized configuration for specific AWS services.
        
        Args:
            service_name: AWS service name
            
        Returns:
            Boto3 Config object with service-specific optimizations
        """
        base_config = {
            'retries': {
                'max_attempts': 3,
                'mode': 'adaptive'
            },
            'max_pool_connections': 50
        }
        
        # Service-specific configurations
        service_configs = {
            'transcribe': {
                **base_config,
                'read_timeout': 300,  # Longer timeout for transcription
                'connect_timeout': 60
            },
            'bedrock-runtime': {
                **base_config,
                'read_timeout': 120,  # Timeout for AI inference
                'connect_timeout': 30
            },
            'polly': {
                **base_config,
                'read_timeout': 60,   # Timeout for TTS
                'connect_timeout': 30
            },
            'dynamodb': {
                **base_config,
                'read_timeout': 30,
                'connect_timeout': 10
            },
            's3': {
                **base_config,
                'read_timeout': 60,
                'connect_timeout': 30,
                's3': {
                    'addressing_style': 'virtual'
                }
            },
            'kinesis-video-streams': {
                **base_config,
                'read_timeout': 300,  # Longer timeout for streaming
                'connect_timeout': 60
            }
        }
        
        config_dict = service_configs.get(service_name, base_config)
        return Config(**config_dict)
    
    def get_transcribe_client(self):
        """Get Amazon Transcribe client."""
        return self.get_client('transcribe')
    
    def get_bedrock_runtime_client(self):
        """Get Amazon Bedrock Runtime client."""
        return self.get_client('bedrock-runtime')
    
    def get_polly_client(self):
        """Get Amazon Polly client."""
        return self.get_client('polly')
    
    def get_dynamodb_client(self):
        """Get Amazon DynamoDB client."""
        return self.get_client('dynamodb')
    
    def get_s3_client(self):
        """Get Amazon S3 client."""
        return self.get_client('s3')
    
    def get_kinesis_video_client(self):
        """Get Amazon Kinesis Video Streams client."""
        return self.get_client('kinesisvideo')


# Global AWS configuration instance
_aws_config = None


def get_aws_config(region_name: Optional[str] = None) -> AWSConfig:
    """Get the global AWS configuration instance.
    
    Args:
        region_name: AWS region name. Only used on first call.
        
    Returns:
        AWSConfig instance
    """
    global _aws_config
    if _aws_config is None:
        _aws_config = AWSConfig(region_name)
    return _aws_config


def reset_aws_config() -> None:
    """Reset the global AWS configuration. Useful for testing."""
    global _aws_config
    _aws_config = None


# Service-specific configuration constants
TRANSCRIBE_CONFIG = {
    "LanguageCode": "hi-IN",
    "MediaSampleRateHertz": 16000,
    "Settings": {
        "ShowSpeakerLabels": False,
        "MaxSpeakerLabels": 1,
        "VocabularyName": "rural-hindi-vocabulary"
    }
}

BEDROCK_CONFIG = {
    "modelId": "amazon.titan-text-express-v1",
    "contentType": "application/json",
    "accept": "application/json",
    "textGenerationConfig": {
        "maxTokenCount": 512,
        "temperature": 0.7,
        "topP": 0.9
    }
}

POLLY_CONFIG = {
    "Engine": "neural",
    "LanguageCode": "hi-IN",
    "VoiceId": "Kajal",
    "OutputFormat": "mp3",
    "SampleRate": "16000",
    "TextType": "text"
}

# Gram-Didi persona system prompt
GRAM_DIDI_SYSTEM_PROMPT = """
You are Gram-Didi, an empathetic and knowledgeable village sister who helps rural farmers and villagers in India. 
You speak in simple, warm Hindi and provide practical advice about:
- Agricultural practices and crop management
- Government schemes and subsidies
- Weather and farming calendar
- Rural healthcare and education

Always be supportive, use simple language, and relate to their rural context.
Keep responses concise but helpful, as users may have limited time or connectivity.
Address users respectfully and warmly, as an elder sister would.
"""