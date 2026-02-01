"""
Tests for core data models.
"""

import pytest
from datetime import datetime
from vaani_sahayak.core.models import (
    UserProfile, 
    ConversationEntry, 
    AudioInput, 
    ProcessingResult,
    UserContext,
    ChannelType,
    AudioFormat,
    ProcessingStatus
)


class TestUserProfile:
    """Test UserProfile data model."""
    
    def test_user_profile_creation(self):
        """Test basic user profile creation."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210",
            crop_type="wheat",
            location="UP"
        )
        
        assert profile.name == "राम कुमार"
        assert profile.phone_number == "+919876543210"
        assert profile.crop_type == "wheat"
        assert profile.language == "hi-IN"  # default
        assert profile.location == "UP"
        assert isinstance(profile.created_at, datetime)
    
    def test_user_profile_to_dict(self):
        """Test user profile dictionary conversion."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210"
        )
        
        profile_dict = profile.to_dict()
        
        assert profile_dict["name"] == "राम कुमार"
        assert profile_dict["phone_number"] == "+919876543210"
        assert profile_dict["language"] == "hi-IN"
        assert "created_at" in profile_dict
    
    def test_user_profile_from_dict(self):
        """Test user profile creation from dictionary."""
        data = {
            "name": "राम कुमार",
            "phone_number": "+919876543210",
            "crop_type": "wheat",
            "language": "hi-IN",
            "location": "UP",
            "created_at": "2024-01-15T10:30:00"
        }
        
        profile = UserProfile.from_dict(data)
        
        assert profile.name == "राम कुमार"
        assert profile.phone_number == "+919876543210"
        assert profile.crop_type == "wheat"
        assert isinstance(profile.created_at, datetime)


class TestConversationEntry:
    """Test ConversationEntry data model."""
    
    def test_conversation_entry_creation(self):
        """Test conversation entry creation."""
        entry = ConversationEntry(
            timestamp=datetime.now(),
            user_input="मेरी फसल में कीड़े लग गए हैं",
            assistant_response="राम जी, कीड़े की समस्या आम है...",
            session_id="session_123",
            confidence_score=0.95
        )
        
        assert entry.user_input == "मेरी फसल में कीड़े लग गए हैं"
        assert entry.assistant_response == "राम जी, कीड़े की समस्या आम है..."
        assert entry.session_id == "session_123"
        assert entry.confidence_score == 0.95
    
    def test_conversation_entry_serialization(self):
        """Test conversation entry serialization."""
        timestamp = datetime.now()
        entry = ConversationEntry(
            timestamp=timestamp,
            user_input="test input",
            assistant_response="test response",
            session_id="session_123"
        )
        
        entry_dict = entry.to_dict()
        reconstructed = ConversationEntry.from_dict(entry_dict)
        
        assert reconstructed.user_input == entry.user_input
        assert reconstructed.assistant_response == entry.assistant_response
        assert reconstructed.session_id == entry.session_id


class TestAudioInput:
    """Test AudioInput data model."""
    
    def test_audio_input_creation(self):
        """Test audio input creation."""
        audio_data = b"fake_audio_data"
        audio_input = AudioInput(
            source_channel=ChannelType.PSTN,
            phone_number="+919876543210",
            audio_data=audio_data,
            format=AudioFormat.OPUS,
            duration_seconds=5.5,
            session_id="session_123"
        )
        
        assert audio_input.source_channel == ChannelType.PSTN
        assert audio_input.phone_number == "+919876543210"
        assert audio_input.audio_data == audio_data
        assert audio_input.format == AudioFormat.OPUS
        assert audio_input.duration_seconds == 5.5
        assert audio_input.session_id == "session_123"
    
    def test_audio_input_to_dict(self):
        """Test audio input dictionary conversion."""
        audio_data = b"fake_audio_data"
        audio_input = AudioInput(
            source_channel=ChannelType.WEB,
            phone_number="+919876543210",
            audio_data=audio_data,
            format=AudioFormat.MP3,
            duration_seconds=3.2,
            session_id="session_456"
        )
        
        audio_dict = audio_input.to_dict()
        
        assert audio_dict["source_channel"] == "web"
        assert audio_dict["phone_number"] == "+919876543210"
        assert audio_dict["format"] == "mp3"
        assert audio_dict["duration_seconds"] == 3.2
        assert audio_dict["session_id"] == "session_456"
        assert audio_dict["audio_size_bytes"] == len(audio_data)


class TestUserContext:
    """Test UserContext data model."""
    
    def test_user_context_creation(self):
        """Test user context creation."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210"
        )
        
        context = UserContext(
            phone_number="+919876543210",
            user_profile=profile
        )
        
        assert context.phone_number == "+919876543210"
        assert context.user_profile == profile
        assert context.conversation_history == []
        assert context.total_interactions == 0
    
    def test_add_conversation(self):
        """Test adding conversation to context."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210"
        )
        
        context = UserContext(
            phone_number="+919876543210",
            user_profile=profile
        )
        
        entry = ConversationEntry(
            timestamp=datetime.now(),
            user_input="test input",
            assistant_response="test response",
            session_id="session_123"
        )
        
        context.add_conversation(entry)
        
        assert len(context.conversation_history) == 1
        assert context.total_interactions == 1
        assert context.last_interaction == entry.timestamp
    
    def test_get_recent_conversations(self):
        """Test getting recent conversations."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210"
        )
        
        context = UserContext(
            phone_number="+919876543210",
            user_profile=profile
        )
        
        # Add multiple conversations
        for i in range(7):
            entry = ConversationEntry(
                timestamp=datetime.now(),
                user_input=f"input {i}",
                assistant_response=f"response {i}",
                session_id=f"session_{i}"
            )
            context.add_conversation(entry)
        
        recent = context.get_recent_conversations(limit=5)
        
        assert len(recent) == 5
        # Should be in reverse chronological order
        assert recent[0].user_input == "input 6"
        assert recent[4].user_input == "input 2"
    
    def test_user_context_serialization(self):
        """Test user context serialization."""
        profile = UserProfile(
            name="राम कुमार",
            phone_number="+919876543210"
        )
        
        context = UserContext(
            phone_number="+919876543210",
            user_profile=profile
        )
        
        entry = ConversationEntry(
            timestamp=datetime.now(),
            user_input="test input",
            assistant_response="test response",
            session_id="session_123"
        )
        context.add_conversation(entry)
        
        context_dict = context.to_dict()
        reconstructed = UserContext.from_dict(context_dict)
        
        assert reconstructed.phone_number == context.phone_number
        assert reconstructed.user_profile.name == context.user_profile.name
        assert len(reconstructed.conversation_history) == 1
        assert reconstructed.total_interactions == 1