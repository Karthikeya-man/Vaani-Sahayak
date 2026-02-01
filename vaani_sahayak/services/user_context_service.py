"""
DynamoDB-based user context management service for Vaani-Sahayak.

This module implements user profile creation, retrieval, and conversation
history management using Amazon DynamoDB as the storage backend.
"""

import json
from typing import Optional, List, Dict, Any
from datetime import datetime
from botocore.exceptions import ClientError

from ..core.interfaces import UserContextRepository
from ..core.models import UserContext, UserProfile, ConversationEntry
from ..core.aws_config import get_aws_config
from ..core.exceptions import (
    DatabaseError, 
    UserNotFoundError, 
    create_error, 
    ErrorCodes, 
    ErrorSeverity
)
from ..utils.logging_config import get_logger

logger = get_logger(__name__)


class DynamoDBUserContextService(UserContextRepository):
    """DynamoDB implementation of user context repository."""
    
    def __init__(self, table_name: str = "vaani-user-context"):
        """Initialize DynamoDB user context service.
        
        Args:
            table_name: Name of the DynamoDB table for user context storage
        """
        self.table_name = table_name
        self.aws_config = get_aws_config()
        self.dynamodb = self.aws_config.get_dynamodb_client()
        logger.info(f"Initialized DynamoDB user context service with table: {table_name}")
    
    async def get_user_context(self, phone_number: str) -> Optional[UserContext]:
        """Retrieve user context by phone number.
        
        Args:
            phone_number: User's phone number (primary key)
            
        Returns:
            UserContext if found, None otherwise
            
        Raises:
            DatabaseError: If DynamoDB operation fails
        """
        try:
            logger.debug(f"Retrieving user context for phone: {phone_number}")
            
            response = self.dynamodb.get_item(
                TableName=self.table_name,
                Key={
                    'phone_number': {'S': phone_number}
                }
            )
            
            if 'Item' not in response:
                logger.info(f"No user context found for phone: {phone_number}")
                return None
            
            # Convert DynamoDB item to UserContext
            item_data = self._dynamodb_item_to_dict(response['Item'])
            user_context = UserContext.from_dict(item_data)
            
            logger.info(f"Retrieved user context for {phone_number}: {user_context.total_interactions} interactions")
            return user_context
            
        except ClientError as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to retrieve user context for {phone_number}: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": phone_number, "operation": "get_user_context"}
            )
            logger.error(f"DynamoDB get_item failed: {error}")
            raise DatabaseError(error, e)
        except Exception as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Unexpected error retrieving user context: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": phone_number}
            )
            logger.error(f"Unexpected error in get_user_context: {error}")
            raise DatabaseError(error, e)
    
    async def save_user_context(self, user_context: UserContext) -> None:
        """Save user context to DynamoDB.
        
        Args:
            user_context: UserContext to save
            
        Raises:
            DatabaseError: If DynamoDB operation fails
        """
        try:
            logger.debug(f"Saving user context for phone: {user_context.phone_number}")
            
            # Convert UserContext to DynamoDB item format
            item_data = user_context.to_dict()
            dynamodb_item = self._dict_to_dynamodb_item(item_data)
            
            self.dynamodb.put_item(
                TableName=self.table_name,
                Item=dynamodb_item
            )
            
            logger.info(f"Saved user context for {user_context.phone_number}")
            
        except ClientError as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to save user context for {user_context.phone_number}: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": user_context.phone_number, "operation": "save_user_context"}
            )
            logger.error(f"DynamoDB put_item failed: {error}")
            raise DatabaseError(error, e)
        except Exception as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Unexpected error saving user context: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": user_context.phone_number}
            )
            logger.error(f"Unexpected error in save_user_context: {error}")
            raise DatabaseError(error, e)
    
    async def create_user_profile(self, 
                                phone_number: str,
                                name: str,
                                **kwargs) -> UserProfile:
        """Create a new user profile.
        
        Args:
            phone_number: User's phone number
            name: User's name
            **kwargs: Additional profile attributes (crop_type, location, etc.)
            
        Returns:
            Created UserProfile
            
        Raises:
            DatabaseError: If profile creation fails
        """
        try:
            logger.debug(f"Creating user profile for phone: {phone_number}, name: {name}")
            
            # Create user profile
            user_profile = UserProfile(
                name=name,
                phone_number=phone_number,
                crop_type=kwargs.get('crop_type'),
                language=kwargs.get('language', 'hi-IN'),
                location=kwargs.get('location'),
                created_at=datetime.now()
            )
            
            # Create initial user context
            user_context = UserContext(
                phone_number=phone_number,
                user_profile=user_profile,
                conversation_history=[],
                last_interaction=None,
                total_interactions=0
            )
            
            # Save to DynamoDB
            await self.save_user_context(user_context)
            
            logger.info(f"Created new user profile for {phone_number}: {name}")
            return user_profile
            
        except Exception as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to create user profile: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": phone_number, "name": name}
            )
            logger.error(f"Error creating user profile: {error}")
            raise DatabaseError(error, e)
    
    async def update_conversation_history(self, 
                                        phone_number: str,
                                        conversation_entry: ConversationEntry) -> None:
        """Add conversation entry to user's history.
        
        Args:
            phone_number: User's phone number
            conversation_entry: Conversation entry to add
            
        Raises:
            UserNotFoundError: If user context doesn't exist
            DatabaseError: If update operation fails
        """
        try:
            logger.debug(f"Updating conversation history for phone: {phone_number}")
            
            # Get existing user context
            user_context = await self.get_user_context(phone_number)
            if user_context is None:
                error = create_error(
                    ErrorCodes.USER_NOT_FOUND,
                    f"User context not found for phone number: {phone_number}",
                    ErrorSeverity.MEDIUM,
                    {"phone_number": phone_number}
                )
                logger.warning(f"User not found for conversation update: {error}")
                raise UserNotFoundError(error)
            
            # Add conversation entry
            user_context.add_conversation(conversation_entry)
            
            # Limit conversation history to last 50 entries to manage storage
            if len(user_context.conversation_history) > 50:
                user_context.conversation_history = user_context.conversation_history[-50:]
            
            # Save updated context
            await self.save_user_context(user_context)
            
            logger.info(f"Updated conversation history for {phone_number}: {user_context.total_interactions} total interactions")
            
        except UserNotFoundError:
            raise  # Re-raise UserNotFoundError as-is
        except Exception as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to update conversation history: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": phone_number}
            )
            logger.error(f"Error updating conversation history: {error}")
            raise DatabaseError(error, e)
    
    async def get_or_create_user_context(self, 
                                       phone_number: str,
                                       default_name: str = "उपयोगकर्ता") -> UserContext:
        """Get existing user context or create new one if not found.
        
        Args:
            phone_number: User's phone number
            default_name: Default name for new users
            
        Returns:
            UserContext (existing or newly created)
        """
        try:
            # Try to get existing context
            user_context = await self.get_user_context(phone_number)
            
            if user_context is None:
                logger.info(f"Creating new user context for phone: {phone_number}")
                # Create new user profile and context
                user_profile = await self.create_user_profile(
                    phone_number=phone_number,
                    name=default_name
                )
                user_context = UserContext(
                    phone_number=phone_number,
                    user_profile=user_profile,
                    conversation_history=[],
                    last_interaction=None,
                    total_interactions=0
                )
            
            return user_context
            
        except Exception as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to get or create user context: {str(e)}",
                ErrorSeverity.HIGH,
                {"phone_number": phone_number}
            )
            logger.error(f"Error in get_or_create_user_context: {error}")
            raise DatabaseError(error, e)
    
    def _dict_to_dynamodb_item(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python dictionary to DynamoDB item format.
        
        Args:
            data: Python dictionary
            
        Returns:
            DynamoDB item format dictionary
        """
        def convert_value(value):
            if value is None:
                return {'NULL': True}
            elif isinstance(value, bool):  # Check bool before int/float since bool is subclass of int
                return {'BOOL': value}
            elif isinstance(value, str):
                return {'S': value}
            elif isinstance(value, (int, float)):
                return {'N': str(value)}
            elif isinstance(value, list):
                return {'L': [convert_value(item) for item in value]}
            elif isinstance(value, dict):
                return {'M': {k: convert_value(v) for k, v in value.items()}}
            else:
                # Convert other types to string
                return {'S': str(value)}
        
        return {key: convert_value(value) for key, value in data.items()}
    
    def _dynamodb_item_to_dict(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB item format to Python dictionary.
        
        Args:
            item: DynamoDB item format dictionary
            
        Returns:
            Python dictionary
        """
        def convert_value(value):
            if 'NULL' in value:
                return None
            elif 'S' in value:
                return value['S']
            elif 'N' in value:
                # Try to convert to int first, then float
                try:
                    return int(value['N'])
                except ValueError:
                    return float(value['N'])
            elif 'BOOL' in value:
                return value['BOOL']
            elif 'L' in value:
                return [convert_value(item) for item in value['L']]
            elif 'M' in value:
                return {k: convert_value(v) for k, v in value['M'].items()}
            else:
                # Fallback for other types
                return str(value)
        
        return {key: convert_value(value) for key, value in item.items()}
    
    async def delete_user_context(self, phone_number: str) -> None:
        """Delete user context (for testing or data cleanup).
        
        Args:
            phone_number: User's phone number
            
        Raises:
            DatabaseError: If delete operation fails
        """
        try:
            logger.debug(f"Deleting user context for phone: {phone_number}")
            
            self.dynamodb.delete_item(
                TableName=self.table_name,
                Key={
                    'phone_number': {'S': phone_number}
                }
            )
            
            logger.info(f"Deleted user context for {phone_number}")
            
        except ClientError as e:
            error = create_error(
                ErrorCodes.DATABASE_ERROR,
                f"Failed to delete user context for {phone_number}: {str(e)}",
                ErrorSeverity.MEDIUM,
                {"phone_number": phone_number, "operation": "delete_user_context"}
            )
            logger.error(f"DynamoDB delete_item failed: {error}")
            raise DatabaseError(error, e)