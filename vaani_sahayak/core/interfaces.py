"""
Core interfaces and abstract base classes for Vaani-Sahayak.

This module defines the contracts and interfaces that different
components of the system must implement.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from .models import (
    AudioInput, 
    ProcessingResult, 
    UserContext, 
    ConversationEntry,
    UserProfile
)


class AudioProcessor(ABC):
    """Abstract interface for audio processing components."""
    
    @abstractmethod
    async def process_audio(self, audio_input: AudioInput) -> ProcessingResult:
        """Process audio input and return result.
        
        Args:
            audio_input: Audio input data
            
        Returns:
            Processing result with transcription and response
        """
        pass


class TranscriptionService(ABC):
    """Abstract interface for speech-to-text services."""
    
    @abstractmethod
    async def transcribe_audio(self, 
                             audio_data: bytes, 
                             audio_format: str,
                             language_code: str = "hi-IN") -> str:
        """Transcribe audio to text.
        
        Args:
            audio_data: Raw audio data
            audio_format: Audio format (opus, mp3, wav)
            language_code: Language code for transcription
            
        Returns:
            Transcribed text
        """
        pass


class IntelligenceService(ABC):
    """Abstract interface for AI response generation services."""
    
    @abstractmethod
    async def generate_response(self, 
                              user_input: str,
                              user_context: Optional[UserContext] = None) -> str:
        """Generate intelligent response to user input.
        
        Args:
            user_input: Transcribed user input
            user_context: User profile and conversation history
            
        Returns:
            Generated response text
        """
        pass


class TextToSpeechService(ABC):
    """Abstract interface for text-to-speech services."""
    
    @abstractmethod
    async def synthesize_speech(self, 
                              text: str,
                              voice_id: str = "Kajal",
                              language_code: str = "hi-IN") -> bytes:
        """Convert text to speech audio.
        
        Args:
            text: Text to convert to speech
            voice_id: Voice identifier
            language_code: Language code
            
        Returns:
            Audio data as bytes
        """
        pass


class UserContextRepository(ABC):
    """Abstract interface for user context storage and retrieval."""
    
    @abstractmethod
    async def get_user_context(self, phone_number: str) -> Optional[UserContext]:
        """Retrieve user context by phone number.
        
        Args:
            phone_number: User's phone number
            
        Returns:
            User context if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def save_user_context(self, user_context: UserContext) -> None:
        """Save user context to storage.
        
        Args:
            user_context: User context to save
        """
        pass
    
    @abstractmethod
    async def create_user_profile(self, 
                                phone_number: str,
                                name: str,
                                **kwargs) -> UserProfile:
        """Create a new user profile.
        
        Args:
            phone_number: User's phone number
            name: User's name
            **kwargs: Additional profile attributes
            
        Returns:
            Created user profile
        """
        pass
    
    @abstractmethod
    async def update_conversation_history(self, 
                                        phone_number: str,
                                        conversation_entry: ConversationEntry) -> None:
        """Add conversation entry to user's history.
        
        Args:
            phone_number: User's phone number
            conversation_entry: Conversation entry to add
        """
        pass


class AudioStorage(ABC):
    """Abstract interface for audio file storage."""
    
    @abstractmethod
    async def store_audio(self, 
                        audio_data: bytes,
                        key: str,
                        content_type: str = "audio/mpeg") -> str:
        """Store audio data and return access URL.
        
        Args:
            audio_data: Audio data to store
            key: Storage key/path
            content_type: MIME type of audio
            
        Returns:
            URL to access the stored audio
        """
        pass
    
    @abstractmethod
    async def get_audio(self, key: str) -> bytes:
        """Retrieve audio data by key.
        
        Args:
            key: Storage key/path
            
        Returns:
            Audio data as bytes
        """
        pass
    
    @abstractmethod
    async def delete_audio(self, key: str) -> None:
        """Delete audio file by key.
        
        Args:
            key: Storage key/path
        """
        pass
    
    @abstractmethod
    async def generate_presigned_url(self, 
                                   key: str,
                                   expiration: int = 3600) -> str:
        """Generate presigned URL for audio access.
        
        Args:
            key: Storage key/path
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        pass


class EventProcessor(ABC):
    """Abstract interface for processing different types of events."""
    
    @abstractmethod
    async def process_kinesis_event(self, event: Dict[str, Any]) -> ProcessingResult:
        """Process Kinesis Video Stream event (PSTN channel).
        
        Args:
            event: Kinesis event data
            
        Returns:
            Processing result
        """
        pass
    
    @abstractmethod
    async def process_s3_event(self, event: Dict[str, Any]) -> ProcessingResult:
        """Process S3 upload event (Web channel).
        
        Args:
            event: S3 event data
            
        Returns:
            Processing result
        """
        pass


class ResponseDelivery(ABC):
    """Abstract interface for delivering responses through different channels."""
    
    @abstractmethod
    async def deliver_pstn_response(self, 
                                  audio_data: bytes,
                                  session_id: str) -> None:
        """Deliver audio response to PSTN channel.
        
        Args:
            audio_data: Audio response data
            session_id: Call session identifier
        """
        pass
    
    @abstractmethod
    async def deliver_web_response(self, 
                                 audio_data: bytes,
                                 phone_number: str,
                                 session_id: str) -> str:
        """Deliver audio response to web channel.
        
        Args:
            audio_data: Audio response data
            phone_number: User's phone number
            session_id: Session identifier
            
        Returns:
            URL to access the response audio
        """
        pass


class MetricsCollector(ABC):
    """Abstract interface for collecting system metrics."""
    
    @abstractmethod
    async def record_processing_time(self, 
                                   operation: str,
                                   duration_ms: int,
                                   context: Optional[Dict[str, Any]] = None) -> None:
        """Record processing time metric.
        
        Args:
            operation: Operation name
            duration_ms: Duration in milliseconds
            context: Additional context
        """
        pass
    
    @abstractmethod
    async def record_error(self, 
                         error_code: str,
                         error_message: str,
                         context: Optional[Dict[str, Any]] = None) -> None:
        """Record error occurrence.
        
        Args:
            error_code: Error code
            error_message: Error message
            context: Additional context
        """
        pass
    
    @abstractmethod
    async def record_user_interaction(self, 
                                    phone_number: str,
                                    channel: str,
                                    success: bool) -> None:
        """Record user interaction metric.
        
        Args:
            phone_number: User's phone number
            channel: Interaction channel (pstn/web)
            success: Whether interaction was successful
        """
        pass


class ConfigurationProvider(ABC):
    """Abstract interface for configuration management."""
    
    @abstractmethod
    def get_config(self, key: str, default: Any = None) -> Any:
        """Get configuration value by key.
        
        Args:
            key: Configuration key
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        pass
    
    @abstractmethod
    def get_aws_config(self) -> Dict[str, Any]:
        """Get AWS service configuration.
        
        Returns:
            AWS configuration dictionary
        """
        pass
    
    @abstractmethod
    def get_service_endpoints(self) -> Dict[str, str]:
        """Get service endpoint URLs.
        
        Returns:
            Dictionary of service endpoints
        """
        pass