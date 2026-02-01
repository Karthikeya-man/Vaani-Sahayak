"""
Core data models for Vaani-Sahayak voice assistant system.

This module defines the primary data structures used throughout the system
for user profiles, conversations, audio processing, and system metrics.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ChannelType(Enum):
    """Enumeration of supported input channels."""
    PSTN = "pstn"
    WEB = "web"


class AudioFormat(Enum):
    """Supported audio formats."""
    OPUS = "opus"
    MP3 = "mp3"
    WAV = "wav"


class ProcessingStatus(Enum):
    """Processing status for audio inputs."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class UserProfile:
    """User profile information stored in DynamoDB."""
    name: str
    phone_number: str
    crop_type: Optional[str] = None
    language: str = "hi-IN"
    location: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for DynamoDB storage."""
        return {
            "name": self.name,
            "phone_number": self.phone_number,
            "crop_type": self.crop_type,
            "language": self.language,
            "location": self.location,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserProfile':
        """Create UserProfile from dictionary."""
        data = data.copy()
        if 'created_at' in data and isinstance(data['created_at'], str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


@dataclass
class ConversationEntry:
    """Individual conversation entry in user history."""
    timestamp: datetime
    user_input: str
    assistant_response: str
    session_id: str
    confidence_score: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for DynamoDB storage."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "user_input": self.user_input,
            "assistant_response": self.assistant_response,
            "session_id": self.session_id,
            "confidence_score": self.confidence_score
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationEntry':
        """Create ConversationEntry from dictionary."""
        data = data.copy()
        if isinstance(data['timestamp'], str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


@dataclass
class AudioInput:
    """Audio input data from either PSTN or web channel."""
    source_channel: ChannelType
    phone_number: str
    audio_data: bytes
    format: AudioFormat
    duration_seconds: float
    session_id: str
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "source_channel": self.source_channel.value,
            "phone_number": self.phone_number,
            "format": self.format.value,
            "duration_seconds": self.duration_seconds,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "audio_size_bytes": len(self.audio_data)
        }


@dataclass
class ProcessingResult:
    """Result of audio processing pipeline."""
    transcribed_text: str
    generated_response: str
    audio_response_url: Optional[str] = None
    confidence_score: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.COMPLETED
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "transcribed_text": self.transcribed_text,
            "generated_response": self.generated_response,
            "audio_response_url": self.audio_response_url,
            "confidence_score": self.confidence_score,
            "processing_time_ms": self.processing_time_ms,
            "error_message": self.error_message,
            "status": self.status.value
        }


@dataclass
class SystemMetrics:
    """System performance and usage metrics."""
    total_calls_today: int
    average_response_time_ms: float
    transcription_accuracy: float
    user_satisfaction_score: float
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "total_calls_today": self.total_calls_today,
            "average_response_time_ms": self.average_response_time_ms,
            "transcription_accuracy": self.transcription_accuracy,
            "user_satisfaction_score": self.user_satisfaction_score,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class UserContext:
    """Complete user context including profile and conversation history."""
    phone_number: str
    user_profile: UserProfile
    conversation_history: List[ConversationEntry] = field(default_factory=list)
    last_interaction: Optional[datetime] = None
    total_interactions: int = 0
    
    def add_conversation(self, entry: ConversationEntry) -> None:
        """Add a new conversation entry to history."""
        self.conversation_history.append(entry)
        self.last_interaction = entry.timestamp
        self.total_interactions += 1
    
    def get_recent_conversations(self, limit: int = 5) -> List[ConversationEntry]:
        """Get the most recent conversation entries."""
        return sorted(self.conversation_history, 
                     key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for DynamoDB storage."""
        return {
            "phone_number": self.phone_number,
            "user_profile": self.user_profile.to_dict(),
            "conversation_history": [entry.to_dict() for entry in self.conversation_history],
            "last_interaction": self.last_interaction.isoformat() if self.last_interaction else None,
            "total_interactions": self.total_interactions
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserContext':
        """Create UserContext from dictionary."""
        user_profile = UserProfile.from_dict(data['user_profile'])
        conversation_history = [
            ConversationEntry.from_dict(entry) 
            for entry in data.get('conversation_history', [])
        ]
        last_interaction = None
        if data.get('last_interaction'):
            last_interaction = datetime.fromisoformat(data['last_interaction'])
        
        return cls(
            phone_number=data['phone_number'],
            user_profile=user_profile,
            conversation_history=conversation_history,
            last_interaction=last_interaction,
            total_interactions=data.get('total_interactions', 0)
        )