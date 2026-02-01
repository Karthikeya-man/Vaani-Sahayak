# Requirements Document

## Introduction

Vaani-Sahayak is a Hybrid Omni-Channel Voice Assistant designed specifically for rural India, built on three core architecture pillars. The system serves farmers and villagers through both Nokia feature phones (via GSM/PSTN telephony using Amazon Connect) and smartphones (via Streamlit/Lite App), providing intelligent agricultural assistance through advanced RAG-based scheme intelligence and real-time ONDC market intelligence. The core philosophy is "Write Once, Serve Everyone" with a unified backend that seamlessly handles multiple input channels while delivering contextually aware responses.

## Core Architecture Pillars

### Pillar 1: Hybrid Interface
- **GSM/PSTN Telephony**: Amazon Connect integration for Nokia feature phones
- **Streamlit/Lite App**: Lightweight smartphone application for enhanced user experience
- **Universal Voice Entry**: Seamless speech-to-text processing regardless of device type

### Pillar 2: Scheme Intelligence (RAG)
- **Bedrock Knowledge Bases**: Advanced retrieval-augmented generation for government scheme information
- **S3 Document Repository**: Comprehensive storage of government PDF documents and eligibility criteria
- **Auto-enrollment Capability**: Intelligent slot-filling for scheme applications and form generation

### Pillar 3: ONDC Market Intelligence (Real-time APIs)
- **ONDC Buyer App (BAP)**: Integration as a certified ONDC Buyer Application Platform
- **Real-time Price Discovery**: Live Mandi prices and market intelligence through ONDC search protocols
- **Farmer-Buyer Matching**: Direct connection between farmers and wholesalers via ONDC select APIs

## Glossary

- **Vaani_Sahayak**: The complete voice assistant system with three-pillar architecture
- **PSTN_Channel**: Public Switched Telephone Network input channel for Nokia feature phone users
- **Streamlit_App**: Progressive Web App input channel for smartphone users
- **Orchestrator**: Central AWS Lambda function coordinating all system components and action groups
- **Gram_Didi**: The empathetic rural village sister persona used by the AI assistant
- **Bedrock_Agent**: Amazon Bedrock Agent managing specialized action groups for schemes and ONDC
- **ActionGroup_Schemes**: Bedrock action group handling government scheme queries via Knowledge Bases
- **ActionGroup_ONDC**: Bedrock action group managing ONDC market intelligence via API connectors
- **Knowledge_Base**: Amazon Bedrock Knowledge Base with S3 + OpenSearch Serverless for scheme documents
- **ONDC_Gateway**: Network gateway interface for ONDC search/select protocol APIs
- **User_Profile**: Stored user information including name, crop type, location, and language preference
- **Conversation_History**: Record of previous interactions for context-aware responses
- **Audio_Chunk**: Streaming audio data from phone calls via Amazon Connect
- **Audio_File**: Compressed audio upload from Streamlit app users

## Requirements

### Requirement 1: Universal Voice Entry

**User Story:** As a rural user, I want to interact with the voice assistant through either my Nokia feature phone or smartphone with seamless speech-to-text processing, so that I can access assistance regardless of my device type.

#### Acceptance Criteria

1. WHEN a user dials the toll-free number from a Nokia phone, THE Vaani_Sahayak SHALL accept the call through Amazon Connect and stream audio to the backend
2. WHEN a user records audio in the Streamlit app, THE Vaani_Sahayak SHALL accept compressed audio uploads and process them through the same backend
3. WHEN audio is received from either channel, THE Orchestrator SHALL detect the input source and route it appropriately to the Bedrock Agent
4. WHEN processing audio from PSTN_Channel, THE Vaani_Sahayak SHALL handle real-time streaming audio chunks with minimal latency
5. WHEN processing audio from Streamlit_App, THE Vaani_Sahayak SHALL handle uploaded audio files from S3 with optimized compression

### Requirement 2: Speech Recognition and Processing

**User Story:** As a rural user speaking in Hindi, I want my voice to be accurately transcribed, so that the system can understand my queries.

#### Acceptance Criteria

1. WHEN audio input is received, THE Vaani_Sahayak SHALL transcribe it using Amazon Transcribe with Hindi language code (hi-IN)
2. WHEN transcription is complete, THE Vaani_Sahayak SHALL pass the text to the intelligence layer for processing
3. WHEN transcription fails or produces empty results, THE Vaani_Sahayak SHALL handle the error gracefully and request the user to repeat
4. WHEN audio quality is poor, THE Vaani_Sahayak SHALL attempt transcription and provide feedback if unsuccessful
5. THE Transcription_Service SHALL preserve the original meaning and context of Hindi speech patterns

### Requirement 3: Scheme Intelligence with RAG

**User Story:** As a farmer seeking government assistance, I want accurate information about scheme eligibility and automatic enrollment support, so that I can access benefits without complex paperwork.

#### Acceptance Criteria

1. WHEN a user asks about government schemes, THE ActionGroup_Schemes SHALL query the Bedrock Knowledge Base for relevant scheme information
2. WHEN scheme information is retrieved, THE Vaani_Sahayak SHALL provide accurate eligibility criteria and application procedures from government PDF documents
3. WHEN a user expresses interest in applying, THE ActionGroup_Schemes SHALL initiate intelligent slot-filling to collect required information
4. WHEN sufficient information is collected, THE Vaani_Sahayak SHALL generate pre-filled application forms and store them in S3
5. WHEN scheme documents are updated in S3, THE Knowledge_Base SHALL automatically re-index the content for accurate retrieval

### Requirement 4: ONDC Market Intelligence

**User Story:** As a farmer wanting to sell my crops, I want real-time market prices and direct buyer connections, so that I can get the best prices for my produce.

#### Acceptance Criteria

1. WHEN a user asks about crop prices, THE ActionGroup_ONDC SHALL query ONDC Network Gateways for real-time Mandi prices
2. WHEN market data is retrieved, THE Vaani_Sahayak SHALL provide current prices, trends, and nearby market information
3. WHEN a user wants to sell crops, THE ActionGroup_ONDC SHALL search for potential buyers using ONDC search protocols
4. WHEN buyers are found, THE Vaani_Sahayak SHALL facilitate connections using ONDC select APIs for direct farmer-buyer matching
5. WHEN ONDC services are unavailable, THE Vaani_Sahayak SHALL provide cached market data and alternative suggestions

### Requirement 5: Intent Classification and Routing

**User Story:** As a user with different types of queries, I want the system to understand my intent and route me to the appropriate service, so that I get relevant and accurate responses.

#### Acceptance Criteria

1. WHEN transcribed text is received, THE Bedrock_Agent SHALL classify the intent as either 'Market/Price' or 'Scheme/Form' related
2. WHEN intent is classified as 'Market/Price', THE Bedrock_Agent SHALL trigger ActionGroup_ONDC for market intelligence processing
3. WHEN intent is classified as 'Scheme/Form', THE Bedrock_Agent SHALL trigger ActionGroup_Schemes for knowledge base retrieval
4. WHEN intent is ambiguous, THE Vaani_Sahayak SHALL ask clarifying questions to determine the appropriate action group
5. WHEN processing is complete, THE Vaani_Sahayak SHALL generate contextually appropriate responses using the Gram_Didi persona

### Requirement 6: User Context Management

**User Story:** As a returning user, I want the system to remember my information and previous conversations across both scheme and market queries, so that I don't have to repeat basic details every time.

#### Acceptance Criteria

1. WHEN a user calls or uses the app, THE Vaani_Sahayak SHALL identify them by phone number and load their complete profile
2. WHEN a new user interacts with the system, THE Vaani_Sahayak SHALL create a User_Profile with phone number, location, and crop preferences
3. WHEN user information is provided during scheme enrollment, THE Vaani_Sahayak SHALL store personal details for future auto-filling
4. WHEN generating responses from either action group, THE Vaani_Sahayak SHALL retrieve and use stored User_Profile and Conversation_History
5. WHEN a conversation ends, THE Vaani_Sahayak SHALL update the Conversation_History with interaction type (scheme/market) for future context

### Requirement 7: Channel-Specific Response Delivery

**User Story:** As a user on either Nokia phone or smartphone, I want to receive audio responses optimized for my device, so that I have a seamless experience regardless of my technology access.

#### Acceptance Criteria

1. WHEN responding to PSTN_Channel users, THE Vaani_Sahayak SHALL stream audio directly back into the active Amazon Connect call
2. WHEN responding to Streamlit_App users, THE Vaani_Sahayak SHALL store the audio file in S3 and provide a presigned URL for playback
3. WHEN delivering responses, THE Vaani_Sahayak SHALL ensure audio quality is optimized for Nokia phones and smartphone speakers
4. WHEN a response is ready, THE Vaani_Sahayak SHALL deliver it within acceptable latency limits for real-time conversation flow
5. WHEN response delivery fails, THE Vaani_Sahayak SHALL retry delivery through alternative methods or provide appropriate error handling

### Requirement 8: Streamlit Application Interface

**User Story:** As a smartphone user with limited data, I want a lightweight Streamlit app that works efficiently on slow connections, so that I can use the voice assistant without consuming excessive data.

#### Acceptance Criteria

1. THE Streamlit_App SHALL function as a Progressive Web App (PWA) with offline capability for basic functions
2. WHEN recording audio, THE Streamlit_App SHALL compress audio to Opus or MP3 format before upload to minimize data usage
3. WHEN uploading audio, THE Streamlit_App SHALL use S3 signed URLs for secure and direct upload without server intermediation
4. WHEN receiving responses, THE Streamlit_App SHALL play back audio files efficiently with minimal buffering and data consumption
5. THE Streamlit_App SHALL work reliably on low-bandwidth connections typical in rural areas with progressive loading

### Requirement 9: Data Privacy and Security

**User Story:** As a user concerned about privacy, I want my personal conversations, scheme applications, and market queries to be handled securely and not stored longer than necessary.

#### Acceptance Criteria

1. WHEN audio files are uploaded to S3, THE Vaani_Sahayak SHALL implement lifecycle policies to delete them after 24 hours
2. WHEN accessing AWS services and ONDC APIs, THE Vaani_Sahayak SHALL use appropriate IAM roles with minimal required permissions
3. WHEN storing user data and scheme information in DynamoDB, THE Vaani_Sahayak SHALL encrypt sensitive information at rest
4. WHEN transmitting data between services and ONDC gateways, THE Vaani_Sahayak SHALL use encrypted connections (HTTPS/TLS)
5. WHEN handling phone numbers and personal details, THE Vaani_Sahayak SHALL treat them as PII with appropriate protection and compliance

### Requirement 10: System Integration and Orchestration

**User Story:** As a system administrator, I want all components including Bedrock Agent, Knowledge Bases, and ONDC connectors to work together seamlessly, so that users have a consistent experience regardless of their query type.

#### Acceptance Criteria

1. WHEN an S3 upload event occurs, THE API_Gateway SHALL trigger the Orchestrator Lambda function with proper event routing
2. WHEN Kinesis receives audio streams from Amazon Connect, THE Vaani_Sahayak SHALL route them to the Orchestrator for processing
3. WHEN the Orchestrator receives input, THE Bedrock_Agent SHALL coordinate ActionGroup_Schemes and ActionGroup_ONDC based on intent classification
4. WHEN any service fails, THE Orchestrator SHALL implement appropriate error handling and recovery mechanisms with fallback options
5. THE Orchestrator SHALL maintain consistent processing logic and persona regardless of input channel or action group selection

### Requirement 11: Error Handling and Resilience

**User Story:** As a user in an area with unreliable connectivity, I want the system to handle interruptions gracefully and provide clear feedback when issues occur with either scheme or market services.

#### Acceptance Criteria

1. WHEN network connectivity is lost during a call, THE Vaani_Sahayak SHALL attempt to maintain the session and resume when possible
2. WHEN any AWS service or ONDC gateway is temporarily unavailable, THE Vaani_Sahayak SHALL provide appropriate error messages and fallback options
3. WHEN audio processing fails, THE Vaani_Sahayak SHALL request the user to repeat their input with helpful guidance
4. WHEN the system encounters unexpected errors in either action group, THE Vaani_Sahayak SHALL log error details while providing user-friendly feedback
5. THE Vaani_Sahayak SHALL implement retry mechanisms for transient failures in AWS services and ONDC API calls with exponential backoff