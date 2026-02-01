"""
Unit tests for DynamoDB user context service.

Tests user profile creation, retrieval, conversation history management,
and error handling for the DynamoDB-based user context repository.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
from botocore.exceptions import ClientError

from vaani_sahayak.services.user_context_service import DynamoDBUserContextService
from vaani_sahayak.core.models import UserContext, UserProfile, ConversationEntry
from vaani_sahayak.core.exceptions import DatabaseError, UserNotFoundError


class TestDynamoDBUserContextService:
    """Test cases for DynamoDB user context service."""
    
    @pytest.fixture
    def mock_dynamodb_client(self):
        """Mock DynamoDB client."""
        return Mock()
    
    @pytest.fixture
    def user_context_service(self, mock_dynamodb_client):
        """Create user context service with mocked DynamoDB client."""
        with patch('vaani_sahayak.services.user_context_service.get_aws_config') as mock_aws_config:
            mock_aws_config.return_value.get_dynamodb_client.return_value = mock_dynamodb_client
            service = DynamoDBUserContextService("test-table")
            return service
    
    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile for testing."""
        return UserProfile(
            name="राम कुमार",
            phone_number="+919876543210",
            crop_type="wheat",
            language="hi-IN",
            location="UP",
            created_at=datetime(2024, 1, 15, 10, 30, 0)
        )
    
    @pytest.fixture
    def sample_conversation_entry(self):
        """Sample conversation entry for testing."""
        return ConversationEntry(
            timestamp=datetime(2024, 1, 15, 10, 35, 0),
            user_input="मेरी गेहूं की फसल में कीड़े लग गए हैं",
            assistant_response="राम जी, गेहूं में कीड़े की समस्या आम है...",
            session_id="session_123",
            confidence_score=0.95
        )
    
    @pytest.fixture
    def sample_user_context(self, sample_user_profile, sample_conversation_entry):
        """Sample user context for testing."""
        context = UserContext(
            phone_number="+919876543210",
            user_profile=sample_user_profile,
            conversation_history=[sample_conversation_entry],
            last_interaction=datetime(2024, 1, 15, 10, 35, 0),
            total_interactions=1
        )
        return context
    
    @pytest.mark.asyncio
    async def test_get_user_context_existing_user(self, user_context_service, mock_dynamodb_client, sample_user_context):
        """Test retrieving existing user context."""
        # Mock DynamoDB response
        mock_response = {
            'Item': {
                'phone_number': {'S': '+919876543210'},
                'user_profile': {'M': {
                    'name': {'S': 'राम कुमार'},
                    'phone_number': {'S': '+919876543210'},
                    'crop_type': {'S': 'wheat'},
                    'language': {'S': 'hi-IN'},
                    'location': {'S': 'UP'},
                    'created_at': {'S': '2024-01-15T10:30:00'}
                }},
                'conversation_history': {'L': [{
                    'M': {
                        'timestamp': {'S': '2024-01-15T10:35:00'},
                        'user_input': {'S': 'मेरी गेहूं की फसल में कीड़े लग गए हैं'},
                        'assistant_response': {'S': 'राम जी, गेहूं में कीड़े की समस्या आम है...'},
                        'session_id': {'S': 'session_123'},
                        'confidence_score': {'N': '0.95'}
                    }
                }]},
                'last_interaction': {'S': '2024-01-15T10:35:00'},
                'total_interactions': {'N': '1'}
            }
        }
        mock_dynamodb_client.get_item.return_value = mock_response
        
        # Test retrieval
        result = await user_context_service.get_user_context("+919876543210")
        
        # Assertions
        assert result is not None
        assert result.phone_number == "+919876543210"
        assert result.user_profile.name == "राम कुमार"
        assert result.total_interactions == 1
        assert len(result.conversation_history) == 1
        
        # Verify DynamoDB call
        mock_dynamodb_client.get_item.assert_called_once_with(
            TableName="test-table",
            Key={'phone_number': {'S': '+919876543210'}}
        )
    
    @pytest.mark.asyncio
    async def test_get_user_context_not_found(self, user_context_service, mock_dynamodb_client):
        """Test retrieving non-existent user context."""
        # Mock DynamoDB response for non-existent user
        mock_dynamodb_client.get_item.return_value = {}
        
        # Test retrieval
        result = await user_context_service.get_user_context("+919876543210")
        
        # Assertions
        assert result is None
        
        # Verify DynamoDB call
        mock_dynamodb_client.get_item.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_user_context_dynamodb_error(self, user_context_service, mock_dynamodb_client):
        """Test handling DynamoDB errors during retrieval."""
        # Mock DynamoDB client error
        mock_dynamodb_client.get_item.side_effect = ClientError(
            {'Error': {'Code': 'ResourceNotFoundException', 'Message': 'Table not found'}},
            'GetItem'
        )
        
        # Test error handling
        with pytest.raises(DatabaseError):
            await user_context_service.get_user_context("+919876543210")
    
    @pytest.mark.asyncio
    async def test_save_user_context(self, user_context_service, mock_dynamodb_client, sample_user_context):
        """Test saving user context to DynamoDB."""
        # Mock successful DynamoDB response
        mock_dynamodb_client.put_item.return_value = {}
        
        # Test saving
        await user_context_service.save_user_context(sample_user_context)
        
        # Verify DynamoDB call
        mock_dynamodb_client.put_item.assert_called_once()
        call_args = mock_dynamodb_client.put_item.call_args
        assert call_args[1]['TableName'] == "test-table"
        assert 'Item' in call_args[1]
    
    @pytest.mark.asyncio
    async def test_save_user_context_error(self, user_context_service, mock_dynamodb_client, sample_user_context):
        """Test handling errors during user context save."""
        # Mock DynamoDB client error
        mock_dynamodb_client.put_item.side_effect = ClientError(
            {'Error': {'Code': 'ValidationException', 'Message': 'Invalid item'}},
            'PutItem'
        )
        
        # Test error handling
        with pytest.raises(DatabaseError):
            await user_context_service.save_user_context(sample_user_context)
    
    @pytest.mark.asyncio
    async def test_create_user_profile(self, user_context_service, mock_dynamodb_client):
        """Test creating new user profile."""
        # Mock successful DynamoDB response
        mock_dynamodb_client.put_item.return_value = {}
        
        # Test profile creation
        result = await user_context_service.create_user_profile(
            phone_number="+919876543210",
            name="राम कुमार",
            crop_type="wheat",
            location="UP"
        )
        
        # Assertions
        assert result.name == "राम कुमार"
        assert result.phone_number == "+919876543210"
        assert result.crop_type == "wheat"
        assert result.location == "UP"
        assert result.language == "hi-IN"  # Default value
        
        # Verify DynamoDB call
        mock_dynamodb_client.put_item.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_conversation_history_existing_user(self, user_context_service, mock_dynamodb_client, sample_user_context, sample_conversation_entry):
        """Test updating conversation history for existing user."""
        # Mock get_user_context to return existing context
        with patch.object(user_context_service, 'get_user_context', return_value=sample_user_context):
            with patch.object(user_context_service, 'save_user_context') as mock_save:
                # Test conversation update
                new_entry = ConversationEntry(
                    timestamp=datetime(2024, 1, 15, 11, 0, 0),
                    user_input="धन्यवाद",
                    assistant_response="आपका स्वागत है",
                    session_id="session_124"
                )
                
                await user_context_service.update_conversation_history("+919876543210", new_entry)
                
                # Verify save was called
                mock_save.assert_called_once()
                
                # Check that conversation was added
                saved_context = mock_save.call_args[0][0]
                assert saved_context.total_interactions == 2
                assert len(saved_context.conversation_history) == 2
    
    @pytest.mark.asyncio
    async def test_update_conversation_history_user_not_found(self, user_context_service, mock_dynamodb_client, sample_conversation_entry):
        """Test updating conversation history for non-existent user."""
        # Mock get_user_context to return None
        with patch.object(user_context_service, 'get_user_context', return_value=None):
            # Test error handling
            with pytest.raises(UserNotFoundError):
                await user_context_service.update_conversation_history("+919876543210", sample_conversation_entry)
    
    @pytest.mark.asyncio
    async def test_get_or_create_user_context_existing(self, user_context_service, sample_user_context):
        """Test get_or_create for existing user."""
        # Mock get_user_context to return existing context
        with patch.object(user_context_service, 'get_user_context', return_value=sample_user_context):
            result = await user_context_service.get_or_create_user_context("+919876543210")
            
            # Should return existing context
            assert result == sample_user_context
    
    @pytest.mark.asyncio
    async def test_get_or_create_user_context_new_user(self, user_context_service, sample_user_profile):
        """Test get_or_create for new user."""
        # Mock get_user_context to return None (user not found)
        with patch.object(user_context_service, 'get_user_context', return_value=None):
            with patch.object(user_context_service, 'create_user_profile', return_value=sample_user_profile):
                result = await user_context_service.get_or_create_user_context("+919876543210", "राम कुमार")
                
                # Should return new context
                assert result.phone_number == "+919876543210"
                assert result.user_profile == sample_user_profile
                assert result.total_interactions == 0
    
    @pytest.mark.asyncio
    async def test_delete_user_context(self, user_context_service, mock_dynamodb_client):
        """Test deleting user context."""
        # Mock successful DynamoDB response
        mock_dynamodb_client.delete_item.return_value = {}
        
        # Test deletion
        await user_context_service.delete_user_context("+919876543210")
        
        # Verify DynamoDB call
        mock_dynamodb_client.delete_item.assert_called_once_with(
            TableName="test-table",
            Key={'phone_number': {'S': '+919876543210'}}
        )
    
    def test_dict_to_dynamodb_item_conversion(self, user_context_service):
        """Test conversion from Python dict to DynamoDB item format."""
        test_data = {
            "string_field": "test",
            "number_field": 42,
            "float_field": 3.14,
            "bool_field": True,
            "null_field": None,
            "list_field": ["item1", 2, True],
            "dict_field": {"nested": "value"}
        }
        
        result = user_context_service._dict_to_dynamodb_item(test_data)
        
        # Verify conversions
        assert result["string_field"] == {"S": "test"}
        assert result["number_field"] == {"N": "42"}
        assert result["float_field"] == {"N": "3.14"}
        assert result["bool_field"] == {"BOOL": True}
        assert result["null_field"] == {"NULL": True}
        assert result["list_field"]["L"][0] == {"S": "item1"}
        assert result["dict_field"]["M"]["nested"] == {"S": "value"}
    
    def test_dynamodb_item_to_dict_conversion(self, user_context_service):
        """Test conversion from DynamoDB item format to Python dict."""
        dynamodb_item = {
            "string_field": {"S": "test"},
            "number_field": {"N": "42"},
            "float_field": {"N": "3.14"},
            "bool_field": {"BOOL": True},
            "null_field": {"NULL": True},
            "list_field": {"L": [{"S": "item1"}, {"N": "2"}, {"BOOL": True}]},
            "dict_field": {"M": {"nested": {"S": "value"}}}
        }
        
        result = user_context_service._dynamodb_item_to_dict(dynamodb_item)
        
        # Verify conversions
        assert result["string_field"] == "test"
        assert result["number_field"] == 42
        assert result["float_field"] == 3.14
        assert result["bool_field"] is True
        assert result["null_field"] is None
        assert result["list_field"] == ["item1", 2, True]
        assert result["dict_field"] == {"nested": "value"}