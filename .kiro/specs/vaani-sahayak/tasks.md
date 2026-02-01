# Implementation Plan: Vaani-Sahayak

## Overview

This implementation plan breaks down the Vaani-Sahayak voice assistant into discrete coding tasks that build incrementally around the three-pillar architecture. The system will be implemented using Python with AWS services, following the "Write Once, Serve Everyone" principle with integrated Scheme Intelligence (RAG), ONDC Market Intelligence, and Hybrid Interface capabilities. Each task builds on previous work and includes comprehensive testing to ensure reliability for rural users.

## Three-Pillar Architecture Implementation

### Pillar 1: Hybrid Interface (Nokia + Streamlit)
### Pillar 2: Scheme Intelligence (RAG with Bedrock Knowledge Bases)  
### Pillar 3: ONDC Market Intelligence (Real-time APIs)

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Create Python project structure with proper packaging
  - Define core data models and interfaces using dataclasses (UserProfile, SchemeApplication, MarketQuery, ONDCResponse)
  - Set up AWS SDK (boto3) configuration and credentials management
  - Create base exception classes and error handling framework for all three pillars
  - Set up logging configuration for structured logging with interaction type tracking
  - _Requirements: 10.5, 11.4_

- [x] 2. Implement Lambda Orchestrator with Bedrock Agent integration
  - [x] 2.1 Create main Lambda handler with event source detection
    - Implement `lambda_handler` function as main entry point
    - Add logic to detect Kinesis vs S3 event sources (Nokia vs Streamlit)
    - Create routing logic for different input channels to Bedrock Agent
    - _Requirements: 1.3, 10.1, 10.2_

  - [x] 2.2 Write property test for event source detection

    - **Property 10: Event-Driven Architecture Consistency**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.5**

  - [x] 2.3 Implement audio data extraction for both channels
    - Extract audio chunks from Kinesis Video Streams events (Nokia calls)
    - Download audio files from S3 using event metadata (Streamlit uploads)
    - Handle different audio formats (Opus, MP3, WAV) with channel-specific optimization
    - _Requirements: 1.4, 1.5_

  - [x] 2.4 Write unit tests for audio data extraction

    - Test Kinesis event parsing with Nokia call sample events
    - Test S3 file download with various Streamlit audio formats
    - Test error handling for malformed events from both channels
    - _Requirements: 1.4, 1.5_

- [-] 3. Implement enhanced user context management system
  - [-] 3.1 Create DynamoDB user context operations with interaction tracking
    - Implement user profile creation and retrieval with crop preferences and location
    - Add conversation history storage with interaction type (scheme/market) tracking
    - Create phone number-based user identification across both channels
    - Handle scheme application progress and market preference storage
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 3.2 Write property test for user context lifecycle
    - **Property 6: User Context Lifecycle Management**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [ ] 3.3 Implement context-aware response enhancement for both pillars
    - Retrieve user profile and conversation history for personalization
    - Integrate context into Bedrock Agent prompt generation
    - Update conversation history with action group usage tracking
    - _Requirements: 6.4, 6.5_

  - [ ]* 3.4 Write property test for context-aware responses
    - **Property 6: User Context Lifecycle Management**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 4. Implement Bedrock Agent with specialized Action Groups
  - [ ] 4.1 Create Amazon Bedrock Agent configuration
    - Set up Bedrock Agent with Gram-Didi persona and intent classification
    - Configure agent with ActionGroup_Schemes and ActionGroup_ONDC
    - Implement agent invocation and response handling
    - Add error handling for agent unavailability
    - _Requirements: 5.1, 5.5_

  - [ ] 4.2 Implement ActionGroup_Schemes with Knowledge Base integration
    - Create Lambda function for scheme-related queries
    - Integrate with Bedrock Knowledge Base for government PDF documents
    - Implement intelligent slot-filling for scheme applications
    - Add form generation and S3 storage for applications
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.3 Write property test for scheme intelligence
    - **Property 4: Scheme Intelligence with RAG**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ] 4.4 Implement ActionGroup_ONDC with market intelligence
    - Create Lambda function for ONDC market queries
    - Integrate with ONDC Network Gateways for real-time prices
    - Implement buyer search and connection facilitation
    - Add caching for market data when ONDC is unavailable
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.5 Write property test for ONDC market intelligence
    - **Property 5: ONDC Market Intelligence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ] 4.6 Implement intent classification and routing
    - Add intent classification logic in Bedrock Agent
    - Route Market/Price queries to ActionGroup_ONDC
    - Route Scheme/Form queries to ActionGroup_Schemes
    - Handle ambiguous intents with clarifying questions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 4.7 Write property test for intent classification
    - **Property 3: Intent Classification and Action Group Routing**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 5. Set up Knowledge Base and ONDC infrastructure
  - [ ] 5.1 Create Bedrock Knowledge Base with government documents
    - Set up S3 bucket with government scheme PDF documents
    - Configure OpenSearch Serverless for vector storage
    - Implement document ingestion and embedding generation
    - Add automatic re-indexing when documents are updated
    - _Requirements: 3.1, 3.5_

  - [ ] 5.2 Implement ONDC Network Gateway integration
    - Set up ONDC Buyer App (BAP) certification and credentials
    - Implement ONDC Search API for market price discovery
    - Implement ONDC Select API for buyer-farmer connections
    - Add authentication and security for ONDC communications
    - _Requirements: 4.1, 4.3, 4.4_

  - [ ]* 5.3 Write unit tests for Knowledge Base operations
    - Test document ingestion and vector search
    - Test scheme information retrieval accuracy
    - Test automatic re-indexing functionality
    - _Requirements: 3.1, 3.5_

  - [ ]* 5.4 Write unit tests for ONDC integration
    - Test ONDC Search API with sample crop queries
    - Test ONDC Select API for buyer connections
    - Test error handling for ONDC service unavailability
    - _Requirements: 4.1, 4.4, 4.5_

- [ ] 6. Checkpoint - Ensure Bedrock Agent and Action Groups work
  - Ensure all tests pass, ask the user if questions arise.
- [ ] 7. Implement AWS service integrations
  - [ ] 7.1 Create Amazon Transcribe integration
    - Implement real-time transcription for Nokia streaming audio
    - Add batch transcription for Streamlit uploaded audio files
    - Configure Hindi language settings and rural agricultural vocabulary
    - Handle transcription errors and retries with user-friendly feedback
    - _Requirements: 2.1, 2.2_

  - [ ]* 7.2 Write unit tests for Transcribe integration
    - Test transcription with sample Hindi audio from both channels
    - Test error handling for transcription failures
    - Test custom vocabulary usage for agricultural terms
    - _Requirements: 2.1, 2.3_

  - [ ] 7.3 Create Amazon Polly integration with persona consistency
    - Implement text-to-speech with Kajal/Aditi voices for Gram-Didi persona
    - Configure Neural engine for natural speech across both channels
    - Handle voice fallback and error recovery
    - Optimize audio format for Nokia phones vs smartphone speakers
    - _Requirements: 6.1, 6.2_

  - [ ]* 7.4 Write property test for Bedrock Agent pipeline execution
    - **Property 2: Bedrock Agent Pipeline Execution**
    - **Validates: Requirements 2.1, 2.2, 6.1, 6.2, 7.1, 7.2, 7.3**

- [ ] 8. Implement channel-specific response delivery
  - [ ] 8.1 Create Nokia PSTN channel response handler
    - Stream audio responses back to Amazon Connect calls
    - Handle real-time audio delivery requirements for Nokia phones
    - Implement call session management and recovery
    - _Requirements: 7.1_

  - [ ] 8.2 Create Streamlit channel response handler
    - Store generated audio files in S3 response bucket
    - Generate presigned URLs for secure audio access
    - Implement response metadata for Streamlit app consumption
    - _Requirements: 7.2_

  - [ ]* 8.3 Write property test for response delivery
    - **Property 7: Channel-Specific Response Delivery**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

  - [ ] 8.4 Implement response latency optimization
    - Add response time monitoring and logging for both channels
    - Optimize processing pipeline for real-time Nokia call requirements
    - Implement caching for common scheme and market responses
    - _Requirements: 7.4_

  - [ ]* 8.5 Write unit tests for response delivery
    - Test Nokia PSTN audio streaming functionality
    - Test Streamlit S3 storage and presigned URL generation
    - Test latency measurement and optimization
    - _Requirements: 7.1, 7.2, 7.4_

- [ ] 9. Implement comprehensive error handling for all three pillars
  - [ ] 9.1 Create error handling framework for integrated system
    - Implement error classification for Bedrock Agent, Action Groups, Knowledge Base, and ONDC failures
    - Add Hindi error messages for user-friendly feedback across all interaction types
    - Create retry mechanisms with exponential backoff for all service integrations
    - Handle graceful degradation scenarios for each pillar
    - _Requirements: 2.3, 2.4, 4.5, 6.5, 11.2, 11.3, 11.4_

  - [ ]* 9.2 Write property test for comprehensive error handling
    - **Property 8: Comprehensive Error Handling**
    - **Validates: Requirements 2.3, 2.4, 4.5, 6.5, 10.4, 11.1, 11.2, 11.3, 11.4, 11.5**

  - [ ] 9.3 Implement network resilience features for rural connectivity
    - Add session recovery for Nokia call disconnections
    - Implement upload retry for Streamlit channel failures
    - Handle AWS service and ONDC gateway unavailability gracefully
    - _Requirements: 11.1, 11.5_

  - [ ]* 9.4 Write unit tests for network resilience
    - Test Nokia call disconnection recovery
    - Test Streamlit upload failure retry mechanisms
    - Test service unavailability handling for all pillars
    - _Requirements: 11.1, 11.5_

- [ ] 10. Checkpoint - Ensure error handling works across all pillars
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement security and privacy features for integrated system
  - [ ] 11.1 Create IAM role and permission management for all services
    - Define minimal required permissions for Lambda execution with Bedrock Agent
    - Create service-specific IAM roles for AWS integrations and ONDC access
    - Implement permission validation and auditing across all three pillars
    - _Requirements: 9.2_

  - [ ] 11.2 Implement data encryption and privacy protection
    - Configure DynamoDB encryption at rest for user profiles and scheme applications
    - Ensure encrypted transmission for all AWS service calls and ONDC communications
    - Implement PII protection for phone numbers and personal scheme data
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ] 11.3 Create S3 lifecycle policies for comprehensive data cleanup
    - Implement 24-hour deletion policy for user audio files from both channels
    - Configure automatic cleanup for response audio files and generated forms
    - Add monitoring for policy compliance across all storage buckets
    - _Requirements: 9.1_

  - [ ]* 11.4 Write property test for security compliance
    - **Property 9: Security and Privacy Compliance**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 12. Create Streamlit Progressive Web App interface
  - [ ] 12.1 Set up Streamlit PWA project structure
    - Create Streamlit application with PWA configuration for rural users
    - Set up service worker for offline functionality
    - Configure audio recording and compression optimized for low-bandwidth
    - _Requirements: 8.1_

  - [ ] 12.2 Implement audio recording and upload functionality
    - Add Streamlit audio recording with optimized compression
    - Implement Opus/MP3 compression before upload to minimize data usage
    - Create S3 signed URL upload mechanism with progress feedback
    - Handle upload progress and error feedback for rural connectivity
    - _Requirements: 8.2, 8.3_

  - [ ]* 12.3 Write property test for Streamlit app audio processing
    - **Property 1: Multi-Channel Audio Processing**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ] 12.4 Implement audio response playback
    - Create audio player component for response playback
    - Handle presigned URL audio loading and buffering
    - Optimize for low-bandwidth rural connections with progressive loading
    - _Requirements: 7.2_

  - [ ]* 12.5 Write unit tests for Streamlit PWA functionality
    - Test audio recording and compression
    - Test S3 upload with signed URLs
    - Test audio playback functionality
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 13. Implement integrated multi-channel processing
  - [ ] 13.1 Create unified processing pipeline for three-pillar architecture
    - Integrate all components into single processing flow with Bedrock Agent coordination
    - Ensure consistent backend logic for both Nokia and Streamlit channels
    - Add comprehensive logging and monitoring for scheme and market interactions
    - _Requirements: 10.5_

  - [ ]* 13.2 Write property test for multi-channel processing
    - **Property 1: Multi-Channel Audio Processing**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ] 13.3 Add monitoring and metrics collection for three pillars
    - Implement CloudWatch metrics for system performance across all pillars
    - Add X-Ray tracing for end-to-end request tracking through Action Groups
    - Create custom dashboards for rural-specific KPIs and interaction analytics
    - _Requirements: 11.4_

  - [ ]* 13.4 Write integration tests for complete three-pillar system
    - Test end-to-end Nokia call processing with scheme and market queries
    - Test end-to-end Streamlit app interaction with both Action Groups
    - Test cross-channel user experience consistency and context preservation
    - _Requirements: 1.1, 1.2, 7.1, 7.2_

- [ ] 14. Deploy and configure AWS infrastructure for three-pillar system
  - [ ] 14.1 Create AWS CDK deployment scripts for integrated architecture
    - Define all AWS resources using CDK including Bedrock Agent and Action Groups
    - Configure Amazon Connect phone number and flows for Nokia integration
    - Set up API Gateway and Lambda function deployments for all pillars
    - Create DynamoDB tables, S3 buckets, Knowledge Base, and ONDC configurations
    - _Requirements: 10.1, 10.2_

  - [ ] 14.2 Configure production environment settings for rural deployment
    - Set up environment-specific configurations for all three pillars
    - Configure monitoring and alerting rules for scheme and market services
    - Implement deployment pipeline for updates across integrated system
    - _Requirements: 9.2, 11.4_

  - [ ]* 14.3 Write deployment validation tests
    - Test AWS resource creation and configuration for all pillars
    - Validate IAM permissions and security settings across integrated system
    - Test end-to-end system functionality in deployed environment
    - _Requirements: 9.2, 10.1, 10.2_

- [ ] 15. Final checkpoint - Complete three-pillar system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify system meets all requirements and performance targets for rural users
  - Confirm Nokia and Streamlit accessibility with scheme and market intelligence
  - Validate ONDC integration and Knowledge Base accuracy

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties from the design across all three pillars
- Unit tests validate specific examples, edge cases, and integration points for each pillar
- The implementation follows the "Write Once, Serve Everyone" principle with unified backend processing
- All AWS service integrations include proper error handling and retry mechanisms
- Security and privacy requirements are integrated throughout the implementation for all three pillars
- The system is optimized for rural India's connectivity and device constraints (Nokia + Streamlit)
- Bedrock Agent coordinates between ActionGroup_Schemes (RAG) and ActionGroup_ONDC (real-time APIs)
- Knowledge Base provides government scheme intelligence while ONDC provides market intelligence
- User context is preserved across both scheme and market interactions for personalized experience