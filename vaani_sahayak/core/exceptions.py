"""
Exception classes and error handling framework for Vaani-Sahayak.

This module defines custom exceptions and error handling utilities
for different types of failures in the voice assistant system.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class ErrorSeverity(Enum):
    """Error severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCodes:
    """Standard error codes for different failure types."""
    
    # Transcription errors
    TRANSCRIPTION_FAILED = "TRANS_001"
    TRANSCRIPTION_TIMEOUT = "TRANS_002"
    INVALID_AUDIO_FORMAT = "TRANS_003"
    AUDIO_QUALITY_POOR = "TRANS_004"
    
    # AI service errors
    BEDROCK_UNAVAILABLE = "AI_001"
    BEDROCK_TIMEOUT = "AI_002"
    BEDROCK_RATE_LIMIT = "AI_003"
    INVALID_RESPONSE = "AI_004"
    
    # Text-to-speech errors
    POLLY_FAILED = "TTS_001"
    POLLY_TIMEOUT = "TTS_002"
    VOICE_UNAVAILABLE = "TTS_003"
    
    # Network and connectivity errors
    NETWORK_TIMEOUT = "NET_001"
    CONNECTION_LOST = "NET_002"
    SERVICE_UNAVAILABLE = "NET_003"
    
    # Audio processing errors
    INVALID_AUDIO = "AUDIO_001"
    AUDIO_TOO_LONG = "AUDIO_002"
    AUDIO_TOO_SHORT = "AUDIO_003"
    UNSUPPORTED_FORMAT = "AUDIO_004"
    
    # User context errors
    USER_CONTEXT_ERROR = "CTX_001"
    PROFILE_NOT_FOUND = "CTX_002"
    CONTEXT_CORRUPTION = "CTX_003"
    USER_NOT_FOUND = "CTX_004"
    
    # Storage errors
    DYNAMODB_ERROR = "DB_001"
    DATABASE_ERROR = "DB_002"
    S3_ERROR = "S3_001"
    STORAGE_QUOTA_EXCEEDED = "STORAGE_001"
    
    # Authentication and authorization
    AUTH_FAILED = "AUTH_001"
    PERMISSION_DENIED = "AUTH_002"
    
    # General system errors
    INTERNAL_ERROR = "SYS_001"
    CONFIGURATION_ERROR = "SYS_002"
    RESOURCE_EXHAUSTED = "SYS_003"


@dataclass
class VaaniError:
    """Structured error information for system failures."""
    error_code: str
    error_message: str
    user_friendly_message: str
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
    retry_count: int = 0
    timestamp: datetime = None
    context: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging and storage."""
        return {
            "error_code": self.error_code,
            "error_message": self.error_message,
            "user_friendly_message": self.user_friendly_message,
            "severity": self.severity.value,
            "retry_count": self.retry_count,
            "timestamp": self.timestamp.isoformat(),
            "context": self.context or {}
        }


class VaaniBaseException(Exception):
    """Base exception class for all Vaani-Sahayak errors."""
    
    def __init__(self, error: VaaniError, original_exception: Optional[Exception] = None):
        self.error = error
        self.original_exception = original_exception
        super().__init__(error.error_message)
    
    def __str__(self) -> str:
        return f"[{self.error.error_code}] {self.error.error_message}"


class TranscriptionError(VaaniBaseException):
    """Raised when speech-to-text processing fails."""
    pass


class AIServiceError(VaaniBaseException):
    """Raised when AI service (Bedrock) processing fails."""
    pass


class TextToSpeechError(VaaniBaseException):
    """Raised when text-to-speech conversion fails."""
    pass


class NetworkError(VaaniBaseException):
    """Raised when network connectivity issues occur."""
    pass


class AudioProcessingError(VaaniBaseException):
    """Raised when audio processing or validation fails."""
    pass


class UserContextError(VaaniBaseException):
    """Raised when user context operations fail."""
    pass


class StorageError(VaaniBaseException):
    """Raised when storage operations (DynamoDB, S3) fail."""
    pass


class DatabaseError(VaaniBaseException):
    """Raised when database operations fail."""
    pass


class UserNotFoundError(VaaniBaseException):
    """Raised when user context is not found."""
    pass


class AuthenticationError(VaaniBaseException):
    """Raised when authentication or authorization fails."""
    pass


class ConfigurationError(VaaniBaseException):
    """Raised when system configuration is invalid."""
    pass


# Error response templates in Hindi for user-friendly messages
ERROR_RESPONSES = {
    ErrorCodes.TRANSCRIPTION_FAILED: "माफ करें, मैं आपकी बात समझ नहीं पाई। कृपया फिर से बोलें।",
    ErrorCodes.AUDIO_QUALITY_POOR: "आवाज साफ नहीं आई। कृपया फोन को मुंह के पास रखकर फिर से बोलें।",
    ErrorCodes.BEDROCK_UNAVAILABLE: "अभी सिस्टम में कुछ समस्या है। कृपया थोड़ी देर बाद कोशिश करें।",
    ErrorCodes.NETWORK_TIMEOUT: "नेटवर्क की समस्या है। कृपया कुछ देर बाद कॉल करें।",
    ErrorCodes.SERVICE_UNAVAILABLE: "सेवा अभी उपलब्ध नहीं है। कृपया बाद में कोशिश करें।",
    ErrorCodes.INVALID_AUDIO: "ऑडियो फाइल में समस्या है। कृपया दोबारा रिकॉर्ड करें।",
    ErrorCodes.INTERNAL_ERROR: "तकनीकी समस्या हुई है। कृपया बाद में कोशिश करें।",
    ErrorCodes.AUDIO_TOO_LONG: "संदेश बहुत लंबा है। कृपया छोटे संदेश में बोलें।",
    ErrorCodes.AUDIO_TOO_SHORT: "संदेश बहुत छोटा है। कृपया स्पष्ट रूप से बोलें।"
}


def create_error(error_code: str, 
                error_message: str, 
                severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                context: Optional[Dict[str, Any]] = None) -> VaaniError:
    """Create a VaaniError with appropriate user-friendly message."""
    user_friendly_message = ERROR_RESPONSES.get(
        error_code, 
        "कुछ समस्या हुई है। कृपया बाद में कोशिश करें।"
    )
    
    return VaaniError(
        error_code=error_code,
        error_message=error_message,
        user_friendly_message=user_friendly_message,
        severity=severity,
        context=context
    )


def handle_aws_service_error(service_name: str, 
                           original_exception: Exception,
                           context: Optional[Dict[str, Any]] = None) -> VaaniBaseException:
    """Handle AWS service errors and convert to appropriate Vaani exceptions."""
    error_message = f"{service_name} service error: {str(original_exception)}"
    
    # Map common AWS errors to appropriate error codes
    if "ThrottlingException" in str(original_exception):
        error_code = ErrorCodes.BEDROCK_RATE_LIMIT if service_name == "Bedrock" else ErrorCodes.NETWORK_TIMEOUT
        severity = ErrorSeverity.MEDIUM
    elif "ServiceUnavailable" in str(original_exception):
        error_code = ErrorCodes.SERVICE_UNAVAILABLE
        severity = ErrorSeverity.HIGH
    elif "TimeoutError" in str(original_exception):
        error_code = ErrorCodes.NETWORK_TIMEOUT
        severity = ErrorSeverity.MEDIUM
    else:
        error_code = ErrorCodes.INTERNAL_ERROR
        severity = ErrorSeverity.HIGH
    
    error = create_error(error_code, error_message, severity, context)
    
    # Return appropriate exception type based on service
    if service_name == "Transcribe":
        return TranscriptionError(error, original_exception)
    elif service_name == "Bedrock":
        return AIServiceError(error, original_exception)
    elif service_name == "Polly":
        return TextToSpeechError(error, original_exception)
    elif service_name in ["DynamoDB", "S3"]:
        return StorageError(error, original_exception)
    else:
        return VaaniBaseException(error, original_exception)